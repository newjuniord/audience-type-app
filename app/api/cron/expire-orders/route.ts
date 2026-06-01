import { NextResponse } from "next/server";

// Cette route est destinée à être appelée par un CRON job (ex: Vercel Cron ou externe)
// Elle nettoie les commandes 'pending' après vérification.
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get("authorization");
    const cronKey = searchParams.get("key");
    const validSecret = process.env.CRON_SECRET;

    // Vérification de sécurité
    if (
        authHeader !== `Bearer ${validSecret}` &&
        cronKey !== validSecret
    ) {
        console.warn("⛔ [CRON] Tentative d'accès non autorisée.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("⏰ [CRON] Démarrage du nettoyage des commandes expirées...");

    try {
        const { supabaseAdmin } = await import("@/lib/supabase/admin");

        // Date actuelle moins 72 heures
        const expirationThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000);

        // Requête : status == 'pending' ET createdAt < threshold
        const { data: pendingOrders, error: fetchError } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("status", "pending")
            .lt("createdAt", expirationThreshold.toISOString());

        if (fetchError || !pendingOrders || pendingOrders.length === 0) {
            console.log("✅ [CRON] Aucune commande en attente à vérifier.");
            return NextResponse.json({ message: "No pending orders found", count: 0 });
        }

        console.log(`⚠️ [CRON] ${pendingOrders.length} commandes 'pending' à vérifier.`);

        let processedCount = 0;
        let successCount = 0;
        let failedCount = 0;

        for (const orderData of pendingOrders) {
            const orderId = orderData.id;
            const transactionId = orderData.transactionId;

            try {
                let isActuallyPaid = false;
                let finalProviderStatus = "pending";
                let paymentDetails: any = null;
                const paymentMethod = orderData.paymentMethod?.toLowerCase();

                // --- LOGIQUE BAZIK (MONCASH) ---
                if (paymentMethod === 'moncash' || paymentMethod === 'bazik') {
                    const BAZIK_USER_ID = process.env.BAZIK_USER_ID?.trim();
                    const BAZIK_SECRET_KEY = process.env.BAZIK_SECRET_KEY?.trim();

                    if (BAZIK_USER_ID && BAZIK_SECRET_KEY) {
                        try {
                            // 1. Get Token
                            const tokenRes = await fetch("https://api.bazik.io/token", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userID: BAZIK_USER_ID, secretKey: BAZIK_SECRET_KEY }),
                            });
                            const tokenData = await tokenRes.json();
                            
                            if (tokenRes.ok && tokenData.token) {
                                // 2. Check Status
                                const verificationId = transactionId || orderId;
                                const statusRes = await fetch(`https://api.bazik.io/order/${verificationId}`, {
                                    headers: { "Authorization": `Bearer ${tokenData.token}` },
                                });
                                const statusData = await statusRes.json();
                                finalProviderStatus = (statusData.status || "").toLowerCase();
                                
                                const successStatuses = ["completed", "success", "paid", "success_payment", "successful", "succeeded"];
                                if (successStatuses.includes(finalProviderStatus)) {
                                    isActuallyPaid = true;
                                    paymentDetails = {
                                        payment_id: statusData.transactionId || `manual_cron_${verificationId}`,
                                        payment_method: "moncash",
                                        currency: "usd", // Bazik est généralement en USD/HTG mais on normalise
                                        amount: orderData.amount
                                    };
                                }
                            }
                        } catch (e) {
                            console.warn(`[CRON] Impossible de vérifier Bazik pour ${orderId}`);
                        }
                    }
                }

                // 2. Application de la logique de mise à jour
                if (isActuallyPaid && paymentDetails) {
                    // SUCCÈS : On valide la commande
                    await supabaseAdmin.from("orders").update({
                        status: "completed",
                        paymentMethod: paymentDetails.payment_method || "card",
                        currency: paymentDetails.currency || "usd",
                        paidAt: new Date().toISOString(),
                        amount: paymentDetails.amount ? paymentDetails.amount / 100 : orderData.amount,
                        transactionId: paymentDetails.payment_id || transactionId,
                        updatedAt: new Date().toISOString()
                    }).eq("id", orderId);

                    // Accès au produit
                    const { userId, productId, productType } = orderData;
                    const productCollection = productType === "course" ? "courses" : "ebooks";
                    
                    const { data: pData } = await supabaseAdmin.from(productCollection).select('*').eq("id", productId).maybeSingle();
                    const { data: uData } = await supabaseAdmin.from("users").select('*').eq("id", userId).maybeSingle();

                    await supabaseAdmin.from("enrollments").insert({
                        id: crypto.randomUUID(),
                        userId: userId,
                        productId: productId,
                        productType,
                        orderId,
                        status: "active",
                        accessGranted: true,
                        enrolledAt: new Date().toISOString(),
                        lastAccessedAt: new Date().toISOString(),
                        progress: 0,
                        completedLessons: [],
                        productTitle: pData?.title || orderData?.productTitle || "",
                        productThumbnailUrl: pData?.thumbnail || pData?.coverImage || orderData?.productThumbnailUrl || "",
                        userEmail: uData?.email || orderData?.userEmail || "",
                        userName: uData?.name || orderData?.userName || ""
                    });

                    successCount++;
                } else if (
                    finalProviderStatus === "failed" || 
                    finalProviderStatus === "cancelled" || 
                    finalProviderStatus === "rejected" ||
                    finalProviderStatus === "expired" ||
                    (!isActuallyPaid && new Date(orderData.createdAt) < expirationThreshold)
                ) {
                    // ÉCHEC : Commande expirée ou confirmée en échec par le prestataire
                    await supabaseAdmin.from("orders").update({
                        status: "failed",
                        failedReason: finalProviderStatus === "pending" ? "expired_timeout" : finalProviderStatus,
                        updatedAt: new Date().toISOString()
                    }).eq("id", orderId);
                    failedCount++;
                }

                processedCount++;

            } catch (err) {
                console.error(`[CRON] Erreur lors du traitement de l'ordre ${orderId}:`, err);
            }
        }

        console.log(`✅ [CRON] Fin du traitement. Réussis: ${successCount}, Échoués: ${failedCount}, Total traités: ${processedCount}`);

        return NextResponse.json({
            message: "Cron completed successfully",
            summary: {
                total_scanned: pendingOrders.length,
                processed: processedCount,
                validated: successCount,
                expired_or_failed: failedCount
            }
        });

    } catch (error: any) {
        console.error("🔥 [CRON ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

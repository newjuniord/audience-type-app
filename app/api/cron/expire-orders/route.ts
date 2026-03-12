import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import dodo from "@/lib/dodo";

// Cette route est destinée à être appelée par un CRON job (ex: Vercel Cron ou externe)
// Elle vérifie les paiements Dodo avant de nettoyer les commandes 'pending'.
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
        const adminDb = getAdminDb();
        const ordersRef = adminDb.collection("orders");

        // Date actuelle moins 72 heures
        const expirationThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000);

        // Requête : status == 'pending' ET createdAt < threshold
        // Note: Firestore nécessite un index composite pour cette requête.
        // Si l'index manque, le serveur renverra une erreur avec un lien pour le créer.
        const snapshot = await ordersRef
            .where("status", "==", "pending")
            .where("paymentMethod", "==", "card") // On cible spécifiquement les paiements carte initiaux
            .where("createdAt", "<", expirationThreshold)
            .get();

        if (snapshot.empty) {
            console.log("✅ [CRON] Aucune commande en attente à vérifier.");
            return NextResponse.json({ message: "No pending orders found", count: 0 });
        }

        console.log(`⚠️ [CRON] ${snapshot.size} commandes 'pending' à vérifier.`);

        let processedCount = 0;
        let successCount = 0;
        let failedCount = 0;

        for (const orderDoc of snapshot.docs) {
            const orderData = orderDoc.data();
            const orderId = orderDoc.id;
            const transactionId = orderData.transactionId;

            try {
                let isActuallyPaid = false;
                let finalDodoStatus = "pending";
                let paymentDetails: any = null;

                if (transactionId) {
                    // 1. Tenter de récupérer la session de checkout
                    try {
                        const session = await (dodo as any).checkoutSessions.retrieve(transactionId);
                        finalDodoStatus = session.status?.toLowerCase();
                        
                        // Si la session est complétée, on cherche le payment_id
                        if (session.payments && session.payments.length > 0) {
                            paymentDetails = session.payments.find((p: any) => 
                                p.status?.toLowerCase() === "succeeded" || 
                                p.status?.toLowerCase() === "completed"
                            ) || session.payments[0];
                            
                            if (paymentDetails.status?.toLowerCase() === "succeeded" || paymentDetails.status?.toLowerCase() === "completed") {
                                isActuallyPaid = true;
                            }
                        }
                    } catch (e) {
                        console.warn(`[CRON] Impossible de vérifier la session ${transactionId} pour l'ordre ${orderId}`);
                    }
                }

                // 2. Application de la logique de mise à jour (Transaction)
                await adminDb.runTransaction(async (t) => {
                    const freshOrderSnap = await t.get(orderDoc.ref);
                    if (!freshOrderSnap.exists) return;
                    const freshData = freshOrderSnap.data();
                    if (freshData?.status === "completed") return;

                    if (isActuallyPaid && paymentDetails) {
                        // SUCCÈS : On valide la commande comme dans verify-payment
                        t.update(orderDoc.ref, {
                            status: "completed",
                            paymentMethod: paymentDetails.payment_method || "card",
                            currency: paymentDetails.currency || "usd",
                            paidAt: Timestamp.now(),
                            amount: paymentDetails.amount ? paymentDetails.amount / 100 : freshData?.amount,
                            expiresAt: FieldValue.delete(),
                            transactionId: paymentDetails.payment_id || transactionId,
                            updatedAt: new Date()
                        });

                        // Accès au produit
                        const { userId, productId, productType } = freshData as any;
                        const productCollection = productType === "course" ? "courses" : "ebooks";
                        
                        const newEnrollmentRef = adminDb.collection("enrollments").doc();
                        const userRef = adminDb.collection("users").doc(userId);
                        const productRef = adminDb.collection(productCollection).doc(productId.id || productId);

                        const [pSnap, uSnap] = await Promise.all([productRef.get(), userRef.get()]);
                        const pData = pSnap.exists ? pSnap.data() : {};
                        const uData = uSnap.exists ? uSnap.data() : {};

                        t.set(newEnrollmentRef, {
                            userId: userRef,
                            productId: productRef,
                            productType,
                            orderId,
                            status: "active",
                            accessGranted: true,
                            enrolledAt: Timestamp.now(),
                            lastAccessedAt: Timestamp.now(),
                            progress: 0,
                            completedLessons: [],
                            productTitle: pData?.title || freshData?.productTitle || "",
                            productThumbnailUrl: pData?.thumbnail || pData?.coverImage || freshData?.productThumbnailUrl || "",
                            userEmail: uData?.email || freshData?.userEmail || "",
                            userName: uData?.name || freshData?.userName || ""
                        });

                        successCount++;
                    } else if (
                        finalDodoStatus === "failed" || 
                        finalDodoStatus === "cancelled" || 
                        finalDodoStatus === "expired" ||
                        (!isActuallyPaid && orderData.createdAt.toDate() < expirationThreshold)
                    ) {
                        // ÉCHEC : Commande expirée ou confirmée en échec par Dodo
                        t.update(orderDoc.ref, {
                            status: "failed",
                            failedReason: finalDodoStatus === "pending" ? "expired_timeout" : `dodo_${finalDodoStatus}`,
                            updatedAt: new Date()
                        });
                        failedCount++;
                    }
                });

                processedCount++;

            } catch (err) {
                console.error(`[CRON] Erreur lors du traitement de l'ordre ${orderId}:`, err);
            }
        }

        console.log(`✅ [CRON] Fin du traitement. Réussis: ${successCount}, Échoués: ${failedCount}, Total traités: ${processedCount}`);

        return NextResponse.json({
            message: "Cron completed successfully",
            summary: {
                total_scanned: snapshot.size,
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

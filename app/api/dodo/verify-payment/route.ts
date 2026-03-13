import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import dodo from "@/lib/dodo";

/**
 * Route API : /api/dodo/verify-payment
 * Utilise le SDK officiel Dodo Payments pour plus de fiabilité.
 */
export async function POST(req: Request) {
    try {
        const { paymentId, orderId: clientOrderId } = await req.json();

        if (!paymentId) {
            return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
        }

        console.log(`🔍 [VERIFY] Vérification du paiement Dodo via SDK : ${paymentId}`);

        try {
            // Utilisation du SDK officiel (évite les erreurs de fetch/headers/URL)
            // On utilise 'retrieve' pour obtenir les détails du paiement
            const paymentData = await (dodo as any).payments.retrieve(paymentId);
            
            const dodoStatus = paymentData.status?.toLowerCase();
            console.log(`✅ [VERIFY] Statut reçu de Dodo : ${dodoStatus}`);
            console.log("📦 [VERIFY DEBUG] Dodo Payload:", JSON.stringify(paymentData, null, 2));

            // Identification de la commande
            const orderId = paymentData.metadata?.orderId || clientOrderId;
            if (!orderId) {
                return NextResponse.json({ status: dodoStatus, warning: "Aucun Order ID trouvé" });
            }

            const adminDb = getAdminDb();
            const orderRef = adminDb.collection("orders").doc(orderId);

            await adminDb.runTransaction(async (t) => {
                const orderSnap = await t.get(orderRef);
                if (!orderSnap.exists) return;

                const orderData = orderSnap.data();
                if (orderData?.status === "completed") return;

                // 1. Gestion du SUCCÈS
                if (dodoStatus === "succeeded" || dodoStatus === "completed" || dodoStatus === "active") {
                    const currency = (paymentData.currency || "usd").toLowerCase();
                    const totalAmount = paymentData.total_amount || paymentData.amount;
                    const finalAmount = currency === "usd" ? (totalAmount / 100) : totalAmount;

                    t.update(orderRef, {
                        status: "completed",
                        paymentMethod: paymentData.payment_method || "card",
                        currency: currency,
                        paidAt: Timestamp.now(),
                        amount: finalAmount,
                        expiresAt: FieldValue.delete(),
                        transactionId: paymentId
                    });

                    // Accès au produit
                    const { userId, productId, productType } = orderData as any;
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
                        productTitle: pData?.title || orderData?.productTitle || "",
                        productThumbnailUrl: pData?.thumbnail || pData?.coverImage || orderData?.productThumbnailUrl || "",
                        userEmail: uData?.email || orderData?.userEmail || "",
                        userName: uData?.name || orderData?.userName || ""
                    });
                } 
                // 2. Gestion de l'ÉCHEC
                else if (dodoStatus === "failed" || dodoStatus === "cancelled" || dodoStatus === "rejected") {
                    t.update(orderRef, {
                        status: "failed",
                        failedAt: Timestamp.now(),
                        failedReason: dodoStatus,
                        transactionId: paymentId
                    });
                }
            });

            const updatedOrderSnap = await orderRef.get();
            return NextResponse.json({ 
                status: dodoStatus,
                order: { id: orderId, ...updatedOrderSnap.data() }
            });

        } catch (sdkError: any) {
            console.error("❌ [SDK ERROR] Erreur lors de l'appel Dodo SDK :", sdkError);
            
            // Si c'est une erreur de connexion (DNS/Network)
            if (sdkError.message?.includes('ENOTFOUND')) {
                return NextResponse.json({ 
                    error: "Problème DNS : Impossible de joindre api.dodopayments.com. Vérifiez votre connexion.",
                    status: "error_network" 
                }, { status: 503 });
            }

            return NextResponse.json({ error: `Dodo SDK Error: ${sdkError.message}` }, { status: 500 });
        }

    } catch (error: any) {
        console.error("🔥 [VERIFY CRITICAL ERROR] :", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

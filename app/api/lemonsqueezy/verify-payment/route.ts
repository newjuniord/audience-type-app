import { NextResponse } from "next/server";

/**
 * API Route: /api/lemonsqueezy/verify-payment
 * Vérifie l'état d'une commande avec fallback direct sur l'API Lemon Squeezy.
 */
export async function POST(req: Request) {
    try {
        const { orderId, lsOrderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: "orderId manquant" }, { status: 400 });
        }

        const { getAdminDb } = await import("@/lib/firebase-admin");
        const adminDb = getAdminDb();

        const orderRef = adminDb.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
        }

        let orderData = orderSnap.data();

        // FALLBACK: Si le webhook n est pas encore passé mais qu on a un lsOrderId (depuis l URL)
        if (orderData?.status !== "paid" && lsOrderId && lsOrderId !== "[order_id]") {
            console.log(`🔍 [VERIFY] Tentative de vérification directe pour lsOrderId: ${lsOrderId}`);

            const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
            const response = await fetch(`https://api.lemonsqueezy.com/v1/orders/${lsOrderId}`, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Accept": "application/vnd.api+json",
                    "Content-Type": "application/vnd.api+json"
                }
            });

            if (response.ok) {
                const lsOrder = await response.json();
                const attributes = lsOrder.data.attributes;
                const lsStatus = attributes.status?.toLowerCase();

                if (lsStatus === "paid" || lsStatus === "succeeded") {
                    // On convertit les centimes en dollars
                    const finalAmount = (attributes.total || 0) / 100;

                    // On met à jour Firestore nous-mêmes pour débloquer l'utilisateur
                    const now = new Date();
                    const updateData: any = {
                        status: "paid",
                        amount: finalAmount, // Mise à jour du montant réel
                        transactionId: lsOrderId,
                        updatedAt: now
                    };
                    await orderRef.update(updateData);

                    // CRÉATION DE L'INSCRIPTION (Enrollment) - Fallback du Webhook
                    if (orderData.productType !== "service" && orderData.productType !== "booking") {
                        const enrollmentsRef = adminDb.collection("enrollments");

                        // Vérifier si elle existe déjà (pour ne pas faire de doublons avec le webhook)
                        const existingEnrollment = await enrollmentsRef
                            .where("userId", "==", orderData.userId)
                            .where("productId", "==", orderData.productId)
                            .limit(1)
                            .get();

                        if (existingEnrollment.empty) {
                            console.log(`📚 [VERIFY] Création immédiate de l'inscription pour ${orderData.userEmail}`);
                            await enrollmentsRef.add({
                                accessGranted: true,
                                completedLessons: [],
                                currentLessonId: "",
                                downloadCount: "0",
                                enrolledAt: now,
                                lastAccessedAt: now,
                                orderId: orderId,
                                productId: orderData.productId,
                                productThumbnailUrl: orderData.productThumbnailUrl,
                                productTitle: orderData.productTitle,
                                productType: orderData.productType,
                                progress: 0,
                                status: "active",
                                totalLessons: 0,
                                userEmail: orderData.userEmail,
                                userId: orderData.userId,
                                userName: orderData.userName || "Étudiant"
                            });
                        }
                    }

                    // On recharge les données pour la réponse
                    orderData = { ...orderData, status: "paid", transactionId: lsOrderId };
                } else if (lsStatus === "refunded") {
                    // Si c'est remboursé, on met à jour le statut
                    await orderRef.update({
                        status: "refunded",
                        updatedAt: new Date()
                    });
                    orderData = { ...orderData, status: "refunded", transactionId: lsOrderId };
                }
            }
        }

        return NextResponse.json({
            status: orderData?.status,
            order: {
                id: orderSnap.id,
                ...orderData
            }
        });

    } catch (error: any) {
        console.error("🔥 [VERIFY LEMON SQUEEZY ERROR]", error);
        return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
    }
}

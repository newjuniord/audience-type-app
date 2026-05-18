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
                    const customerEmail = attributes.user_email || "";
                    const lemonSqueezyCustomerId = attributes.customer_id?.toString() || "";

                    console.log(`🔍 [VERIFY] Direct verify customer email: ${customerEmail}, customer ID: ${lemonSqueezyCustomerId}`);

                    let finalUserEmail = orderData?.userEmail || customerEmail;

                    // Self-healing: promote virtual email to real email & link customer ID
                    if (orderData?.userId) {
                        try {
                            const { getAdminAuth } = await import("@/lib/firebase-admin");
                            const adminAuth = getAdminAuth();
                            const userRef = adminDb.collection("users").doc(orderData.userId);
                            const userSnap = await userRef.get();

                            if (userSnap.exists) {
                                const userData = userSnap.data();
                                const currentEmail = userData?.email || "";
                                const isFakeEmail = !currentEmail || currentEmail.endsWith("@audiencetype.com");

                                const userUpdates: any = {};
                                if (lemonSqueezyCustomerId) {
                                    userUpdates.lemonSqueezyCustomerId = lemonSqueezyCustomerId;
                                }

                                if (isFakeEmail && customerEmail && !customerEmail.endsWith("@audiencetype.com")) {
                                    console.log(`🌟 [VERIFY] Promoting virtual email "${currentEmail}" to real email "${customerEmail}" for user ${orderData.userId}`);
                                    userUpdates.email = customerEmail;
                                    finalUserEmail = customerEmail;

                                    try {
                                        await adminAuth.updateUser(orderData.userId, { email: customerEmail });
                                        console.log(`✅ [VERIFY] Firebase Auth email updated successfully to ${customerEmail}`);
                                    } catch (authErr: any) {
                                        console.warn(`⚠️ [VERIFY] Failed to update email in Firebase Auth:`, authErr.message);
                                    }
                                }

                                if (Object.keys(userUpdates).length > 0) {
                                    await userRef.update(userUpdates);
                                    console.log(`✅ [VERIFY] Firestore user profile updated with:`, userUpdates);
                                }

                                // WhatsApp magic link and secret code dispatch
                                const whatsappNumber = userData?.whatsappNumber || orderData?.whatsappNumber || "";
                                if (whatsappNumber) {
                                    console.log(`🔍 [VERIFY] Checking existing temp links to prevent duplicate WhatsApp dispatch for user: ${orderData.userId}`);
                                    const existingLinks = await adminDb.collection("temp_links")
                                        .where("userId", "==", orderData.userId)
                                        .where("used", "==", false)
                                        .limit(1)
                                        .get();

                                    if (existingLinks.empty) {
                                        const { v4: uuidv4 } = await import("uuid");
                                        const { Timestamp } = await import("firebase-admin/firestore");
                                        const { sendWhatsAppMessage } = await import("@/lib/whatsapp");

                                        const token = uuidv4();
                                        const code = Math.floor(100000 + Math.random() * 900000).toString();

                                        const expiresAt = new Date();
                                        expiresAt.setFullYear(expiresAt.getFullYear() + 100);

                                        console.log(`🌟 [VERIFY] Creating new temp link and code ${code} for user ${orderData.userId}`);
                                        await adminDb.collection("temp_links").doc(token).set({
                                            userId: orderData.userId,
                                            code: code,
                                            expiresAt: Timestamp.fromDate(expiresAt),
                                            used: false,
                                            createdAt: Timestamp.now()
                                        });

                                        const link = `https://audiencetype.com/login/temp?token=${token}`;
                                        const message = `🎉 *ACCÈS DÉBLOQUÉ !* 📚\n\nMerci pour ton achat ! Ton cours *${orderData.productTitle || "Premium"}* est maintenant disponible dans ton espace membre.\n\nVoici ton code secret de connexion : *${code}*\n\nTu peux également cliquer sur ce lien magique pour te connecter instantanément d'un seul clic :\n${link}\n\nNe partage jamais ce code. Bon apprentissage !`;

                                        try {
                                            await sendWhatsAppMessage(whatsappNumber, message);
                                            console.log(`📩 [VERIFY] WhatsApp access link sent successfully to ${whatsappNumber}`);
                                        } catch (waErr: any) {
                                            console.error("❌ [VERIFY] Failed to send WhatsApp message via Twilio:", waErr.message);
                                        }
                                    } else {
                                        console.log(`⚠️ [VERIFY] Active temp link already exists for user ${orderData.userId}. Skipping duplicate WhatsApp dispatch.`);
                                    }
                                }
                            }
                        } catch (userErr: any) {
                            console.error(`❌ [VERIFY] Error updating user profile:`, userErr.message);
                        }
                    }

                    // On met à jour Firestore nous-mêmes pour débloquer l'utilisateur
                    const now = new Date();
                    const updateData: any = {
                        status: "paid",
                        amount: finalAmount, // Mise à jour du montant réel
                        transactionId: lsOrderId,
                        updatedAt: now
                    };
                    if (finalUserEmail && finalUserEmail !== orderData?.userEmail) {
                        updateData.userEmail = finalUserEmail;
                    }
                    await orderRef.update(updateData);

                    // CRÉATION DE L'INSCRIPTION (Enrollment) - Fallback du Webhook
                    if (orderData && orderData.productType !== "service" && orderData.productType !== "booking") {
                        const enrollmentsRef = adminDb.collection("enrollments");

                        // Vérifier si elle existe déjà (pour ne pas faire de doublons avec le webhook)
                        const existingEnrollment = await enrollmentsRef
                            .where("userId", "==", orderData?.userId)
                            .where("productId", "==", orderData?.productId)
                            .limit(1)
                            .get();

                        if (existingEnrollment.empty) {
                            console.log(`📚 [VERIFY] Création immédiate de l'inscription pour ${finalUserEmail}`);
                            await enrollmentsRef.add({
                                accessGranted: true,
                                completedLessons: [],
                                currentLessonId: "",
                                downloadCount: "0",
                                enrolledAt: now,
                                lastAccessedAt: now,
                                orderId: orderId,
                                productId: orderData?.productId,
                                productThumbnailUrl: orderData?.productThumbnailUrl,
                                productTitle: orderData?.productTitle,
                                productType: orderData?.productType,
                                progress: 0,
                                status: "active",
                                totalLessons: 0,
                                userEmail: finalUserEmail,
                                userId: orderData?.userId,
                                userName: orderData?.userName || "Étudiant"
                            });
                        }
                    }

                    // On recharge les données pour la réponse
                    orderData = { ...orderData, status: "paid", transactionId: lsOrderId, userEmail: finalUserEmail };
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

import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-signature") || "";
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

        if (!secret) {
            console.error("❌ [WEBHOOK] Lemon Squeezy webhook secret is missing.");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        // Vérification de la signature
        const hmac = crypto.createHmac("sha256", secret);
        const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
        const signatureBuffer = Buffer.from(signature, "utf8");

        if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
            console.error("❌ [WEBHOOK] Invalid signature.");
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;
        
        console.log(`🔔 [WEBHOOK] Event received: ${eventName}`);

        // On gère uniquement les commandes créées (payées)
        if (eventName !== "order_created") {
            return NextResponse.json({ message: "Event ignored" }, { status: 200 });
        }

        const lsOrderId = payload.data.id;
        const attributes = payload.data.attributes;
        const customData = payload.meta.custom_data || {};
        
        const internalOrderId = customData.orderId;
        
        if (!internalOrderId) {
            console.warn("⚠️ [WEBHOOK] No internal orderId provided in custom_data.");
            return NextResponse.json({ message: "Missing internal orderId" }, { status: 200 });
        }

        const lsStatus = attributes.status?.toLowerCase();
        
        // Initialisation de Firestore
        const { getAdminDb, getAdminAuth } = await import("@/lib/firebase-admin");
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        const orderRef = adminDb.collection("orders").doc(internalOrderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            console.error(`❌ [WEBHOOK] Order ${internalOrderId} not found.`);
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        let orderData = orderSnap.data();

        // Eviter de traiter deux fois la même commande
        if (orderData?.status === "paid") {
            console.log(`✅ [WEBHOOK] Order ${internalOrderId} already marked as paid.`);
            return NextResponse.json({ message: "Already processed" }, { status: 200 });
        }

        if (lsStatus === "paid" || lsStatus === "succeeded") {
            const finalAmount = (attributes.total || 0) / 100;
            const customerEmail = attributes.user_email || "";
            const lemonSqueezyCustomerId = attributes.customer_id?.toString() || "";

            let finalUserEmail = orderData?.userEmail || customerEmail;

            // Self-healing: Update user profile with real email & customer ID
            if (orderData?.userId) {
                try {
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
                            console.log(`🌟 [WEBHOOK] Promoting virtual email "${currentEmail}" to real email "${customerEmail}" for user ${orderData.userId}`);
                            userUpdates.email = customerEmail;
                            finalUserEmail = customerEmail;

                            try {
                                await adminAuth.updateUser(orderData.userId, { email: customerEmail });
                            } catch (authErr: any) {
                                console.warn(`⚠️ [WEBHOOK] Failed to update email in Firebase Auth:`, authErr.message);
                            }
                        }

                        if (Object.keys(userUpdates).length > 0) {
                            await userRef.update(userUpdates);
                        }
                    }
                } catch (userErr: any) {
                    console.error(`❌ [WEBHOOK] Error updating user profile:`, userErr.message);
                }
            }

            const now = new Date();
            const updateData: any = {
                status: "paid",
                amount: finalAmount,
                transactionId: lsOrderId,
                updatedAt: now
            };
            
            if (finalUserEmail && finalUserEmail !== orderData?.userEmail) {
                updateData.userEmail = finalUserEmail;
            }
            
            await orderRef.update(updateData);

            // CRÉATION DE L'INSCRIPTION (Enrollment)
            if (orderData && orderData.productType !== "service" && orderData.productType !== "booking") {
                const enrollmentsRef = adminDb.collection("enrollments");

                // Vérifier si elle existe déjà (au cas où)
                const existingEnrollment = await enrollmentsRef
                    .where("userId", "==", orderData?.userId)
                    .where("productId", "==", orderData?.productId)
                    .limit(1)
                    .get();

                if (existingEnrollment.empty) {
                    console.log(`📚 [WEBHOOK] Création de l'inscription pour ${finalUserEmail}`);
                    await enrollmentsRef.add({
                        accessGranted: true,
                        completedLessons: [],
                        currentLessonId: "",
                        downloadCount: "0",
                        enrolledAt: now,
                        lastAccessedAt: now,
                        orderId: internalOrderId,
                        productId: orderData?.productId,
                        productThumbnailUrl: orderData?.productThumbnailUrl,
                        productTitle: orderData?.productTitle,
                        productType: orderData?.productType,
                        progress: 0,
                        status: "active",
                        totalLessons: 0, // Idéalement, à fetch depuis le produit
                        userEmail: finalUserEmail,
                        userId: orderData?.userId,
                        userName: orderData?.userName || "Étudiant"
                    });
                }
            }
            
            console.log(`✅ [WEBHOOK] Successfully processed order ${internalOrderId}.`);
        } else if (lsStatus === "refunded") {
            await orderRef.update({
                status: "refunded",
                updatedAt: new Date()
            });
            console.log(`ℹ️ [WEBHOOK] Order ${internalOrderId} marked as refunded.`);
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("🔥 [WEBHOOK] Error processing webhook:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as crypto from "crypto";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

/**
 * Cloud Function: lemonsqueezyWebhook
 * Listen for Lemon Squeezy events (e.g., order_created).
 */
export const lemonsqueezywebhook = onRequest({ 
    secrets: ["LEMON_SQUEEZY_WEBHOOK_SECRET"],
    region: "us-central1" 
}, async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const rawBody = req.rawBody.toString();
        const signature = req.headers["x-signature"] as string || "";
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

        if (!secret) {
            console.error("❌ [WEBHOOK] LEMON_SQUEEZY_WEBHOOK_SECRET missing");
            res.status(500).json({ error: "Secret missing" });
            return;
        }

        // Verify Lemon Squeezy signature
        const hmac = crypto.createHmac("sha256", secret);
        const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
        const signatureBuffer = Buffer.from(signature, "utf8");

        if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
            console.error("❌ [WEBHOOK] Invalid signature");
            res.status(401).json({ error: "Invalid signature" });
            return;
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;
        
        console.log(`🔔 [WEBHOOK] Lemon Squeezy event received: ${eventName}`);

        // Handle events
        if (eventName === "order_created") {
            const custom = payload.meta.custom_data;
            const attributes = payload.data.attributes;

            if (custom && custom.orderId) {
                console.log(`✅ [WEBHOOK] Handling SUCCESS for order: ${custom.orderId}`);
                const now = new Date();
                
                // On convertit les centimes en dollars (ou euros)
                const finalAmount = (attributes.total || 0) / 100;

                // 1. Update order status to PAID
                const orderRef = db.collection("orders").doc(custom.orderId);
                const orderSnap = await orderRef.get();

                if (orderSnap.exists) {
                    const orderData = orderSnap.data();
                    
                    if (orderData && orderData.status !== "paid") {
                        await orderRef.update({
                            status: "paid",
                            amount: finalAmount, // Mise à jour avec le vrai montant payé
                            transactionId: payload.data.id,
                            updatedAt: now
                        });

                        // 2. Create enrollment if not a service
                        if (orderData.productType !== "service" && orderData.productType !== "booking") {
                            const enrollmentsRef = db.collection("enrollments");
                            
                            // Check for existing enrollment
                            const existingEnrollment = await enrollmentsRef
                                .where("userId", "==", orderData.userId)
                                .where("productId", "==", orderData.productId)
                                .limit(1)
                                .get();

                            if (existingEnrollment.empty) {
                                console.log(`📚 [WEBHOOK] Creating enrollment for user ${orderData.userEmail}`);
                                
                                await enrollmentsRef.add({
                                    accessGranted: true,
                                    completedLessons: [],
                                    currentLessonId: "",
                                    downloadCount: "0",
                                    enrolledAt: now,
                                    lastAccessedAt: now,
                                    orderId: custom.orderId,
                                    productId: orderData.productId, // String ID as requested
                                    productThumbnailUrl: orderData.productThumbnailUrl,
                                    productTitle: orderData.productTitle,
                                    productType: orderData.productType,
                                    progress: 0,
                                    status: "active",
                                    totalLessons: 0,
                                    userEmail: orderData.userEmail,
                                    userId: orderData.userId, // String ID as requested
                                    userName: orderData.userName || "Étudiant"
                                });
                            }
                        }
                    } else {
                        console.log(`⚠️ [WEBHOOK] Order ${custom.orderId} is already 'paid'`);
                    }
                } else {
                    console.error(`❌ [WEBHOOK] Order not found: ${custom.orderId}`);
                }
            } else {
                 console.error(`❌ [WEBHOOK] Custom data or orderId missing in payload`);
            }
        } 
        else if (eventName === "order_failed") {
            const custom = payload.meta.custom_data;
            if (custom && custom.orderId) {
                console.log(`❌ [WEBHOOK] Handling FAILED for order: ${custom.orderId}`);
                const now = new Date();
                
                await db.collection("orders").doc(custom.orderId).update({
                    status: "failed",
                    failedAt: now,
                    updatedAt: now
                });
            }
        }

        res.status(200).json({ received: true });

    } catch (error: any) {
        console.error("🔥 [WEBHOOK ERROR]", error);
        res.status(500).json({ error: "Internal error" });
    }
});

/**
 * Cloud Function: lemonsqueezyrefund
 * Handles ONLY order_refunded events.
 */
export const lemonsqueezyrefund = onRequest({ 
    secrets: ["LEMON_SQUEEZY_WEBHOOK_SECRET"],
    region: "us-central1" 
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const rawBody = req.rawBody.toString();
        const signature = req.headers["x-signature"] as string || "";
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

        if (!secret) {
            res.status(500).json({ error: "Secret missing" });
            return;
        }

        const hmac = crypto.createHmac("sha256", secret);
        const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
        const checksum = Buffer.from(signature, "utf8");

        if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
            res.status(401).send("Invalid signature");
            return;
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;

        if (eventName === "order_refunded") {
            const custom = payload.meta.custom_data;
            const attributes = payload.data.attributes;

            if (custom && custom.orderId) {
                console.log(`💰 [REFUND] Handling REFUND for order: ${custom.orderId}`);
                const now = new Date();
                const refundedAt = attributes.refunded_at ? new Date(attributes.refunded_at) : now;
                const refundAmount = (attributes.refunded_amount || 0) / 100;
                
                const orderRef = db.collection("orders").doc(custom.orderId);
                await orderRef.update({
                    status: "refunded",
                    refundedAt: refundedAt,
                    refundedAmount: refundAmount,
                    updatedAt: now
                });

                const enrollmentsSnap = await db.collection("enrollments")
                    .where("orderId", "==", custom.orderId)
                    .get();

                for (const docSnap of enrollmentsSnap.docs) {
                    await docSnap.ref.update({
                        accessGranted: false,
                        status: "revoked",
                        lastAccessedAt: now
                    });
                    console.log(`🚫 [REFUND] Access revoked for enrollment: ${docSnap.id}`);
                }
            }
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error("🔥 [REFUND ERROR]", error);
        res.status(500).json({ error: "Internal error" });
    }
});

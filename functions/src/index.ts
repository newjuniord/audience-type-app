import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as crypto from "crypto";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const auth = getAuth();

/**
 * Cloud Function: lemonsqueezyWebhook
 * Listen for Lemon Squeezy events (e.g., order_created).
 */
export const lemonsqueezywebhook = onRequest({ 
    secrets: [
        "LEMON_SQUEEZY_WEBHOOK_SECRET",
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_WHATSAPP_NUMBER"
    ],
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
                        const userId = orderData.userId;
                        const customerEmail = attributes.user_email || "";
                        const lemonSqueezyCustomerId = attributes.customer_id?.toString() || "";

                        console.log(`🔍 [WEBHOOK] Customer Email: ${customerEmail}, Customer ID: ${lemonSqueezyCustomerId}`);

                        // Self-healing: promote virtual email to real email & link customer ID
                        let finalUserEmail = orderData.userEmail || customerEmail;

                        if (userId) {
                            try {
                                const userRef = db.collection("users").doc(userId);
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
                                        console.log(`🌟 [WEBHOOK] Promoting virtual email "${currentEmail}" to real email "${customerEmail}" for user ${userId}`);
                                        userUpdates.email = customerEmail;
                                        finalUserEmail = customerEmail;

                                        try {
                                            await auth.updateUser(userId, { email: customerEmail });
                                            console.log(`✅ [WEBHOOK] Firebase Auth email updated successfully to ${customerEmail}`);
                                        } catch (authErr: any) {
                                            console.warn(`⚠️ [WEBHOOK] Failed to update email in Firebase Auth:`, authErr.message);
                                        }
                                    }

                                    if (Object.keys(userUpdates).length > 0) {
                                        await userRef.update(userUpdates);
                                        console.log(`✅ [WEBHOOK] Firestore user profile updated with:`, userUpdates);
                                    }
                                }
                            } catch (userErr: any) {
                                console.error(`❌ [WEBHOOK] Error updating user profile:`, userErr.message);
                            }
                        }

                        // Update the order doc
                        const orderUpdates: any = {
                            status: "paid",
                            amount: finalAmount, // Mise à jour avec le vrai montant payé
                            transactionId: payload.data.id,
                            updatedAt: now
                        };
                        if (finalUserEmail && finalUserEmail !== orderData.userEmail) {
                            orderUpdates.userEmail = finalUserEmail;
                        }
                        await orderRef.update(orderUpdates);

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
                                console.log(`📚 [WEBHOOK] Creating enrollment for user ${finalUserEmail}`);
                                
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
                                    userEmail: finalUserEmail,
                                    userId: orderData.userId, // String ID as requested
                                    userName: orderData.userName || "Étudiant"
                                });
                            }
                        }

                        // 3. Automated WhatsApp magic link & verification code dispatch
                        if (userId) {
                            try {
                                const userRef = db.collection("users").doc(userId);
                                const userSnap = await userRef.get();
                                const userData = userSnap.exists ? userSnap.data() : null;
                                const whatsappNumber = userData?.whatsappNumber || orderData.whatsappNumber || "";

                                if (whatsappNumber) {
                                    console.log(`🔍 [WEBHOOK] Checking existing temp links to prevent duplicate WhatsApp dispatch for user: ${userId}`);
                                    const existingLinks = await db.collection("temp_links")
                                        .where("userId", "==", userId)
                                        .where("used", "==", false)
                                        .limit(1)
                                        .get();

                                    if (existingLinks.empty) {
                                        const token = crypto.randomUUID();
                                        const code = Math.floor(100000 + Math.random() * 900000).toString();
                                        
                                        const expiresAt = new Date();
                                        expiresAt.setFullYear(expiresAt.getFullYear() + 100);

                                        console.log(`🌟 [WEBHOOK] Creating new temp link and code ${code} for user ${userId}`);
                                        await db.collection("temp_links").doc(token).set({
                                            userId: userId,
                                            code: code,
                                            expiresAt: expiresAt,
                                            used: false,
                                            createdAt: new Date()
                                        });

                                        const link = `https://audiencetype.com/login/temp?token=${token}`;
                                        const message = `🎉 *ACCÈS DÉBLOQUÉ !* 📚\n\nMerci pour ton achat ! Ton cours *${orderData.productTitle || "Premium"}* est maintenant disponible dans ton espace membre.\n\nVoici ton code secret de connexion : *${code}*\n\nTu peux également cliquer sur ce lien magique pour te connecter instantanément d'un seul clic :\n${link}\n\nNe partage jamais ce code. Bon apprentissage !`;

                                        await sendWhatsAppMessageViaFetch(whatsappNumber, message);
                                    } else {
                                        console.log(`⚠️ [WEBHOOK] Active temp link already exists for user ${userId}. Skipping WhatsApp dispatch.`);
                                    }
                                }
                            } catch (whatsappErr: any) {
                                console.error(`❌ [WEBHOOK] Error handling automated WhatsApp dispatch:`, whatsappErr.message);
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

/**
 * Helper to send a Twilio WhatsApp message using global fetch.
 * Avoids any external Twilio SDK dependencies in Cloud Functions.
 */
async function sendWhatsAppMessageViaFetch(toPhone: string, message: string) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "";
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    if (!accountSid || !authToken) {
        console.error("❌ [WHATSAPP] Twilio credentials missing in Cloud Function environment.");
        return { success: false };
    }

    const cleanPhone = toPhone.replace(/\s+/g, '');
    const toWhatsAppNumber = cleanPhone.startsWith('whatsapp:') 
        ? cleanPhone 
        : cleanPhone.startsWith('+') 
            ? `whatsapp:${cleanPhone}`
            : `whatsapp:+${cleanPhone}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const params = new URLSearchParams();
    params.append("To", toWhatsAppNumber);
    params.append("From", twilioWhatsAppNumber);
    params.append("Body", message);

    try {
        console.log(`📩 [WHATSAPP] Sending Twilio API request to ${toWhatsAppNumber}...`);
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${authString}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params.toString()
        });

        if (response.ok) {
            const data: any = await response.json();
            console.log(`✅ [WHATSAPP] WhatsApp sent successfully. SID: ${data.sid}`);
            return { success: true, sid: data.sid };
        } else {
            const errText = await response.text();
            console.error("❌ [WHATSAPP] Twilio API error response:", errText);
            return { success: false };
        }
    } catch (e: any) {
        console.error("❌ [WHATSAPP] Exception sending Twilio WhatsApp message:", e.message);
        return { success: false };
    }
}

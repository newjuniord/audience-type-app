import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
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
                        } else {
                            // Pour les consultations, on n'a pas d'inscription (enrollment), 
                            // donc on envoie manuellement la notification de confirmation ici !
                            console.log(`📞 [WEBHOOK] Sending consultation confirmation WhatsApp to user ${userId}`);
                            if (userId) {
                                await generateAndSendNotification(
                                    userId,
                                    orderData.userName || "",
                                    orderData.productTitle || "Consultation",
                                    orderData.productType,
                                    false
                                );
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
 * Helper to send a Twilio SMS message using global fetch.
 * Avoids any external Twilio SDK dependencies in Cloud Functions.
 */
async function sendSmsViaFetch(toPhone: string, message: string) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "";
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
    const fromNumber = process.env.TWILIO_SMS_NUMBER || 
        process.env.TWILIO_PHONE_NUMBER || 
        twilioWhatsAppNumber.replace("whatsapp:", "");

    if (!accountSid || !authToken) {
        console.error("❌ [SMS] Twilio credentials missing in Cloud Function environment.");
        return { success: false };
    }

    const cleanPhone = toPhone.replace(/\s+/g, '').replace('whatsapp:', '');
    const toSmsNumber = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const params = new URLSearchParams();
    params.append("To", toSmsNumber);
    params.append("From", fromNumber);
    params.append("Body", message);

    try {
        console.log(`📩 [SMS] Sending Twilio API request to ${toSmsNumber} from ${fromNumber}...`);
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
            console.log(`✅ [SMS] SMS sent successfully. SID: ${data.sid}`);
            return { success: true, sid: data.sid };
        } else {
            const errText = await response.text();
            console.error("❌ [SMS] Twilio API error response:", errText);
            return { success: false };
        }
    } catch (e: any) {
        console.error("❌ [SMS] Exception sending Twilio SMS message:", e.message);
        return { success: false };
    }
}

/**
 * Helper to generate a temp link and send a unified SMS notification
 */
async function generateAndSendNotification(
    userId: string, 
    userName: string, 
    productTitle: string, 
    productType: string, 
    isGift: boolean
) {
    try {
        const userRef = db.collection("users").doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            console.warn(`⚠️ [NOTIFY] User ${userId} not found in Firestore.`);
            return;
        }

        const userData = userSnap.data();
        const phone = userData?.phone || "";

        if (!phone) {
            console.log(`ℹ️ [NOTIFY] User ${userId} has no phone number. Skipping SMS delivery.`);
            return;
        }

        console.log(`🔍 [NOTIFY] Checking existing temp links for user: ${userId}`);
        const existingLinks = await db.collection("temp_links")
            .where("userId", "==", userId)
            .where("used", "==", false)
            .limit(1)
            .get();

        let token = "";
        let code = "";

        if (existingLinks.empty) {
            token = crypto.randomUUID();
            code = Math.floor(100000 + Math.random() * 900000).toString();
            
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 100);

            console.log(`🌟 [NOTIFY] Creating new temp link and code ${code} for user ${userId}`);
            await db.collection("temp_links").doc(token).set({
                userId: userId,
                code: code,
                expiresAt: expiresAt,
                used: false,
                createdAt: new Date()
            });
        } else {
            const existingDoc = existingLinks.docs[0];
            token = existingDoc.id;
            code = existingDoc.data().code;
            console.log(`🌟 [NOTIFY] Reusing existing active temp link and code ${code} for user ${userId}`);
        }

        const link = `https://audiencetype.com/login/temp?token=${token}`;
        
        let message = "";
        if (isGift) {
            message = `Bonjour, votre commande est prête. Utilisez ce code *${code}* pour avoir accès. - Connecte-toi ici : ${link}`;
        } else {
            let introText = "";
            if (productType === "service" || productType === "booking") {
                introText = `🗓️ *CONSULTATION CONFIRMÉE !*\n\nMerci ${userName || "Cher(e) membre"} !\n\nTa réservation pour la consultation *${productTitle || "Premium"}* a été validée avec succès.`;
            } else {
                introText = `🎉 *ACCÈS DÉBLOQUÉ !* 📚\n\nMerci pour ton achat ${userName || ""} !\n\nTon produit *${productTitle || "Premium"}* est maintenant disponible dans ton espace membre.`;
            }
            message = `${introText}\n\nVoici ton code secret de connexion : *${code}*\n\nTu peux également cliquer sur ce lien magique pour te connecter instantanément d'un seul clic :\n${link}\n\nNe partage jamais ce code.`;
        }

        await sendSmsViaFetch(phone, message);
    } catch (err: any) {
        console.error("❌ [NOTIFY] Error in generateAndSendNotification:", err.message);
    }
}

/**
 * Cloud Function (Firestore Trigger): onenrollmentcreated
 * Triggers automatically whenever a new enrollment is created in Firestore.
 * If the user has a `phone` in their profile, it creates an access code & magic link and sends it via SMS.
 */
export const onenrollmentcreated = onDocumentCreated({
    document: "enrollments/{enrollmentId}",
    secrets: [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_WHATSAPP_NUMBER"
    ],
    region: "us-central1"
}, async (event) => {
    const snap = event.data;
    if (!snap) {
        console.log("No data associated with the event");
        return;
    }
    const enrollmentData = snap.data();
    const userIdData = enrollmentData.userId;

    if (!userIdData) {
        console.warn("⚠️ [TRIGGER] Missing userId in enrollment.");
        return;
    }

    // Resolve userId to string
    let userId = "";
    if (typeof userIdData === "string") {
        userId = userIdData;
    } else if (userIdData && typeof userIdData.id === "string") {
        userId = userIdData.id;
    } else if (userIdData && typeof userIdData.path === "string") {
        userId = userIdData.path.split("/").pop() || "";
    }

    if (!userId) {
        console.warn("⚠️ [TRIGGER] Could not parse userId from enrollment.");
        return;
    }

    const isGift = enrollmentData.isGift || enrollmentData.orderId === "admin_gift";
    const userName = enrollmentData.userName || "";
    const productTitle = enrollmentData.productTitle || "";
    const productType = enrollmentData.productType || "Course";

    if (enrollmentData.notificationSent === true) {
        console.log("ℹ️ [TRIGGER] Notification already sent by Next.js server action. Skipping duplicate.");
        return;
    }

    await generateAndSendNotification(userId, userName, productTitle, productType, isGift);
});


"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendwhatsappmessage = exports.onenrollmentcreated = exports.lemonsqueezyrefund = exports.lemonsqueezywebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const crypto = __importStar(require("crypto"));
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const auth = (0, auth_1.getAuth)();
/**
 * Cloud Function: lemonsqueezyWebhook
 * Listen for Lemon Squeezy events (e.g., order_created).
 */
exports.lemonsqueezywebhook = (0, https_1.onRequest)({
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
        const signature = req.headers["x-signature"] || "";
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
                                    const userUpdates = {};
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
                                        }
                                        catch (authErr) {
                                            console.warn(`⚠️ [WEBHOOK] Failed to update email in Firebase Auth:`, authErr.message);
                                        }
                                    }
                                    if (Object.keys(userUpdates).length > 0) {
                                        await userRef.update(userUpdates);
                                        console.log(`✅ [WEBHOOK] Firestore user profile updated with:`, userUpdates);
                                    }
                                }
                            }
                            catch (userErr) {
                                console.error(`❌ [WEBHOOK] Error updating user profile:`, userErr.message);
                            }
                        }
                        // Update the order doc
                        const orderUpdates = {
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
                    }
                    else {
                        console.log(`⚠️ [WEBHOOK] Order ${custom.orderId} is already 'paid'`);
                    }
                }
                else {
                    console.error(`❌ [WEBHOOK] Order not found: ${custom.orderId}`);
                }
            }
            else {
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
    }
    catch (error) {
        console.error("🔥 [WEBHOOK ERROR]", error);
        res.status(500).json({ error: "Internal error" });
    }
});
/**
 * Cloud Function: lemonsqueezyrefund
 * Handles ONLY order_refunded events.
 */
exports.lemonsqueezyrefund = (0, https_1.onRequest)({
    secrets: ["LEMON_SQUEEZY_WEBHOOK_SECRET"],
    region: "us-central1"
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    try {
        const rawBody = req.rawBody.toString();
        const signature = req.headers["x-signature"] || "";
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
    }
    catch (error) {
        console.error("🔥 [REFUND ERROR]", error);
        res.status(500).json({ error: "Internal error" });
    }
});
/**
 * Helper to send a Twilio WhatsApp message using global fetch.
 * Avoids any external Twilio SDK dependencies in Cloud Functions.
 */
async function sendWhatsAppMessageViaFetch(toPhone, message) {
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
            const data = await response.json();
            console.log(`✅ [WHATSAPP] WhatsApp sent successfully. SID: ${data.sid}`);
            return { success: true, sid: data.sid };
        }
        else {
            const errText = await response.text();
            console.error("❌ [WHATSAPP] Twilio API error response:", errText);
            return { success: false };
        }
    }
    catch (e) {
        console.error("❌ [WHATSAPP] Exception sending Twilio WhatsApp message:", e.message);
        return { success: false };
    }
}
/**
 * Cloud Function (Firestore Trigger): onenrollmentcreated
 * Triggers automatically whenever a new enrollment is created in Firestore.
 * If the user has a `whatsappNumber` in their profile, it creates an access code & magic link and sends it via WhatsApp.
 */
exports.onenrollmentcreated = (0, firestore_1.onDocumentCreated)({
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
    }
    else if (userIdData && typeof userIdData.id === "string") {
        userId = userIdData.id;
    }
    else if (userIdData && typeof userIdData.path === "string") {
        userId = userIdData.path.split("/").pop() || "";
    }
    if (!userId) {
        console.warn("⚠️ [TRIGGER] Could not parse userId from enrollment.");
        return;
    }
    try {
        const userRef = db.collection("users").doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            console.warn(`⚠️ [TRIGGER] User ${userId} not found in Firestore.`);
            return;
        }
        const userData = userSnap.data();
        const whatsappNumber = userData?.whatsappNumber || "";
        if (!whatsappNumber) {
            console.log(`ℹ️ [TRIGGER] User ${userId} has no whatsappNumber. Skipping WhatsApp delivery.`);
            return;
        }
        console.log(`🔍 [TRIGGER] Checking existing temp links to prevent duplicate WhatsApp dispatch for user: ${userId}`);
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
            console.log(`🌟 [TRIGGER] Creating new temp link and code ${code} for user ${userId}`);
            await db.collection("temp_links").doc(token).set({
                userId: userId,
                code: code,
                expiresAt: expiresAt,
                used: false,
                createdAt: new Date()
            });
            const link = `https://audiencetype.com/login/temp?token=${token}`;
            const message = `🎉 *ACCÈS DÉBLOQUÉ !* 📚\n\nMerci pour ton achat ! Ton cours *${enrollmentData.productTitle || "Premium"}* est maintenant disponible dans ton espace membre.\n\nVoici ton code secret de connexion : *${code}*\n\nTu peux également cliquer sur ce lien magique pour te connecter instantanément d'un seul clic :\n${link}\n\nNe partage jamais ce code. Bon apprentissage !`;
            await sendWhatsAppMessageViaFetch(whatsappNumber, message);
        }
        else {
            console.log(`⚠️ [TRIGGER] Active temp link already exists for user ${userId}. Skipping duplicate dispatch.`);
        }
    }
    catch (err) {
        console.error("❌ [TRIGGER] Error in onenrollmentcreated trigger:", err.message);
    }
});
/**
 * Cloud Function (HTTPS API): sendwhatsappmessage
 * Generic HTTPS endpoint that accepts a phone number and a custom message and dispatches it via Twilio.
 */
exports.sendwhatsappmessage = (0, https_1.onRequest)({
    secrets: [
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
        const { phone, message } = req.body;
        if (!phone || !message) {
            res.status(400).json({ error: "Missing phone or message in payload." });
            return;
        }
        console.log(`📩 [HTTPS API] Request to send WhatsApp message to ${phone}`);
        const result = await sendWhatsAppMessageViaFetch(phone, message);
        if (result && result.success) {
            res.status(200).json({ success: true, sid: result.sid });
        }
        else {
            res.status(500).json({ error: "Failed to send WhatsApp message via Twilio." });
        }
    }
    catch (err) {
        console.error("❌ [HTTPS API] Error sending WhatsApp message:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
//# sourceMappingURL=index.js.map
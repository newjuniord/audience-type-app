import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
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
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+17157507852";
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

    // Yon kado vrè se sèlman si li soti nan paj Kado a (isGift === true)
    // Si se admin ki bay aksè a (orderId === "admin_gift"), nou pa konsidere l tankou "Kado Espesyal" ankò
    const isGift = enrollmentData.isGift === true;
    const productTitle = enrollmentData.productTitle || "";
    const productType = enrollmentData.productType || "Course";

    // Instead of WhatsApp (Twilio), send an in-app alert (which triggers sendAlertPushNotification)
    const alertTitle = isGift ? `🎁 Kado Espesyal: ${productTitle}` : `✅ Aksè Konfime: ${productTitle}`;
    
    let descriptionText = "Ou gen aksè konplè kounye a.";
    if (productType === "Ebook") {
        descriptionText = "Ou ka telechaje ak li ebook sa a nenpòt kilè nan kont ou.";
    } else if (productType === "Course" || productType === "Kou") {
        descriptionText = "Tout videyo ak resous pou kou sa a disponib nan kont ou kounye a.";
    }

    const alertBody = isGift 
        ? `Felisitasyon ! Nou fè w kado: "${productTitle}". ${descriptionText}`
        : `Mèsi pou konfyans ou ! Ou fenk debloke: "${productTitle}". ${descriptionText}`;

    await db.collection("alerts").add({
        userId,
        category: "utility",
        type: "custom",
        title: alertTitle,
        body: alertBody,
        isRead: false,
        icon: "school",
        iconColor: "text-primary",
        iconBg: "bg-primary/10",
        actionUrl: "/dashboard",
        actionLabel: "Ouvri tablodbò a",
        createdAt: new Date()
    });
    console.log(`✅ [TRIGGER] Created push notification alert for user ${userId} regarding ${productTitle}`);
});

// ============================================================================
// Helper: Send WhatsApp message via Twilio (WhatsApp channel)
// ============================================================================
async function sendWhatsAppViaFetch(toPhone: string, message: string) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "";
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+17157507852";

    if (!accountSid || !authToken) {
        console.error("❌ [WA] Twilio credentials missing.");
        return { success: false };
    }

    const cleanTo = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`;
    const cleanFrom = twilioWhatsAppNumber.startsWith("whatsapp:") ? twilioWhatsAppNumber : `whatsapp:${twilioWhatsAppNumber}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const params = new URLSearchParams();
    params.append("To", cleanTo);
    params.append("From", cleanFrom);
    params.append("Body", message);

    try {
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
            console.log(`✅ [WA] Sent. SID: ${data.sid}`);
            return { success: true, sid: data.sid };
        } else {
            const errText = await response.text();
            console.error("❌ [WA] Twilio error:", errText);
            return { success: false };
        }
    } catch (e: any) {
        console.error("❌ [WA] Exception:", e.message);
        return { success: false };
    }
}

// ============================================================================
// Cloud Function: webhookbotmessage
// Bot WhatsApp DJR Akademi — metem | kod | bug | kontak | contact
//
// RÈGLE D'OR: phoneNumber provient UNIQUEMENT de `From` (Twilio).
// Le Body n'est jamais utilisé pour identifier l'utilisateur.
// ============================================================================
export const webhookbotmessage = onRequest({
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_NUMBER"],
    region: "us-central1"
}, async (req, res) => {
    // Répondre 200 immédiatement à Twilio pour éviter les retries
    res.status(200).send("OK");
    if (req.method !== "POST") return;

    let lockId: string | null = null;

    try {
        // ── Parse Twilio's URL-encoded body ──────────────────────────────────
        const bodyParams = new URLSearchParams(req.rawBody?.toString() || "");
        const From = bodyParams.get("From") || "";    // "whatsapp:+18296692914"
        const Body = bodyParams.get("Body") || "";
        const ProfileName = bodyParams.get("ProfileName") || "Client";

        if (!From || !Body) {
            console.warn("⚠️ [BOT] Missing From or Body.");
            return;
        }

        const phoneNumber = From.replace("whatsapp:", "").trim(); // "+18296692914"
        const otpDocId = From.trim();                          // "whatsapp:+18296692914"
        const rawMessage = Body.trim().toLowerCase();
        const userMessage = rawMessage.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        lockId = `${phoneNumber}_${userMessage}`;

        // ── Verrou de sécurité contre les requêtes identiques concurrentes ─────
        const lockRef = db.collection("bot_locks").doc(lockId);
        const isLocked = await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(lockRef);
            if (doc.exists) {
                const data = doc.data();
                const now = Date.now();
                if (data && data.isProcessing && (now - data.lockedAt < 15000)) {
                    return true;
                }
            }
            transaction.set(lockRef, {
                isProcessing: true,
                lockedAt: Date.now()
            });
            return false;
        });

        if (isLocked) {
            console.warn(`🔒 [BOT] Duplicate request blocked by isProcessing lock: ${phoneNumber} -> ${userMessage}`);
            lockId = null;
            return;
        }

        console.log(`📩 [BOT] "${rawMessage}" (normalized: "${userMessage}") from ${phoneNumber} (${ProfileName})`);

        const MAX_PER_DAY = 10;

        // ── Helper: vérifier le rate limit ───────────────────────────────────
        const checkRateLimit = async (): Promise<{ blocked: boolean; count: number; expireAt: Date | null }> => {
            const otpDoc = await db.collection("otp_code").doc(otpDocId).get();
            const now = new Date();
            if (otpDoc.exists) {
                const data = otpDoc.data()!;
                const expireAt = data.expireAt?.toDate() as Date;
                const count = (data.count || 0) as number;
                if (expireAt && expireAt > now && count >= MAX_PER_DAY) {
                    return { blocked: true, count, expireAt };
                }
                return { blocked: false, count: (expireAt && expireAt > now) ? count : 0, expireAt: expireAt || null };
            }
            return { blocked: false, count: 0, expireAt: null };
        };

        // ── Helper: écrire le doc OTP (fenêtre 24h partagée) ─────────────────
        const updateOtpDoc = async (uid: string, code: string, currentCount: number, existingExpireAt: Date | null) => {
            const now = new Date();
            const newExpireAt = (existingExpireAt && existingExpireAt > now)
                ? existingExpireAt
                : new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
            await db.collection("otp_code").doc(otpDocId).set(
                { code, count: currentCount + 1, expireAt: newExpireAt, type: "whatsapp", userId: uid },
                { merge: true }
            );
        };

        const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

        // ── Helper: trouver l'utilisateur par numéro ──────────────────────────
        const findUserByPhone = async (): Promise<{ uid: string; displayName: string } | null> => {
            const snap = await db.collection("users").where("phone", "==", phoneNumber).limit(1).get();
            if (snap.empty) return null;
            const d = snap.docs[0].data();
            return { uid: snap.docs[0].id, displayName: d.displayName || "Client" };
        };

        // ── Helper: effacer tous les anciens temp_links non utilisés ──────────
        const clearOldTempLinks = async (uid: string) => {
            const old = await db.collection("temp_links").where("userId", "==", uid).where("used", "==", false).get();
            if (!old.empty) {
                const batch = db.batch();
                old.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
                console.log(`🗑️ [BOT] Deleted ${old.size} old temp_link(s) for ${uid}`);
            }
        };

        // ── Helper: créer un nouveau temp_link (10h) ──────────────────────────
        const createTempLink = async (uid: string): Promise<string> => {
            const token = crypto.randomUUID();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 10 * 60 * 60 * 1000); // +10h
            await db.collection("temp_links").doc(token).set({ userId: uid, expiresAt, used: false, createdAt: now });
            return token;
        };

        // ════════════════════════════════════════════════════════════════════════
        // KEYWORD: metem — Inscription ou Reconnexion rapide
        // ════════════════════════════════════════════════════════════════════════
        if (userMessage === "metem") {
            const rateLimit = await checkRateLimit();
            if (rateLimit.blocked) {
                await sendWhatsAppViaFetch(From, `🚫 Ou te mande twòp kòd jodi a.\nEsaye ankò demen (limit ${MAX_PER_DAY} fwa pou 24 tè).`);
                return;
            }

            let uid = "";
            let displayName = ProfileName;
            let isNewUser = false;

            const existingUser = await findUserByPhone();

            if (existingUser) {
                uid = existingUser.uid;
                displayName = existingUser.displayName;
                console.log(`✅ [BOT/metem] Existing user: ${uid}`);
            } else {
                isNewUser = true;
                try {
                    const newUser = await auth.createUser({ phoneNumber, displayName: ProfileName });
                    uid = newUser.uid;
                    console.log(`✅ [BOT/metem] Auth user created: ${uid}`);
                } catch (authErr: any) {
                    if (authErr.code === "auth/phone-number-already-exists") {
                        // Auto-guérison : Auth existe mais doc Firestore manquant
                        const existingAuthUser = await auth.getUserByPhoneNumber(phoneNumber);
                        uid = existingAuthUser.uid;
                        displayName = existingAuthUser.displayName || ProfileName;
                        console.warn(`⚠️ [BOT/metem] Self-healing for uid: ${uid}`);
                    } else {
                        throw authErr;
                    }
                }

                const now = new Date();
                await db.collection("users").doc(uid).set({
                    uid,
                    phone: phoneNumber,
                    displayName: ProfileName,
                    email: `${uid}@audiencetype.com`,
                    status: "active",
                    role: "user",
                    createdAt: now,
                    updatedAt: now
                });
            }

            await clearOldTempLinks(uid);
            const token = await createTempLink(uid);
            const link = `https://audiencetype.com/login/temp?token=${token}`;
            const code = generateOtp();
            await updateOtpDoc(uid, code, rateLimit.count, rateLimit.expireAt);

            const msg = isNewUser
                ? `🎉 Kont ou a kreye avèk siksè, ${displayName}!\n\nMen lyen sekirize ou pou w konekte an (lap ekspire nan 10è tan) : 🔗 ${link}\n\nNou jenere yon kòd OTP pou ou tou : 🔑 *${code}*\n\n⚠️ Pa pataje lyen sa a — li pou ou sèlman.`
                : `Mèsi paske ou mande kont ou, li egziste deja 😊!\n\n🔐 Pou sekirite ou, tout ansyen lyen ou yo efase.\nMen nouvo lyen koneksyon rapid ou a (lap ekspire nan 10è tan) : 🔗 ${link}\n\nEpi men kòd OTP ou a si ou bezwen konekte sou yon lòt aparèy : 🔑 *${code}*\n\n⚠️ Pa pataje lyen sa a — li pou ou sèlman.`;

            await sendWhatsAppViaFetch(From, msg);
            console.log(`📤 [BOT/metem] Done (isNew=${isNewUser})`);
        }

        // ════════════════════════════════════════════════════════════════════════
        // KEYWORD: kod — OTP pour autre appareil
        // ════════════════════════════════════════════════════════════════════════
        else if (userMessage === "kod" || userMessage === "kòd" || userMessage === "kód" || rawMessage === "kod" || rawMessage === "kòd" || rawMessage === "kód") {
            const rateLimit = await checkRateLimit();
            if (rateLimit.blocked) {
                await sendWhatsAppViaFetch(From, `🚫 Ou te mande twòp kòd jodi a.\nEsaye ankò demen (limit ${MAX_PER_DAY} fwa pou 24 tè).`);
                return;
            }

            const existingUser = await findUserByPhone();
            if (!existingUser) {
                await sendWhatsAppViaFetch(From, `❌ Nou pa jwenn okenn kont pou nimewo sa a.\nTanpri, ekri mo sa a anvan : *metem*\npou w ka kreye kont ou.`);
                return;
            }

            const { uid } = existingUser;
            const code = generateOtp();
            await updateOtpDoc(uid, code, rateLimit.count, rateLimit.expireAt);
            await sendWhatsAppViaFetch(From, `🔑 KÒD OTP OU A\n\nMen kòd koneksyon ou an :\n*${code}*\n\nKòd sa a valab pou 24 èdtan.\nAntre li sou paj koneksyon DJR Akademi an.`);
            console.log(`📤 [BOT/kod] OTP sent to ${phoneNumber}`);
        }

        // ════════════════════════════════════════════════════════════════════════
        // KEYWORD: bug — Support technique
        // ════════════════════════════════════════════════════════════════════════
        else if (userMessage === "bug") {
            await sendWhatsAppViaFetch(From, `⚠️ SIPÒ TEKNIK\n\nSi w jwenn yon pwoblèm teknik oswa yon ensèk (bug) sou sit la, kontakte nou imedyatman nan imel sa a :\n📧 contact@audiencetype.com\n\noswa dirèkteman sou WhatsApp nan nimewo sa a :\n📞 3094848394`);
        }

        // ════════════════════════════════════════════════════════════════════════
        // HELP MENU: info | enfo | enfomasyon | information | edem | 404 | 500
        // ════════════════════════════════════════════════════════════════════════
        else if (
            userMessage === "info" ||
            userMessage === "enfo" ||
            userMessage === "enfomasyon" ||
            userMessage === "information" ||
            userMessage === "edem" ||
            userMessage === "problem" ||
            userMessage === "help" ||
            userMessage === "404" ||
            userMessage === "500"
        ) {
            await sendWhatsAppViaFetch(From, `👋 Bonjou! Men kòmand ki disponib yo :\n\n• Tape *metem* ➜ kreye kont ou epi resevwa lyen koneksyon ou\n• Tape *kod* ➜ resevwa yon kòd koneksyon ' OTP '\n• Tanpri🙏🏽🥺 tann 5 minit pou resevwa repons! avan ou tape yon lòt kòmand...`);
        }
        // ════════════════════════════════════════════════════════════════════════
        // UNKNOWN — Ignorer silencieusement
        // ════════════════════════════════════════════════════════════════════════
        else {
            console.log(`ℹ️ [BOT] Ignored unknown message: "${userMessage}" from ${phoneNumber}`);
        }

    } catch (error: any) {
        // 200 déjà envoyé à Twilio — on log seulement, pas de retry
        console.error("🔥 [BOT ERROR]", error.message || error);
    } finally {
        if (lockId) {
            try {
                await db.collection("bot_locks").doc(lockId).delete();
            } catch (lockError) {
                console.error("❌ Failed to release lock:", lockError);
            }
        }
    }
});

/**
 * Cloud Function: sendAlertPushNotification
 * Triggered when a new alert is created in alerts/{alertId}
 */
export const sendAlertPushNotification = onDocumentCreated(
    { document: "alerts/{alertId}", region: "us-central1" },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const alertData = snapshot.data();
        const userId = alertData.userId;

        if (!userId) {
            console.log(`[PUSH] Alert document ${event.params.alertId} has no userId`);
            return;
        }

        try {
            // Get the user's FCM token
            const userRef = db.collection("users").doc(userId);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                console.log(`[PUSH] User ${userId} not found`);
                return;
            }

            const userData = userSnap.data();
            const fcmToken = userData?.fcmToken;

            if (!fcmToken) {
                console.log(`[PUSH] No FCM token for user ${userId}. Skipping push notification.`);
                return;
            }

            // Construct payload
            const payload = {
                notification: {
                    title: alertData.title || 'Notifikasyon',
                    body: alertData.body || 'Ou gen yon nouvo alèt nan kont ou.',
                },
                token: fcmToken,
            };

            // Send via FCM Admin
            const response = await getMessaging().send(payload);
            console.log(`✅ [PUSH] Successfully sent message:`, response);
        } catch (error) {
            console.error(`❌ [PUSH] Error sending message:`, error);
        }
    }
);

/**
 * Cloud Function: onchatmessagecreated
 * Triggered when a new message document is created in chats/{userId}/messages/{messageId}.
 * Sends a push notification to the student when the admin sends a message.
 */
export const onchatmessagecreated = onDocumentCreated(
    { document: "chats/{userId}/messages/{messageId}", region: "us-central1" },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const messageData = snapshot.data();
        const senderId = messageData.senderId;

        // We only send push notifications to the student if the admin was the sender
        if (senderId !== "admin") {
            return;
        }

        const userId = event.params.userId;
        if (!userId) return;

        try {
            // Get the user's FCM token
            const userRef = db.collection("users").doc(userId);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                console.log(`[CHAT PUSH] User ${userId} not found`);
                return;
            }

            const userData = userSnap.data();
            const fcmToken = userData?.fcmToken;

            if (!fcmToken) {
                console.log(`[CHAT PUSH] No FCM token for user ${userId}. Skipping push notification.`);
                return;
            }

            const alertBody = messageData.type === "image" ? "📷 Ou resevwa yon nouvo imaj" : messageData.text;

            // Construct payload
            const payload = {
                notification: {
                    title: "DJR Akademi",
                    body: alertBody || "Ou gen yon nouvo mesaj nan chat la.",
                },
                token: fcmToken,
            };

            // Send via FCM Admin
            const response = await getMessaging().send(payload);
            console.log(`✅ [CHAT PUSH] Successfully sent chat push to user ${userId}:`, response);
        } catch (error) {
            console.error(`❌ [CHAT PUSH] Error sending chat push:`, error);
        }
    }
);



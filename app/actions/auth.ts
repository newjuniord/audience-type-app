"use server";

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendSmsMessage, formatMessageTemplate, sendWhatsAppMessage } from "@/lib/whatsapp";

/**
 * Vérifie si un utilisateur existe par numéro de téléphone ou email.
 * Si targetProductId est fourni, vérifie également s'il possède ce produit.
 * Note: Cette fonction ne crée PLUS de compte. Elle sert juste pour la vérification.
 */
export async function checkUserAction(phone: string, email?: string, targetProductId?: string) {
    if (!phone && !email) {
        return { error: "Numéro de téléphone ou email requis" };
    }

    try {
        const adminDb = getAdminDb();
        const usersRef = adminDb.collection("users");
        let querySnapshot;

        if (email) {
            querySnapshot = await usersRef.where("email", "==", email.trim().toLowerCase()).get();
        } else {
            let cleanNum = phone.trim().replace(/^whatsapp:/i, '');
            if (!cleanNum.startsWith('+')) {
                cleanNum = '+' + cleanNum;
            }
            querySnapshot = await usersRef.where("phone", "==", cleanNum).get();
        }

        if (querySnapshot.empty) {
            return { exists: false };
        }

        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userEmail = userData.email || "";
        const userName = userData.name || "Client";

        if (!targetProductId) {
            return {
                exists: true,
                ownsCourse: false,
                userId,
                userEmail,
                userName
            };
        }

        const enrollmentsRef = adminDb.collection("enrollments");
        const snapString = await enrollmentsRef.where("userId", "==", userId).get();
        const userDocRef = usersRef.doc(userId);
        const snapRef = await enrollmentsRef.where("userId", "==", userDocRef).get();

        const enrollments: any[] = [];
        const seenIds = new Set<string>();

        [...snapString.docs, ...snapRef.docs].forEach(doc => {
            if (!seenIds.has(doc.id)) {
                seenIds.add(doc.id);
                enrollments.push({ id: doc.id, ...doc.data() });
            }
        });

        const hasAccess = enrollments.some(e => {
            let eProductId = "";
            if (e.productId) {
                if (typeof e.productId === 'string') {
                    eProductId = e.productId;
                } else if (e.productId.id) {
                    eProductId = e.productId.id;
                } else if (typeof e.productId.path === 'string') {
                    eProductId = e.productId.path.split('/').pop() || "";
                }
            }
            return eProductId === targetProductId;
        });

        return {
            exists: true,
            ownsCourse: hasAccess,
            userId,
            userEmail,
            userName
        };
    } catch (error: any) {
        console.error("Error in checkUserAction:", error);
        return { error: "Erreur lors de la vérification de l'utilisateur" };
    }
}

/**
 * Génère un code OTP (4 chiffres) et l'envoie via SMS ou Email.
 * Gère le rate limiting de 4 ou 10 par 24h selon la méthode dans la collection `otp_code`.
 */
export async function generateOtpAction(contact: string, type: 'phone' | 'email' | 'whatsapp' | 'telegram') {
    if (!contact) {
        return { error: "Contact manquant" };
    }

    try {
        const adminDb = getAdminDb();
        let contactClean = type === 'email' ? contact.trim().toLowerCase() : contact.trim();
        if (type === 'whatsapp' || type === 'phone' || type === 'telegram') {
            contactClean = contactClean.replace(/^whatsapp:/i, '');
            if (!contactClean.startsWith('+')) {
                contactClean = '+' + contactClean;
            }
        }

        if (type === 'phone' || type === 'telegram') {
            const preludeApiKey = process.env.PRELUDE_API_KEY;
            if (!preludeApiKey) {
                console.error("PRELUDE_API_KEY is missing from environment variables.");
                return { error: "Erreur: Konfigirasyon Prelude la pa kòrèk sou sèvè a." };
            }

            const preferredChannel = type === 'phone' ? 'sms' : type;

            try {
                const response = await fetch("https://api.prelude.dev/v2/verification", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${preludeApiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        target: {
                            type: "phone_number",
                            value: contactClean
                        },
                        options: {
                            preferred_channel: preferredChannel
                        }
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("❌ [Prelude API Error] Status:", response.status);
                    console.error("❌ [Prelude API Error] Body:", errorText);
                    return { error: `Erè nan voye SMS la. (API Error: ${response.status}). Tanpri eseye avèk WhatsApp pito.` };
                }

                const resData = await response.json();
                console.log("ℹ️ [Prelude API Success] Response:", resData);
                if (resData.status === "success" || resData.status === "retry") {
                    return { success: true };
                } else {
                    return { error: `Erè nan voye SMS la (Status: ${resData.status}). Tanpri eseye avèk WhatsApp pito.` };
                }
            } catch (err: any) {
                console.error("❌ [Prelude Exception] calling Prelude API:", err);
                return { error: `Erè nan voye SMS la. (Exception: ${err.message || err}). Tanpri eseye avèk WhatsApp pito.` };
            }
        }

        const contactId = type === 'whatsapp' ? `whatsapp:${contactClean}` : contactClean;
        const otpRef = adminDb.collection("otp_code").doc(contactId);
        
        const otpDoc = await otpRef.get();
        const now = new Date();
        const maxLimit = type === 'whatsapp' ? 10 : type === 'email' ? 5 : 4;

        let currentCount = 0;
        let isBlocked = false;

        if (type === 'whatsapp') {
            let is24hWindowOpen = false;
            if (otpDoc.exists && otpDoc.data()?.expireAt?.toDate() > now) {
                is24hWindowOpen = true;
            }

            if (!is24hWindowOpen) {
                // Check if user exists
                let isNewUser = true;
                const usersRef = adminDb.collection("users");
                const querySnapshot = await usersRef.where("phone", "==", contactClean).get();
                if (!querySnapshot.empty) {
                    isNewUser = false;
                }

                // La fenêtre de 24h est fermée ou le document n'existe pas.
                // ON NE CREE PAS le document ici. C'est le webhook qui s'en chargera quand il recevra le message.
                const businessPhone = process.env.NEXT_PUBLIC_TWILIO_NUMBER || "+17157507852";
                const cleanBusinessPhone = businessPhone.replace('whatsapp:', '').replace(/"/g, '').replace(/'/g, '').replace(/\D/g, '');
                return { 
                    success: true, 
                    action: "redirect_to_whatsapp",
                    businessPhone: cleanBusinessPhone,
                    isNewUser
                };
            }
        }

        if (otpDoc.exists) {
            const data = otpDoc.data();
            const expireAt = data?.expireAt?.toDate();
            
            // Si la fenêtre des 24h n'est pas encore écoulée, on vérifie la limite
            if (expireAt && expireAt > now) {
                currentCount = data?.count || 0;
                if (currentCount >= maxLimit) {
                    isBlocked = true;
                }
            }
        }

        if (isBlocked) {
            return {
                error: "Trop de tentatives. Pour des raisons de sécurité, ce contact est bloqué. Veuillez réessayer demain (dans 24h).",
                isBlocked: true
            };
        }

        const code = Math.floor(1000 + Math.random() * 9000).toString(); // Code à 4 chiffres
        
        // Calcul de la nouvelle date d'expiration pour la fenêtre des 24h
        let newExpireAt = new Date();
        if (otpDoc.exists && otpDoc.data()?.expireAt?.toDate() > now) {
             newExpireAt = otpDoc.data()?.expireAt.toDate(); // Conserver la fenêtre actuelle
        } else {
             newExpireAt.setHours(newExpireAt.getHours() + 24); // Créer une nouvelle fenêtre de 24h
             currentCount = 0; // Réinitialiser le compteur
        }

        const newCount = currentCount + 1;

        await otpRef.set({
            code: code,
            count: newCount,
            type: type,
            expireAt: Timestamp.fromDate(newExpireAt),
            userId: "" // Le userId n'est pas nécessaire à ce stade, laissé vide selon les spécifications
        }, { merge: true });

        // Envoi effectif de l'OTP
        if (type === 'whatsapp') {
            const authTemplate = process.env.TWILIO_TEMPLATE_AUTH || 
                "🔑 *VÉRIFICATION DJR AKADEMI*\n\nVoici ton code de vérification pour accéder à la plateforme : {{code}}\n\nNe partage jamais ce code.";
            
            const message = formatMessageTemplate(authTemplate, { code, link: "audiencetype.com", userName: "Client" });
            
            await sendWhatsAppMessage(contactClean, message);
            console.log(`📩 [WhatsApp] Code envoyé directement à ${contactClean} (fenêtre 24h ouverte)`);
        } else if (type === 'email') {
            const sendgridKey = process.env.SENDGRID_API_KEY;
            const fromEmail = process.env.SENDGRID_FROM_EMAIL || "contact@audiencetype.com";

            if (!sendgridKey) {
                console.error("❌ SENDGRID_API_KEY manquante !");
                return { error: "Erreur de configuration email." };
            }

            const templateId = process.env.SENDGRID_TEMPLATE_AUTH_EMAIL || "d-ab881aa9ea704bdda1f3d0736485af12";

            const sendgridRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${sendgridKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    personalizations: [{ 
                        to: [{ email: contactClean }],
                        dynamic_template_data: {
                            otp_code: code,
                            current_year: new Date().getFullYear().toString()
                        }
                    }],
                    from: { email: fromEmail, name: "DJR Akademi" },
                    template_id: templateId
                })
            });

            if (!sendgridRes.ok) {
                const errorText = await sendgridRes.text();
                console.error("Erreur SendGrid:", errorText);
                return { error: "Impossible d'envoyer l'email de vérification." };
            }
            console.log(`📩 [EMAIL] Code de vérification envoyé à ${contactClean}`);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error in generateOtpAction:", error);
        
        // UX Améliorée pour les erreurs communes
        const errorMsg = error.message || "";
        
        if (errorMsg.includes("Permission to send an SMS")) {
            return { error: "L'envoi de SMS vers ce pays n'est pas autorisé par notre opérateur. Veuillez utiliser une adresse e-mail ou nous contacter." };
        }
        
        if (errorMsg.includes("is not a valid phone number") || errorMsg.includes("unprovisioned")) {
            return { error: "Le numéro de téléphone fourni semble invalide. Veuillez vérifier le format." };
        }
        
        if (errorMsg.includes("rate limit") || errorMsg.includes("Too many requests")) {
            return { error: "Vous avez demandé trop de codes. Veuillez patienter un moment avant de réessayer." };
        }
        
        // Temporaire pour débogage : on renvoie le message d'erreur exact de Twilio pour comprendre pourquoi ça bloque
        return { error: `Erreur interne Twilio : ${errorMsg}. Veuillez vérifier le terminal pour plus de détails.` };
    }
}

/**
 * Vérifie le code de manière stricte dans la collection `otp_code`.
 * Si valide : vérifie ou crée l'utilisateur dans `users` et génère un token Firebase Auth.
 */
export async function verifyOtpAndLoginAction(contact: string, code: string, type: 'phone' | 'email' | 'whatsapp' | 'telegram', fullName?: string) {
    if (!contact || !code) {
        return { error: "Contact ou code manquant" };
    }

    try {
        const adminDb = getAdminDb();
        let contactClean = type === 'email' ? contact.trim().toLowerCase() : contact.trim();
        if (type === 'whatsapp' || type === 'phone' || type === 'telegram') {
            contactClean = contactClean.replace(/^whatsapp:/i, '');
            if (!contactClean.startsWith('+')) {
                contactClean = '+' + contactClean;
            }
        }
        if (type === 'phone' || type === 'telegram') {
            const preludeApiKey = process.env.PRELUDE_API_KEY;
            if (!preludeApiKey) {
                console.error("PRELUDE_API_KEY is missing from environment variables.");
                return { error: "Erreur: Konfigirasyon Prelude la pa kòrèk ou pa jwenn kle API a." };
            }

            try {
                const response = await fetch("https://api.prelude.dev/v2/verification/check", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${preludeApiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        target: {
                            type: "phone_number",
                            value: contactClean
                        },
                        code: code.trim()
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Prelude check error:", errorText);
                    return { error: "Kòd la ekspire oswa li pa korèk." };
                }

                const resData = await response.json();
                if (resData.status !== "success") {
                    return { error: "Kòd la ekspire oswa li pa korèk." };
                }
            } catch (err) {
                console.error("Error calling Prelude API check:", err);
                return { error: "Kòd la ekspire oswa li pa korèk." };
            }
        } else {
            const contactId = type === 'whatsapp' ? `whatsapp:${contactClean}` : contactClean;
            const otpRef = adminDb.collection("otp_code").doc(contactId);

            const otpDoc = await otpRef.get();
            if (!otpDoc.exists) {
                return { error: "Aucun code demandé pour ce contact." };
            }

            const otpData = otpDoc.data();
            if (!otpData?.code || otpData.code !== code.trim()) {
                return { error: "Le code saisi est incorrect." };
            }

            // Le code est bon ! On l'efface immédiatement pour des raisons de sécurité
            await otpRef.update({ code: "" });
        }

        // Recherche ou création de l'utilisateur
        const usersRef = adminDb.collection("users");
        let querySnapshot;

        if (type === 'email') {
            querySnapshot = await usersRef.where("email", "==", contactClean).get();
        } else {
            querySnapshot = await usersRef.where("phone", "==", contactClean).get();
        }

        const adminAuth = getAdminAuth();
        let userId = "";

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userId = userDoc.id;
            console.log(`👤 [verifyOtpAndLoginAction] Utilisateur existant trouvé : ${userId}`);
        } else {
            // Création du compte dans Firebase Auth
            let userEmail = type === 'email' ? contactClean : undefined;
            let userPhone = (type === 'phone' || type === 'whatsapp' || type === 'telegram') ? contactClean : undefined;
            const userName = fullName ? fullName : (type === 'email' ? contactClean.split('@')[0] : contactClean);

            try {
                const authUser = await adminAuth.createUser({
                    email: userEmail,
                    phoneNumber: userPhone,
                    displayName: userName,
                });
                userId = authUser.uid;
            } catch (authErr: any) {
                console.warn("⚠️ [verifyOtpAndLoginAction] Erreur Firebase Auth création :", authErr.message);
                try {
                    if (userEmail) {
                        const existingAuthUser = await adminAuth.getUserByEmail(userEmail);
                        userId = existingAuthUser.uid;
                    } else if (userPhone) {
                        const existingAuthUser = await adminAuth.getUserByPhoneNumber(userPhone);
                        userId = existingAuthUser.uid;
                    } else {
                        throw new Error("Missing email and phone");
                    }
                } catch {
                    userId = `usr_${uuidv4().substring(0, 13).replace(/-/g, '')}`;
                }
            }

            // Création du document utilisateur dans Firestore
            const newUserDoc = {
                uid: userId,
                email: userEmail || "",
                phone: userPhone || "",
                name: userName,
                role: "customer",
                createdAt: FieldValue.serverTimestamp(),
                status: "active",
                enrollmentCount: 0
            };

            await usersRef.doc(userId).set(newUserDoc);
            console.log("👤 [verifyOtpAndLoginAction] Profil utilisateur créé dans Firestore :", userId);
        }

        // Lier l'ID utilisateur au document otp_code pour un éventuel suivi futur
        if (type !== 'phone' && type !== 'telegram') {
            const contactId = type === 'whatsapp' ? `whatsapp:${contactClean}` : contactClean;
            const otpRef = adminDb.collection("otp_code").doc(contactId);
            await otpRef.update({ userId: userId });
        }

        // Génération du Custom Token sécurisé
        const customToken = await adminAuth.createCustomToken(userId);

        return { success: true, customToken };
    } catch (error: any) {
        console.error("Error in verifyOtpAndLoginAction:", error);
        return { error: "Erreur lors de la vérification du code" };
    }
}

/**
 * Génère un Magic Link WhatsApp et l'envoie à l'utilisateur.
 * Ce token expire dans 12 minutes en base de données.
 */
export async function generateMagicLinkAction(contact: string) {
    if (!contact) return { error: "Contact manquant" };

    try {
        const adminDb = getAdminDb();
        let contactClean = contact.trim();
        contactClean = contactClean.replace(/^whatsapp:/i, '');
        if (!contactClean.startsWith('+')) {
            contactClean = '+' + contactClean;
        }

        const otpDocId = `whatsapp:${contactClean}`;
        const otpRef = adminDb.collection("otp_code").doc(otpDocId);
        const otpDoc = await otpRef.get();
        const now = new Date();

        let is24hWindowOpen = false;
        if (otpDoc.exists && otpDoc.data()?.expireAt?.toDate() > now) {
            is24hWindowOpen = true;
        }

        let isNewUser = true;
        const usersRef = adminDb.collection("users");
        const querySnapshot = await usersRef.where("phone", "==", contactClean).get();
        if (!querySnapshot.empty) {
            isNewUser = false;
        }

        if (!is24hWindowOpen) {
            const businessPhone = process.env.NEXT_PUBLIC_TWILIO_NUMBER || "+17157507852";
            const cleanBusinessPhone = businessPhone.replace('whatsapp:', '').replace(/"/g, '').replace(/'/g, '').replace(/\D/g, '');
            return { 
                success: true, 
                action: "redirect_to_whatsapp",
                businessPhone: cleanBusinessPhone,
                isNewUser
            };
        }
        
        // Nettoyage des anciens tokens pour ce numéro (optionnel, mais garde la DB propre)
        const oldLinksSnap = await adminDb.collection("magic_links")
            .where("phone", "==", contactClean)
            .where("status", "==", "pending")
            .get();
        
        const batch = adminDb.batch();
        oldLinksSnap.forEach(doc => {
            batch.update(doc.ref, { status: "expired" });
        });

        // Génération d'un token sécurisé (64 caractères)
        const token = (uuidv4() + uuidv4()).replace(/-/g, '');
        const expiresAt = new Date(Date.now() + 12 * 60 * 1000); // +12 minutes

        const magicLinkRef = adminDb.collection("magic_links").doc(token);
        batch.set(magicLinkRef, {
            phone: contactClean,
            status: "pending",
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
        });

        // Génération d'un code OTP de secours (4 chiffres)
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        batch.set(otpRef, {
            code,
            expireAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
            type: "whatsapp",
            count: FieldValue.increment(1)
        }, { merge: true });

        await batch.commit();

        // Envoi via WhatsApp
        const domain = process.env.NEXT_PUBLIC_BASE_URL || "https://audiencetype.com";
        const verifyUrl = `${domain}/verify?token=${token}`;
        
        const message = `✨ *CONNEXION SANS MOT DE PASSE*\n\nClique sur le lien ci-dessous pour te connecter automatiquement sur ton ordinateur :\n\n🔗 ${verifyUrl}\n\nNou jenere yon kòd OTP pou ou tou si w vle konekte sou yon òdinatè oswa si lyen an pa mache :\n🔑 *${code}*\n\n⏳ _Ce lien expire dans 10 minutes._`;
        
        await sendWhatsAppMessage(contactClean, message);
        console.log(`🔗 [WhatsApp] Magic Link et OTP (${code}) envoyés à ${contactClean} : ${verifyUrl}`);

        return { success: true, token };
    } catch (error: any) {
        console.error("Error in generateMagicLinkAction:", error);
        return { error: "Erreur lors de la génération du lien magique." };
    }
}

/**
 * Vérifie un Magic Link cliqué depuis le téléphone et connecte l'utilisateur.
 * Appelé par la page /verify?token=...
 */
export async function verifyMagicLinkAction(token: string) {
    if (!token) return { error: "Token manquant." };

    try {
        const adminDb = getAdminDb();
        const magicLinkRef = adminDb.collection("magic_links").doc(token);
        
        const docSnap = await magicLinkRef.get();
        if (!docSnap.exists) {
            return { error: "Ce lien est invalide ou n'existe pas." };
        }

        const data = docSnap.data();
        if (data?.status !== "pending") {
            return { error: "Ce lien a déjà été utilisé ou est expiré." };
        }

        const now = Timestamp.now();
        if (data.expiresAt.toMillis() < now.toMillis()) {
            await magicLinkRef.update({ status: "expired" });
            return { error: "Ce lien a expiré." };
        }

        const contactClean = data.phone;

        // On cherche ou on crée l'utilisateur comme dans verifyOtp
        const usersRef = adminDb.collection("users");
        const querySnapshot = await usersRef.where("phone", "==", contactClean).get();
        const adminAuth = getAdminAuth();
        let userId = "";

        if (!querySnapshot.empty) {
            userId = querySnapshot.docs[0].id;
            console.log(`👤 [verifyMagicLinkAction] Utilisateur existant trouvé : ${userId}`);
        } else {
            // Création de l'utilisateur
            try {
                const authUser = await adminAuth.createUser({
                    phoneNumber: contactClean,
                    displayName: "Client",
                });
                userId = authUser.uid;
            } catch (authErr: any) {
                console.warn("⚠️ [verifyMagicLinkAction] Erreur Auth création:", authErr.message);
                try {
                    const existingAuthUser = await adminAuth.getUserByPhoneNumber(contactClean);
                    userId = existingAuthUser.uid;
                } catch {
                    userId = `usr_${uuidv4().substring(0, 13).replace(/-/g, '')}`;
                }
            }

            const newUserDoc = {
                uid: userId,
                phone: contactClean,
                name: "Client",
                role: "customer",
                createdAt: FieldValue.serverTimestamp(),
                status: "active",
                enrollmentCount: 0
            };
            await usersRef.doc(userId).set(newUserDoc);
        }

        // On génère le Custom Token (qui servira au PC pour se connecter silencieusement)
        const customToken = await adminAuth.createCustomToken(userId);

        // On met à jour le token pour marquer comme utilisé ET stocker le customToken pour le PC
        await magicLinkRef.update({ 
            status: "used",
            customToken: customToken
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error in verifyMagicLinkAction:", error);
        return { error: "Une erreur est survenue lors de la vérification du lien." };
    }
}

/**
 * Envoie un SMS de vérification via Prelude pour lier un numéro de téléphone à un utilisateur.
 */
export async function sendPreludeVerificationAction(userId: string, fullPhone: string) {
    if (!userId || !fullPhone) {
        return { error: "Paramètres manquants." };
    }

    try {
        const adminDb = getAdminDb();
        const contactClean = fullPhone.replace(/^whatsapp:/i, '').trim();

        // 1. Vérifier si le numéro n'est pas déjà associé à un autre utilisateur
        const usersRef = adminDb.collection("users");
        const dupPhoneQuery = await usersRef.where("phone", "==", contactClean).get();
        const dupPhoneNumQuery = await usersRef.where("phoneNumber", "==", contactClean).get();

        const duplicate =
            dupPhoneQuery.docs.find(d => d.id !== userId) ||
            dupPhoneNumQuery.docs.find(d => d.id !== userId);

        if (duplicate) {
            return { error: "Nimewo sa a deja itilize pa yon lòt kont." };
        }

        // 2. Envoyer la demande de vérification via Prelude API
        const preludeApiKey = process.env.PRELUDE_API_KEY;
        if (!preludeApiKey) {
            console.error("PRELUDE_API_KEY is missing from environment variables.");
            return { error: "Erreur: Konfigirasyon Prelude la pa kòrèk sou sèvè a." };
        }

        const response = await fetch("https://api.prelude.dev/v2/verification", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${preludeApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                target: {
                    type: "phone_number",
                    value: contactClean
                },
                options: {
                    preferred_channel: "sms"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ [Prelude API Error] Status:", response.status, "Body:", errorText);
            return { error: `Erè nan voye SMS la. (API Error: ${response.status}).` };
        }

        const resData = await response.json();
        if (resData.status === "success" || resData.status === "retry") {
            return { success: true };
        } else {
            return { error: `Erè nan voye SMS la (Status: ${resData.status}).` };
        }
    } catch (error: any) {
        console.error("Error in sendPreludeVerificationAction:", error);
        return { error: error.message || "Erreur lors de l'envoi du SMS." };
    }
}

/**
 * Vérifie le code de vérification SMS Prelude et lie le numéro au compte utilisateur.
 */
export async function verifyPreludeAndLinkPhoneAction(userId: string, fullPhone: string, code: string) {
    if (!userId || !fullPhone || !code) {
        return { error: "Paramètres manquants." };
    }

    try {
        const adminDb = getAdminDb();
        const contactClean = fullPhone.replace(/^whatsapp:/i, '').trim();

        // 1. Appeler l'API Prelude pour valider le code
        const preludeApiKey = process.env.PRELUDE_API_KEY;
        if (!preludeApiKey) {
            console.error("PRELUDE_API_KEY is missing from environment variables.");
            return { error: "Erreur: Konfigirasyon Prelude la pa kòrèk sou sèvè a." };
        }

        const response = await fetch("https://api.prelude.dev/v2/verification/check", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${preludeApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                target: {
                    type: "phone_number",
                    value: contactClean
                },
                code: code.trim()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ [Prelude Check Error] Status:", response.status, "Body:", errorText);
            return { error: "Kòd la ekspire oswa li pa korèk." };
        }

        const resData = await response.json();
        if (resData.status !== "success") {
            return { error: "Kòd la ekspire oswa li pa korèk." };
        }

        // 2. Vérifier à nouveau si le numéro n'a pas été associé entre-temps à un autre utilisateur
        const usersRef = adminDb.collection("users");
        const dupPhoneQuery = await usersRef.where("phone", "==", contactClean).get();
        const dupPhoneNumQuery = await usersRef.where("phoneNumber", "==", contactClean).get();

        const duplicate =
            dupPhoneQuery.docs.find(d => d.id !== userId) ||
            dupPhoneNumQuery.docs.find(d => d.id !== userId);

        if (duplicate) {
            return { error: "Nimewo sa a deja itilize pa yon lòt kont." };
        }

        // 3. Mettre à jour l'utilisateur dans Firestore
        const userRef = usersRef.doc(userId);
        await userRef.update({
            phone: contactClean,
            phoneNumber: contactClean
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error in verifyPreludeAndLinkPhoneAction:", error);
        return { error: error.message || "Erreur de serveur lors de la validation." };
    }
}


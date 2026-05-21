"use server";

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendSmsMessage, formatMessageTemplate } from "@/lib/whatsapp";

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
            const cleanNum = phone.trim();
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
export async function generateOtpAction(contact: string, type: 'phone' | 'email') {
    if (!contact) {
        return { error: "Contact manquant" };
    }

    try {
        const adminDb = getAdminDb();
        const contactClean = type === 'email' ? contact.trim().toLowerCase() : contact.trim();
        const otpRef = adminDb.collection("otp_code").doc(contactClean);
        
        const otpDoc = await otpRef.get();
        const now = new Date();
        const maxLimit = type === 'email' ? 10 : 4;

        let currentCount = 0;
        let isBlocked = false;

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
        if (type === 'phone') {
            const authTemplate = process.env.TWILIO_TEMPLATE_AUTH || 
                "🔑 *VÉRIFICATION DJR AKADEMI*\n\nVoici ton code de vérification pour accéder à la plateforme : {{code}}\n\nNe partage jamais ce code.";
            
            const message = formatMessageTemplate(authTemplate, { code, link: "audiencetype.com", userName: "Client" });
            await sendSmsMessage(contactClean, message);
            console.log(`📩 [SMS] Code de vérification envoyé à ${contactClean}`);
        } else if (type === 'email') {
            const sendgridKey = process.env.SENDGRID_API_KEY;
            const fromEmail = process.env.SENDGRID_FROM_EMAIL || "contact@audiencetype.com";

            if (!sendgridKey) {
                console.error("❌ SENDGRID_API_KEY manquante !");
                return { error: "Erreur de configuration email." };
            }

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
                    template_id: "d-ab881aa9ea704bdda1f3d0736485af12"
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
        
        return { error: "Impossible de vous envoyer le code pour le moment. Veuillez vérifier vos informations ou réessayer plus tard." };
    }
}

/**
 * Vérifie le code de manière stricte dans la collection `otp_code`.
 * Si valide : vérifie ou crée l'utilisateur dans `users` et génère un token Firebase Auth.
 */
export async function verifyOtpAndLoginAction(contact: string, code: string, type: 'phone' | 'email') {
    if (!contact || !code) {
        return { error: "Contact ou code manquant" };
    }

    try {
        const adminDb = getAdminDb();
        const contactClean = type === 'email' ? contact.trim().toLowerCase() : contact.trim();
        const otpRef = adminDb.collection("otp_code").doc(contactClean);

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
            let userPhone = type === 'phone' ? contactClean : undefined;
            const userName = type === 'email' ? contactClean.split('@')[0] : "Client";

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
        await otpRef.update({ userId: userId });

        // Génération du Custom Token sécurisé
        const customToken = await adminAuth.createCustomToken(userId);

        return { success: true, customToken };
    } catch (error: any) {
        console.error("Error in verifyOtpAndLoginAction:", error);
        return { error: "Erreur lors de la vérification du code" };
    }
}

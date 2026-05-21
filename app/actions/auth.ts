"use server";

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { sendSmsMessage, formatMessageTemplate } from "@/lib/whatsapp";

/**
 * Vérifie si un utilisateur existe par numéro de téléphone.
 * Si targetProductId est fourni, vérifie également s'il possède ce produit.
 */
export async function checkUserAction(phone: string, targetProductId?: string) {
    if (!phone) {
        return { error: "Numéro de téléphone requis" };
    }

    try {
        const adminDb = getAdminDb();
        const usersRef = adminDb.collection("users");
        const cleanNum = phone.trim();

        const querySnapshot = await usersRef.where("phone", "==", cleanNum).get();

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

        // Vérifier si l'utilisateur possède déjà le cours dans la collection enrollments
        const enrollmentsRef = adminDb.collection("enrollments");

        // Requête 1: userId en tant que string
        const snapString = await enrollmentsRef.where("userId", "==", userId).get();

        // Requête 2: userId en tant que DocumentReference
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
 * Enregistre un utilisateur s'il n'existe pas, ou retourne l'existant.
 */
export async function registerOrFindUserAction(phone: string) {
    if (!phone) {
        return { error: "Numéro de téléphone requis" };
    }

    try {
        const adminDb = getAdminDb();
        const usersRef = adminDb.collection("users");
        const cleanNum = phone.trim();

        const querySnapshot = await usersRef.where("phone", "==", cleanNum).get();

        let userId = "";
        let exists = false;

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userId = userDoc.id;
            exists = true;
            console.log(`👤 [registerOrFindUserAction] Utilisateur existant trouvé : ${userId}`);
        } else {
            const adminAuth = getAdminAuth();
            let newUserId = "";
            const userPhone = cleanNum;
            const userName = "Client";

            try {
                // Créer l'utilisateur dans Firebase Auth
                const authUser = await adminAuth.createUser({
                    phoneNumber: userPhone,
                    displayName: userName,
                });
                newUserId = authUser.uid;
                console.log("👤 [registerOrFindUserAction] Utilisateur créé dans Firebase Auth:", newUserId);
            } catch (authErr: any) {
                console.warn("⚠️ [registerOrFindUserAction] Erreur création Firebase Auth, tentative de récupération...", authErr.message);
                try {
                    const existingAuthUser = await adminAuth.getUserByPhoneNumber(userPhone);
                    newUserId = existingAuthUser.uid;
                } catch {
                    newUserId = `usr_${Math.random().toString(36).substring(2, 15)}`;
                }
            }

            const newUserDoc = {
                uid: newUserId,
                email: "",
                phone: userPhone,
                name: userName,
                role: "customer",
                MAGIC_LINK_CLICK: uuidv4().replace(/-/g, ''),
                createdAt: FieldValue.serverTimestamp(),
                status: "active",
                enrollmentCount: 0,
                tempLinksCount: 0
            };

            await usersRef.doc(newUserId).set(newUserDoc);
            userId = newUserId;
            exists = false;
            console.log("👤 [registerOrFindUserAction] Profil utilisateur créé dans Firestore:", newUserId);
        }

        return {
            success: true,
            userId,
            exists
        };
    } catch (error: any) {
        console.error("Error in registerOrFindUserAction:", error);
        return { error: "Erreur lors de la recherche ou de la création de l'utilisateur" };
    }
}

/**
 * Génère un code temporaire anonyme à 4 chiffres et l'envoie par SMS via Twilio.
 */
export async function generateTempLinkAction(userId: string, phone: string) {
    if (!userId || !phone) {
        return { error: "Paramètres manquants" };
    }

    try {
        const adminDb = getAdminDb();
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return { error: "Utilisateur non trouvé" };
        }

        const finalPhone = phone.trim();
        const now = new Date();
        const userData = userDoc.data() || {};

        // 1. Cooldown de 60 secondes
        const lastSent = userData.otpLastSentAt?.toDate();
        if (lastSent && (now.getTime() - lastSent.getTime() < 60 * 1000)) {
            return { error: "Veuillez patienter 60 secondes entre chaque demande de code." };
        }

        // 2. Limite par 24h (max 3)
        const firstRequest = userData.otpFirstRequestAt?.toDate();
        let otpCount = userData.otpCount24h || 0;
        let resetWindow = false;

        if (!firstRequest || (now.getTime() - firstRequest.getTime() > 24 * 60 * 60 * 1000)) {
            resetWindow = true;
            otpCount = 0;
        }

        const maxLimit = 3;
        if (otpCount >= maxLimit) {
            return {
                error: `Trop de tentatives de connexion par SMS (Limite de ${maxLimit}/24h dépassée).`,
                isBlocked: true
            };
        }

        // Mettre à jour les compteurs
        const updateData: any = {
            otpLastSentAt: Timestamp.fromDate(now),
            otpCount24h: otpCount + 1
        };
        if (resetWindow) {
            updateData.otpFirstRequestAt = Timestamp.fromDate(now);
        }
        await userRef.update(updateData);

        // 3. Générer le token UUID et un code à 4 chiffres
        const token = uuidv4();
        const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 chiffres

        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);

        const tempLinkData = {
            userId: userId,
            code: code,
            expiresAt: Timestamp.fromDate(expiresAt),
            used: false,
            createdAt: Timestamp.now()
        };

        // 4. Sauvegarder dans temp_links
        await adminDb.collection("temp_links").doc(token).set(tempLinkData);

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://audiencetype.com";
        const link = `${baseUrl}/login/temp?token=${token}`;

        const authTemplate = process.env.TWILIO_TEMPLATE_AUTH || 
            "🔑 *VÉRIFICATION DJR AKADEMI*\n\nVoici ton code de vérification pour accéder à ton cours : {{code}}\n\nTu peux également te connecter directement en cliquant sur ce lien sécurisé : {{link}}\n\nNe partage jamais ce code.";

        const userName = userData.name || "Client";
        const message = formatMessageTemplate(authTemplate, { code, link, userName });

        await sendSmsMessage(finalPhone, message);
        console.log(`📩 [SMS] Code de vérification envoyé à ${finalPhone}`);

        return { success: true, userId };
    } catch (error: any) {
        console.error("Error in generateTempLinkAction:", error);
        return { error: "Erreur lors de la génération du code: " + error.message };
    }
}

/**
 * Vérifie un code à 4 chiffres et renvoie le token pour la connexion.
 */
export async function verifyTempLinkCodeAction(userId: string, code: string) {
    if (!code) {
        return { error: "Code manquant" };
    }

    try {
        const adminDb = getAdminDb();
        const tempLinksRef = adminDb.collection("temp_links");

        let query = tempLinksRef
            .where("code", "==", code.trim())
            .where("used", "==", false);

        if (userId) {
            query = query.where("userId", "==", userId);
        }

        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            return { error: "Le code saisi est incorrect ou a expiré." };
        }

        const activeDocs = querySnapshot.docs.filter(doc => {
            const data = doc.data();
            if (!data.expiresAt) return false;
            return data.expiresAt.toDate() > new Date();
        });

        if (activeDocs.length === 0) {
            return { error: "Le code saisi est incorrect ou a expiré." };
        }

        activeDocs.sort((a, b) => {
            const aTime = a.data().createdAt?.toDate().getTime() || 0;
            const bTime = b.data().createdAt?.toDate().getTime() || 0;
            return bTime - aTime;
        });

        const doc = activeDocs[0];
        const token = doc.id;

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://audiencetype.com";
        const link = `${baseUrl}/login/temp?token=${token}`;

        console.log(`✅ [verifyTempLinkCodeAction] Code correct. Accès accordé !`);

        return {
            success: true,
            link,
            token
        };
    } catch (error: any) {
        console.error("Error in verifyTempLinkCodeAction:", error);
        return { error: "Erreur lors de la vérification du code" };
    }
}

/**
 * Valide le token, le marque comme utilisé et génère le Firebase Custom Token.
 */
export async function verifyTempLinkTokenAction(token: string) {
    if (!token) {
        return { error: "Token manquant" };
    }

    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        const linkDoc = await adminDb.collection("temp_links").doc(token).get();
        if (!linkDoc.exists) {
            return { error: "Lien invalide ou expiré" };
        }

        const linkData = linkDoc.data();
        if (!linkData) {
            return { error: "Données invalides" };
        }

        const now = Timestamp.now();
        if (linkData.used) {
            return { error: "Ce lien a déjà été utilisé" };
        }

        if (now.toMillis() > linkData.expiresAt.toMillis()) {
            return { error: "Ce lien a expiré" };
        }

        await adminDb.collection("temp_links").doc(token).update({
            used: true
        });

        const customToken = await adminAuth.createCustomToken(linkData.userId);

        return { success: true, customToken };
    } catch (error: any) {
        console.error("Error in verifyTempLinkTokenAction:", error);
        return { error: "Erreur de vérification" };
    }
}

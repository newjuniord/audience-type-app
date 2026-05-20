import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
    try {
        const { email, whatsappNumber, contactMethod, channel } = await req.json();

        if (contactMethod === 'email' && !email) {
            return NextResponse.json({ error: "Email manquant" }, { status: 400 });
        }
        if (contactMethod === 'phone' && !whatsappNumber) {
            return NextResponse.json({ error: "Numéro de téléphone manquant" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const usersRef = adminDb.collection("users");
        let querySnapshot;

        // 1. Rechercher si l'utilisateur existe déjà
        if (contactMethod === 'email') {
            querySnapshot = await usersRef.where("email", "==", email.trim().toLowerCase()).get();
        } else {
            const cleanNum = whatsappNumber.trim();
            const [snapWhatsapp, snapSms] = await Promise.all([
                usersRef.where("whatsappNumber", "==", cleanNum).get(),
                usersRef.where("smsNumber", "==", cleanNum).get()
            ]);
            const docs = [...snapWhatsapp.docs, ...snapSms.docs];
            querySnapshot = { empty: docs.length === 0, docs };
        }

        let userId = "";
        let exists = false;

        if (!querySnapshot.empty) {
            // L'utilisateur existe déjà !
            const userDoc = querySnapshot.docs[0];
            userId = userDoc.id;
            exists = true;
            console.log(`👤 [REGISTER-OR-FIND] Utilisateur existant trouvé : ${userId}`);
        } else {
            // L'utilisateur n'existe pas ! On le crée
            const adminAuth = getAdminAuth();
            let newUserId = "";
            const userEmail = email ? email.trim().toLowerCase() : `${whatsappNumber}@audiencetype.com`;
            const userName = email ? email.split('@')[0] : "Client";

            try {
                // Créer l'utilisateur dans Firebase Auth
                const authUser = await adminAuth.createUser({
                    email: userEmail,
                    phoneNumber: whatsappNumber || undefined,
                    displayName: userName,
                });
                newUserId = authUser.uid;
                console.log("👤 [REGISTER-OR-FIND] Utilisateur créé dans Firebase Authentication:", newUserId);
            } catch (authErr: any) {
                console.warn("⚠️ [REGISTER-OR-FIND] Erreur création Firebase Auth, tentative de récupération...", authErr.message);
                try {
                    const existingAuthUser = await adminAuth.getUserByEmail(userEmail);
                    newUserId = existingAuthUser.uid;
                } catch {
                    try {
                        if (whatsappNumber) {
                            const existingAuthUser = await adminAuth.getUserByPhoneNumber(whatsappNumber);
                            newUserId = existingAuthUser.uid;
                        } else {
                            throw authErr;
                        }
                    } catch {
                        newUserId = `usr_${Math.random().toString(36).substring(2, 15)}`;
                    }
                }
            }

            const isSms = channel === 'sms';
            const newUserDoc = {
                uid: newUserId,
                email: userEmail,
                phoneNumber: whatsappNumber || "",
                whatsappNumber: isSms ? "" : (whatsappNumber || ""),
                smsNumber: isSms ? (whatsappNumber || "") : "",
                name: userName,
                role: "customer",
                createdAt: FieldValue.serverTimestamp(),
                status: "active",
                enrollmentCount: 0,
                tempLinksCount: 0
            };

            await usersRef.doc(newUserId).set(newUserDoc);
            userId = newUserId;
            exists = false;
            console.log("👤 [REGISTER-OR-FIND] Profil utilisateur créé dans Firestore:", newUserId);
        }

        return NextResponse.json({
            success: true,
            userId,
            exists
        });

    } catch (error: any) {
        console.error("Error in register-or-find API:", error);
        return NextResponse.json({ error: "Erreur lors de la recherche ou création de l'utilisateur" }, { status: 500 });
    }
}

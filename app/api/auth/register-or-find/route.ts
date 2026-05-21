import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
    try {
        const { email, phone, contactMethod } = await req.json();

        if (contactMethod === 'email' && !email) {
            return NextResponse.json({ error: "Email manquant" }, { status: 400 });
        }
        if (contactMethod === 'phone' && !phone) {
            return NextResponse.json({ error: "Numéro de téléphone manquant" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const usersRef = adminDb.collection("users");
        let querySnapshot;

        // 1. Rechercher si l'utilisateur existe déjà
        if (contactMethod === 'email') {
            querySnapshot = await usersRef.where("email", "==", email.trim().toLowerCase()).get();
        } else {
            const cleanNum = phone.trim();
            querySnapshot = await usersRef.where("phone", "==", cleanNum).get();
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
            const userEmail = email ? email.trim().toLowerCase() : undefined;
            const userPhone = phone ? phone.trim() : undefined;
            const userName = email ? email.split('@')[0] : "Client";

            try {
                // Créer l'utilisateur dans Firebase Auth
                const authUser = await adminAuth.createUser({
                    email: userEmail,
                    phoneNumber: userPhone,
                    displayName: userName,
                });
                newUserId = authUser.uid;
                console.log("👤 [REGISTER-OR-FIND] Utilisateur créé dans Firebase Authentication:", newUserId);
            } catch (authErr: any) {
                console.warn("⚠️ [REGISTER-OR-FIND] Erreur création Firebase Auth, tentative de récupération...", authErr.message);
                try {
                    if (userEmail) {
                        const existingAuthUser = await adminAuth.getUserByEmail(userEmail);
                        newUserId = existingAuthUser.uid;
                    } else if (userPhone) {
                        const existingAuthUser = await adminAuth.getUserByPhoneNumber(userPhone);
                        newUserId = existingAuthUser.uid;
                    } else {
                        throw authErr;
                    }
                } catch {
                    newUserId = `usr_${Math.random().toString(36).substring(2, 15)}`;
                }
            }

            const newUserDoc = {
                uid: newUserId,
                email: userEmail || "",
                phone: userPhone || "",
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

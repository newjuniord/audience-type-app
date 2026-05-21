import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            email,
            phone,
            contactMethod,
            targetProductId,
            productType,
            amount,
            currency,
            headline,
            videoPoster,
            paymentMethod
        } = body;

        if (!targetProductId) {
            return NextResponse.json({ error: "targetProductId manquant" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const usersRef = adminDb.collection("users");
        let querySnapshot;

        // 1. Rechercher si l'utilisateur existe déjà
        if (contactMethod === 'email') {
            querySnapshot = await usersRef.where("email", "==", email.trim().toLowerCase()).get();
        } else {
            querySnapshot = await usersRef.where("phone", "==", phone.trim()).get();
        }

        let userId = "";
        let userEmail = "";
        let userName = "";

        if (!querySnapshot.empty) {
            // L'utilisateur existe déjà !
            const userDoc = querySnapshot.docs[0];
            userId = userDoc.id;
            const userData = userDoc.data();
            userEmail = userData.email || email || "";
            userName = userData.name || "Client";
        } else {
            // L'utilisateur n'existe pas ! On le crée d'abord dans Firebase Authentication pour obtenir l'UID officiel
            const adminAuth = getAdminAuth();
            let newUserId = "";
            const rawEmail = email ? email.trim().toLowerCase() : undefined;
            const rawPhone = phone ? phone.trim() : undefined;
            userName = email ? email.split('@')[0] : "Client";

            try {
                // Essayer de créer l'utilisateur dans Firebase Auth
                const authUser = await adminAuth.createUser({
                    email: rawEmail,
                    phoneNumber: rawPhone,
                    displayName: userName,
                });
                newUserId = authUser.uid;
                console.log("👤 [AUTH] Utilisateur créé dans Firebase Authentication:", newUserId);
            } catch (authErr: any) {
                console.warn("⚠️ [AUTH] Erreur création Firebase Auth, tentative de récupération...", authErr.message);
                try {
                    if (rawEmail) {
                        const existingAuthUser = await adminAuth.getUserByEmail(rawEmail);
                        newUserId = existingAuthUser.uid;
                    } else if (rawPhone) {
                        const existingAuthUser = await adminAuth.getUserByPhoneNumber(rawPhone);
                        newUserId = existingAuthUser.uid;
                    } else {
                        throw authErr;
                    }
                } catch {
                    // Fallback de sécurité
                    newUserId = `usr_${Math.random().toString(36).substring(2, 15)}`;
                }
            }

            const newUserDoc = {
                uid: newUserId,
                email: rawEmail || "",
                phone: rawPhone || "",
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
            userEmail = rawEmail || "";
            console.log("👤 [FIRESTORE] Profil utilisateur créé dans Firestore:", newUserId);
        }

        // 2. Créer l'ordre (order) en attente (pending) de manière sécurisée (Server-side) uniquement pour MonCash (car Lemon Squeezy le fait déjà lui-même)
        let orderId = "";
        if (paymentMethod === 'moncash') {
            const collectionName = productType === 'ebook' ? 'ebooks' : 'courses';
            const productRef = adminDb.collection(collectionName).doc(targetProductId);

            const orderData = {
                userId: userId,
                userEmail: userEmail,
                productId: productRef,
                productThumbnailUrl: videoPoster || "",
                productTitle: headline || "Formation",
                productType: productType || "course",
                transactionId: "", // En attente
                amount: amount || 0,
                currency: currency || "HTG",
                status: "pending",
                paymentMethod: "moncash",
                createdAt: FieldValue.serverTimestamp()
            };

            const orderRef = await adminDb.collection("orders").add(orderData);
            orderId = orderRef.id;
        }

        return NextResponse.json({
            userId,
            userEmail,
            userName,
            orderId
        });

    } catch (error: any) {
        console.error("Error in create-pending checkout API:", error);
        return NextResponse.json({ error: "Erreur lors de l'initialisation de la commande" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const { email, whatsappNumber, targetProductId } = await req.json();

        if (!email && !whatsappNumber) {
            return NextResponse.json({ error: "Email or whatsappNumber required" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const usersRef = adminDb.collection("users");
        let querySnapshot;

        // 1. Rechercher l'utilisateur securely
        if (email) {
            querySnapshot = await usersRef.where("email", "==", email.trim().toLowerCase()).get();
        } else {
            const cleanNum = whatsappNumber.trim();
            const [snapWhatsapp, snapSms] = await Promise.all([
                usersRef.where("whatsappNumber", "==", cleanNum).get(),
                usersRef.where("smsNumber", "==", cleanNum).get()
            ]);
            const docs = [...snapWhatsapp.docs, ...snapSms.docs];
            if (docs.length === 0) {
                return NextResponse.json({ exists: false });
            }
            querySnapshot = { empty: false, docs };
        }

        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userEmail = userData.email || email || `${whatsappNumber}@audiencetype.com`;
        const userName = userData.name || "Client";

        // 2. Si pas de targetProductId, on renvoie juste les infos de l'utilisateur
        if (!targetProductId) {
            return NextResponse.json({
                exists: true,
                ownsCourse: false,
                userId,
                userEmail,
                userName
            });
        }

        // 3. Vérifier si l'utilisateur possède déjà le cours dans la collection enrollments
        const enrollmentsRef = adminDb.collection("enrollments");

        // Requête 1: userId en tant que string
        const snapString = await enrollmentsRef.where("userId", "==", userId).get();

        // Requête 2: userId en tant que DocumentReference
        const userDocRef = usersRef.doc(userId);
        const snapRef = await enrollmentsRef.where("userId", "==", userDocRef).get();

        // Fusionner les inscriptions uniques
        const enrollments: any[] = [];
        const seenIds = new Set<string>();

        [...snapString.docs, ...snapRef.docs].forEach(doc => {
            if (!seenIds.has(doc.id)) {
                seenIds.add(doc.id);
                enrollments.push({ id: doc.id, ...doc.data() });
            }
        });

        // Vérifier si l'un d'eux correspond au targetProductId
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

        return NextResponse.json({
            exists: true,
            ownsCourse: hasAccess,
            userId,
            userEmail,
            userName
        });

    } catch (error: any) {
        console.error("Error in check-user API:", error);
        return NextResponse.json({ error: "Erreur lors de la vérification de l'utilisateur" }, { status: 500 });
    }
}

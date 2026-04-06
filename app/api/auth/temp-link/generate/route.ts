import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        // 1. Vérifier l'utilisateur
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // 2. Vérifier les permissions et le quota dans Firestore
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
        }

        const userData = userDoc.data();
        const count = userData?.tempLinksCount || 0;
        const isBlocked = userData?.canGenerateTempLinks === false; // On garde false pour bloquer un abus éventuel

        if (isBlocked) {
            return NextResponse.json({ error: "Votre accès aux liens temporaires a été suspendu par un administrateur." }, { status: 403 });
        }

        if (count >= 2) {
            return NextResponse.json({ error: "Vous avez atteint la limite de 2 liens générés." }, { status: 400 });
        }

        // 3. Générer le token
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 heures

        const tempLinkData = {
            userId: uid,
            expiresAt: Timestamp.fromDate(expiresAt),
            used: false,
            createdAt: Timestamp.now()
        };

        // 4. Sauvegarder dans Firestore et incrémenter le compteur
        await adminDb.runTransaction(async (transaction) => {
            const userRef = adminDb.collection("users").doc(uid);
            const linkRef = adminDb.collection("temp_links").doc(token);
            
            transaction.set(linkRef, tempLinkData);
            transaction.update(userRef, {
                tempLinksCount: count + 1
            });
        });

        const baseUrl = new URL(req.url).origin;
        const link = `${baseUrl}/login/temp?token=${token}`;

        return NextResponse.json({ link, expiresAt });
    } catch (error: any) {
        console.error("Error generating temp link:", error);
        return NextResponse.json({ error: "Erreur lors de la génération du lien" }, { status: 500 });
    }
}

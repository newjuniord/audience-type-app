import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Token manquant" }, { status: 400 });
        }

        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        // 1. Chercher le token dans Firestore
        const linkDoc = await adminDb.collection("temp_links").doc(token).get();
        if (!linkDoc.exists) {
            return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
        }

        const linkData = linkDoc.data();
        if (!linkData) {
            return NextResponse.json({ error: "Données invalides" }, { status: 500 });
        }

        // 2. Vérifier l'expiration et l'utilisation
        const now = Timestamp.now();
        if (linkData.used) {
            return NextResponse.json({ error: "Ce lien a déjà été utilisé" }, { status: 400 });
        }

        if (now.toMillis() > linkData.expiresAt.toMillis()) {
            return NextResponse.json({ error: "Ce lien a expiré" }, { status: 400 });
        }

        // 3. Marquer comme utilisé
        await adminDb.collection("temp_links").doc(token).update({
            used: true
        });

        // 4. Générer le Custom Auth Token pour le userId
        const customToken = await adminAuth.createCustomToken(linkData.userId);

        return NextResponse.json({ customToken });
    } catch (error: any) {
        console.error("Error verifying temp link:", error);
        return NextResponse.json({ error: "Erreur de vérification" }, { status: 500 });
    }
}

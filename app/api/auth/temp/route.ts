import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const token = body.token;

        if (!token || typeof token !== "string") {
            return NextResponse.json({ error: "Token manquant ou invalide." }, { status: 400 });
        }

        const db = getAdminDb();
        const auth = getAdminAuth();

        const docRef = db.collection("temp_links").doc(token);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "Lien invalide ou introuvable." }, { status: 400 });
        }

        const data = docSnap.data();

        if (data?.used === true) {
            return NextResponse.json({ error: "Ce lien a déjà été utilisé. Veuillez redemander un nouveau lien." }, { status: 400 });
        }

        if (data?.expiresAt && data.expiresAt.toDate().getTime() < Date.now()) {
            return NextResponse.json({ error: "Ce lien a expiré. Veuillez redemander un nouveau lien." }, { status: 400 });
        }

        const userId = data?.userId;
        if (!userId) {
            return NextResponse.json({ error: "Utilisateur introuvable pour ce lien." }, { status: 400 });
        }

        // Generate Custom Token
        const customToken = await auth.createCustomToken(userId);

        // Mark as used
        await docRef.update({
            used: true,
            usedAt: new Date()
        });

        return NextResponse.json({ customToken });

    } catch (error: any) {
        console.error("[TEMP_LOGIN_ERROR]", error);
        return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}

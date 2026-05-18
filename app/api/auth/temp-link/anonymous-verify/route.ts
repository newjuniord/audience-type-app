import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const { userId, code } = await req.json();

        if (!userId || !code) {
            return NextResponse.json({ error: "userId ou code manquant" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const tempLinksRef = adminDb.collection("temp_links");

        // 1. Rechercher un token valide associé à cet utilisateur et à ce code
        const querySnapshot = await tempLinksRef
            .where("userId", "==", userId)
            .where("code", "==", code.trim())
            .where("used", "==", false)
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json({ error: "Le code saisi est incorrect ou a expiré." }, { status: 400 });
        }

        // 2. Récupérer le premier token correspondant
        const doc = querySnapshot.docs[0];
        const token = doc.id;

        const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "audiencetype.com";
        const protocol = host.includes("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}`;
        const link = `${baseUrl}/login/temp?token=${token}`;

        console.log(`✅ [VERIFY] Code correct saisi par l'utilisateur ${userId}. Accès accordé !`);

        return NextResponse.json({
            success: true,
            link
        });

    } catch (error: any) {
        console.error("Error verifying anonymous temp link code:", error);
        return NextResponse.json({ error: "Erreur lors de la vérification du code" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const { userId, code } = await req.json();

        if (!code) {
            return NextResponse.json({ error: "Code manquant" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const tempLinksRef = adminDb.collection("temp_links");

        // 1. Rechercher un token valide associé à ce code
        let query = tempLinksRef
            .where("code", "==", code.trim())
            .where("used", "==", false);

        if (userId) {
            query = query.where("userId", "==", userId);
        }

        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            return NextResponse.json({ error: "Le code saisi est incorrect ou a expiré." }, { status: 400 });
        }

        // Filter by expiration date in-memory
        const activeDocs = querySnapshot.docs.filter(doc => {
            const data = doc.data();
            if (!data.expiresAt) return false;
            return data.expiresAt.toDate() > new Date();
        });

        if (activeDocs.length === 0) {
            return NextResponse.json({ error: "Le code saisi est incorrect ou a expiré." }, { status: 400 });
        }

        // Sort by createdAt descending in-memory to get the most recent one
        activeDocs.sort((a, b) => {
            const aTime = a.data().createdAt?.toDate().getTime() || 0;
            const bTime = b.data().createdAt?.toDate().getTime() || 0;
            return bTime - aTime;
        });

        // 2. Récupérer le premier token correspondant
        const doc = activeDocs[0];
        const token = doc.id;

        const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "audiencetype.com";
        const protocol = host.includes("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}`;
        const link = `${baseUrl}/login/temp?token=${token}`;

        console.log(`✅ [VERIFY] Code correct saisi par l'utilisateur. Accès accordé !`);

        return NextResponse.json({
            success: true,
            link
        });

    } catch (error: any) {
        console.error("Error verifying anonymous temp link code:", error);
        return NextResponse.json({ error: "Erreur lors de la vérification du code" }, { status: 500 });
    }
}

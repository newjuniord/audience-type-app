import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Token manquant" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const usersRef = adminDb.collection("users");
        
        // Trouver l'utilisateur par MAGIC_LINK_CLICK
        const querySnapshot = await usersRef.where("MAGIC_LINK_CLICK", "==", token).limit(1).get();

        if (querySnapshot.empty) {
            return NextResponse.json({ error: "Lien magique invalide ou inexistant" }, { status: 404 });
        }

        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;

        // Générer un Custom Token Firebase Auth pour se connecter sans mot de passe
        const adminAuth = getAdminAuth();
        const customToken = await adminAuth.createCustomToken(userId);

        return NextResponse.json({ success: true, customToken });
    } catch (error: any) {
        console.error("Error in magic-link verification API:", error);
        return NextResponse.json({ error: "Une erreur interne est survenue" }, { status: 500 });
    }
}

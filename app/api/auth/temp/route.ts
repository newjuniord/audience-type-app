import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const token = body.token;

        if (!token || typeof token !== "string") {
            return NextResponse.json({ error: "Token manquant ou invalide." }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/lib/supabase/admin");

        const { data: tempLinkData } = await supabaseAdmin
            .from("temp_links")
            .select("*")
            .eq("id", token)
            .single();

        if (!tempLinkData) {
            return NextResponse.json({ error: "Lien invalide ou introuvable." }, { status: 400 });
        }

        if (tempLinkData.used === true) {
            return NextResponse.json({ error: "Ce lien a déjà été utilisé. Veuillez redemander un nouveau lien." }, { status: 400 });
        }

        if (tempLinkData.expiresAt && new Date(tempLinkData.expiresAt).getTime() < Date.now()) {
            return NextResponse.json({ error: "Ce lien a expiré. Veuillez redemander un nouveau lien." }, { status: 400 });
        }

        const userId = tempLinkData.userId;
        if (!userId) {
            return NextResponse.json({ error: "Utilisateur introuvable pour ce lien." }, { status: 400 });
        }

        // Get user email
        const { data: userData } = await supabaseAdmin
            .from("users")
            .select("email")
            .eq("id", userId)
            .single();

        if (!userData || !userData.email) {
            return NextResponse.json({ error: "Email introuvable pour cet utilisateur." }, { status: 400 });
        }

        // Generate Supabase Magic Link
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: userData.email
        });

        if (linkError || !linkData?.properties?.action_link) {
            console.error("Error generating magic link:", linkError);
            return NextResponse.json({ error: "Impossible de générer le lien de connexion." }, { status: 500 });
        }

        // Mark as used
        await supabaseAdmin.from("temp_links").update({
            used: true,
            usedAt: new Date().toISOString()
        }).eq("id", token);

        // Return the action link so the frontend can redirect the user
        return NextResponse.json({ actionLink: linkData.properties.action_link });

    } catch (error: any) {
        console.error("[TEMP_LOGIN_ERROR]", error);
        return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}

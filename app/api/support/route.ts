import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fullName, email, subject, message } = body;

        if (!fullName || !email || !subject || !message) {
            return NextResponse.json({ error: "Tous les champs sont obligatoires." }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/lib/supabase/admin");

        const { error } = await supabaseAdmin.from("support_messages").insert({
            id: crypto.randomUUID(),
            fullName,
            email,
            subject,
            message,
            createdAt: new Date().toISOString(),
        });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("🔥 [SUPPORT API ERROR]:", error);
        return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
    }
}

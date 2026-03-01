import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fullName, email, subject, message } = body;

        if (!fullName || !email || !subject || !message) {
            return NextResponse.json({ error: "Tous les champs sont obligatoires." }, { status: 400 });
        }

        const adminDb = getAdminDb();

        await adminDb.collection("support_messages").add({
            fullName,
            email,
            subject,
            message,
            createdAt: Timestamp.now(),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("🔥 [SUPPORT API ERROR]:", error);
        return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
    }
}

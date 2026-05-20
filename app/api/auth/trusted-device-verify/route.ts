import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const clientSecret = req.headers.get("x-internal-secret");
        const serverSecret = process.env.FIREBASE_PRIVATE_KEY;
        if (!clientSecret || clientSecret !== serverSecret) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { userId, hashedToken, country } = await req.json();

        if (!userId || !hashedToken) {
            return NextResponse.json({ valid: false });
        }

        const adminDb = getAdminDb();
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ valid: false });
        }

        const userData = userDoc.data();
        const trustedDevice = userData?.trustedDevice;

        if (!trustedDevice) {
            return NextResponse.json({ valid: false });
        }

        // Compare hashed tokens
        if (trustedDevice.hashedToken !== hashedToken) {
            return NextResponse.json({ valid: false });
        }

        // Compare countries (case-insensitive)
        if (trustedDevice.country.toUpperCase() !== country.toUpperCase()) {
            return NextResponse.json({ valid: false });
        }

        // If matched, generate firebase Custom Token
        const adminAuth = getAdminAuth();
        const customToken = await adminAuth.createCustomToken(userId);

        return NextResponse.json({ valid: true, customToken });
    } catch (error: any) {
        console.error("Error in trusted-device-verify API:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

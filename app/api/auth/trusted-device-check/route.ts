import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();
        if (!phone) {
            return NextResponse.json({ valid: false, error: "Numéro requis" });
        }

        const cookieStore = await cookies();
        const trustedDeviceCookie = cookieStore.get("trusted_device")?.value;

        if (!trustedDeviceCookie || !trustedDeviceCookie.includes(":")) {
            return NextResponse.json({ valid: false });
        }

        const [cookieUserId, rawToken] = trustedDeviceCookie.split(":");
        if (!cookieUserId || !rawToken) {
            return NextResponse.json({ valid: false });
        }

        const adminDb = getAdminDb();
        const usersRef = adminDb.collection("users");

        const cleanNum = phone.trim();
        const querySnapshot = await usersRef.where("phone", "==", cleanNum).get();

        if (querySnapshot.empty) {
            return NextResponse.json({ valid: false });
        }

        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Check if cookieUserId matches the retrieved userId
        if (cookieUserId !== userId) {
            return NextResponse.json({ valid: false });
        }

        const trustedDevice = userData?.trustedDevice;
        if (!trustedDevice) {
            return NextResponse.json({ valid: false });
        }

        // Compare hashed tokens
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        if (trustedDevice.hashedToken !== hashedToken) {
            return NextResponse.json({ valid: false });
        }

        // Compare countries (case-insensitive)
        const country = (
            req.headers.get("x-vercel-ip-country") || 
            req.headers.get("cf-ipcountry") || 
            "US"
        ).toUpperCase();

        if (trustedDevice.country.toUpperCase() !== country.toUpperCase()) {
            return NextResponse.json({ valid: false });
        }

        // Generate Custom Auth Token
        const adminAuth = getAdminAuth();
        const customToken = await adminAuth.createCustomToken(userId);

        return NextResponse.json({ valid: true, customToken });
    } catch (error) {
        console.error("Error in trusted-device-check API:", error);
        return NextResponse.json({ valid: false, error: "Server error" });
    }
}

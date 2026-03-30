import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        // 1. Verify the ID token
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const adminUid = decodedToken.uid;

        // 2. Verify the user is actually an admin in the database
        const adminDoc = await adminDb.collection("users").doc(adminUid).get();
        if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
        }

        // 3. Get the target user ID from request body
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // 4. Generate a custom token for the target user
        const customToken = await adminAuth.createCustomToken(userId);

        return NextResponse.json({ customToken });
    } catch (error: any) {
        console.error("Error generating custom token:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

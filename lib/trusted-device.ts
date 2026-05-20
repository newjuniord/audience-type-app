import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

export async function registerTrustedDevice(userId: string, req: Request, response: NextResponse) {
    const adminDb = getAdminDb();

    // Detect country
    const country = (
        req.headers.get("x-vercel-ip-country") || 
        req.headers.get("cf-ipcountry") || 
        "US"
    ).toUpperCase();

    // Extract browser/OS
    const userAgent = req.headers.get("user-agent") || "Navigateur inconnu";
    let deviceName = "Navigateur inconnu";
    if (userAgent) {
        if (userAgent.includes("Chrome")) deviceName = "Chrome";
        else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) deviceName = "Safari";
        else if (userAgent.includes("Firefox")) deviceName = "Firefox";
        else if (userAgent.includes("Edge")) deviceName = "Edge";
        
        if (userAgent.includes("Windows")) deviceName += " sur Windows";
        else if (userAgent.includes("Macintosh")) deviceName += " sur macOS";
        else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) deviceName += " sur iOS";
        else if (userAgent.includes("Android")) deviceName += " sur Android";
        else if (userAgent.includes("Linux")) deviceName += " sur Linux";
    }

    const rawToken = uuidv4() + "-" + uuidv4();
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const deviceId = uuidv4();

    // Format Date
    const now = new Date();
    const formattedDate = now.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }) + " à " + now.toLocaleTimeString("fr-FR") + " UTC";

    // Update user document (using trustedDevice map)
    await adminDb.collection("users").doc(userId).update({
        trustedDevice: {
            country,
            deviceId,
            deviceName,
            hashedToken,
            updatedAt: formattedDate
        }
    });

    const cookieValue = `${userId}:${rawToken}`;
    
    // Set HTTP-Only trusted device cookie
    response.cookies.set("trusted_device", cookieValue, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        secure: true,
        sameSite: "strict"
    });

    // Set client-accessible logged_in status cookie
    response.cookies.set("logged_in", "true", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365 * 10,
        secure: true,
        sameSite: "strict"
    });

    return response;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const path = url.pathname;

    // Skip static assets, API routes, next.js internals and trusted login page
    if (
        path.startsWith('/_next') ||
        path.startsWith('/api') ||
        path.startsWith('/login/trusted') ||
        path.includes('.')
    ) {
        return NextResponse.next();
    }

    const isLoggedIn = req.cookies.has("logged_in");
    const hasTrustedDevice = req.cookies.has("trusted_device");

    if (!isLoggedIn && hasTrustedDevice) {
        const trustedDeviceCookie = req.cookies.get("trusted_device")?.value;
        if (trustedDeviceCookie && trustedDeviceCookie.includes(":")) {
            const [userId, rawToken] = trustedDeviceCookie.split(":");
            
            try {
                // Hash token using native Edge Web Crypto API
                const msgBuffer = new TextEncoder().encode(rawToken);
                const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                // Detect country (Vercel IP country, Cloudflare IP country, or fallback)
                const country = (
                    req.headers.get("x-vercel-ip-country") || 
                    req.headers.get("cf-ipcountry") || 
                    "US"
                ).toUpperCase();

                // Call internal verification API
                const verifyUrl = new URL("/api/auth/trusted-device-verify", req.url);
                const verifyRes = await fetch(verifyUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-internal-secret": process.env.FIREBASE_PRIVATE_KEY || ""
                    },
                    body: JSON.stringify({ userId, hashedToken, country })
                });

                if (verifyRes.ok) {
                    const data = await verifyRes.json();
                    if (data.valid && data.customToken) {
                        // Redirect to the auto-login page
                        const loginUrl = new URL("/login/trusted", req.url);
                        loginUrl.searchParams.set("token", data.customToken);
                        loginUrl.searchParams.set("redirectTo", path + url.search);
                        return NextResponse.redirect(loginUrl);
                    }
                }
            } catch (err) {
                console.error("Middleware trusted device error:", err);
            }
        }
    }

    return NextResponse.next();
}

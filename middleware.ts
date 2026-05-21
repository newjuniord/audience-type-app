import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const path = url.pathname;

    // Skip static assets, API routes, next.js internals and trusted login page
    if (
        path.startsWith('/_next') ||
        path.startsWith('/api') ||
        path.startsWith('/login') ||
        path.startsWith('/icons') ||
        path.startsWith('/sw.js') ||
        path.includes('.')
    ) {
        return NextResponse.next();
    }

    // Éviter les boucles de redirection — si déjà en train de rediriger, on continue
    const redirecting = req.headers.get("x-redirecting");
    if (redirecting) {
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

                // Call internal verification API with timeout pour éviter les blocages sur iOS
                const verifyUrl = new URL("/api/auth/trusted-device-verify", req.url);
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000); // 3s max

                let verifyRes: Response;
                try {
                    verifyRes = await fetch(verifyUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-internal-secret": process.env.FIREBASE_PRIVATE_KEY || "",
                            "x-redirecting": "1" // Marqueur anti-boucle
                        },
                        body: JSON.stringify({ userId, hashedToken, country }),
                        signal: controller.signal,
                    });
                } finally {
                    clearTimeout(timeout);
                }

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
                // Timeout ou erreur réseau — on laisse passer sans bloquer l'utilisateur
                console.error("Middleware trusted device error (ignored on iOS):", err);
            }
        }
    }

    return NextResponse.next();
}

// Limiter le middleware uniquement aux routes protégées
// Évite de s'exécuter sur les pages publiques et assets statiques
export const config = {
    matcher: [
        "/dashboard/:path*",
        "/admin/:path*",
        "/start/:path*",
        "/consultation",
        "/coaching",
        "/services",
        "/products",
    ],
};

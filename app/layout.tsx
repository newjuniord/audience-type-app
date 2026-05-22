import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import ConnectionStatus from "@/components/ConnectionStatus";
import AnnouncementBar from "@/components/AnnouncementBar";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "DJR Akademi | Aprann sèvi ak IA pou w ka sispann razè",
    description: "DJR Akademi fèt pou kreyatè kontni, antreprenè, pwofesyonèl ak lidè ki vle aprann pale pi byen, kreye pi byen, vann pi byen epi bati yon lavi ki gen plis opòtinite.",
    applicationName: "DJR Akademi",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "DJR Akademi",
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        apple: "/icons/icon-192.png",
    },
};

export const viewport: Viewport = {
    themeColor: "#f97316",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr" className="dark" suppressHydrationWarning>
            <head>
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
                />
                <style dangerouslySetInnerHTML={{
                    __html: `
          .notranslate, [class*="material-symbols"] {
            translate: no !important;
          }
        `}} />
                {/* Lemon Squeezy Affiliate Tracking */}
                <script dangerouslySetInnerHTML={{
                    __html: `window.lemonSqueezyAffiliateConfig = { store: "dumerviljeanronald2" };`
                }} />
                <script src="https://lmsqueezy.com/affiliate.js" defer></script>
                {/* Lemon Squeezy Overlay — Paiement sans quitter l'app (PWA) */}
                <script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>
            </head>
            <body
                className={`${inter.className} bg-background-dark text-text-main antialiased transition-colors duration-300`}
                suppressHydrationWarning
            >
                <AuthProvider>
                    <AnnouncementBar />
                    <ConnectionStatus />
                    {children}
                    <BottomNav />
                </AuthProvider>
            </body>
        </html>
    );
}

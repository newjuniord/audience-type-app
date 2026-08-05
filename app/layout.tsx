import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import ConnectionStatus from "@/components/shared/ConnectionStatus";
import AnnouncementBar from "@/components/shared/AnnouncementBar";
import BottomNav from "@/components/buyer/BottomNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
    metadataBase: new URL("https://djrakademi.net"),
    title: {
        default: "DJR Akademi | Aprann sèvi ak IA pou w ka sispann razè",
        template: "%s | DJR Akademi"
    },
    description: "DJR Akademi fèt pou kreyatè kontni, antreprenè, pwofesyonèl ak lidè ki vle aprann pale pi byen, kreye pi byen, vann pi byen epi bati yon lavi ki gen plis opòtinite ak Entèlijans Artifisyèl.",
    keywords: [
        "DJR Akademi",
        "Entèlijans Artifisyèl",
        "AI Course",
        "Kreyasyon Kontni",
        "Prompt Engineering",
        "Formations IA",
        "Jean Ronald Dumervil",
        "Monetizasyon Dijital",
        "E-books IA",
        "Coaching IA"
    ],
    authors: [{ name: "Jean Ronald Dumervil", url: "https://djrakademi.net" }],
    creator: "DJR Akademi",
    publisher: "DJR Akademi",
    applicationName: "DJR Akademi",
    alternates: {
        canonical: "https://djrakademi.net",
    },
    openGraph: {
        type: "website",
        locale: "ht_HT",
        url: "https://djrakademi.net",
        title: "DJR Akademi | Aprann sèvi ak IA pou w ka sispann razè",
        description: "Platfòm fòmasyon an liy sou Entèlijans Artifisyèl, kreyasyon kontni ak devlopman biznis dijital.",
        siteName: "DJR Akademi",
        images: [
            {
                url: "/logo.png",
                width: 1200,
                height: 630,
                alt: "DJR Akademi Logo",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "DJR Akademi | Aprann sèvi ak IA",
        description: "Platfòm fòmasyon an liy sou Entèlijans Artifisyèl ak kreyasyon kontni.",
        images: ["/logo.png"],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "DJR Akademi",
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: "/logo.png",
        shortcut: "/logo.png",
        apple: "/icons/icon-192.png",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
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
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "EducationalOrganization",
                "@id": "https://djrakademi.net/#organization",
                "name": "DJR Akademi",
                "url": "https://djrakademi.net",
                "logo": "https://djrakademi.net/logo.png",
                "description": "Akademi ak platfòm fòmasyon an liy pou Entèlijans Artifisyèl, kreyasyon kontni ak monetizasyon biznis dijital.",
                "founder": {
                    "@type": "Person",
                    "name": "Jean Ronald Dumervil"
                },
                "sameAs": [
                    "https://djrakademi.net"
                ]
            },
            {
                "@type": "WebSite",
                "@id": "https://djrakademi.net/#website",
                "url": "https://djrakademi.net",
                "name": "DJR Akademi",
                "description": "Aprann sèvi ak IA pou w ka sispann razè",
                "publisher": {
                    "@id": "https://djrakademi.net/#organization"
                },
                "inLanguage": ["ht", "fr"]
            },
            {
                "@type": "FAQPage",
                "@id": "https://djrakademi.net/#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": "Ki sa ki DJR Akademi?",
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": "DJR Akademi se yon platfòm fòmasyon ki ede kreyatè ak antreprenè yo sèvi ak Entèlijans Artifisyèl pou bati biznis yo ak ogmante revni yo."
                        }
                    },
                    {
                        "@type": "Question",
                        "name": "Kouman pou m aksede ak fòmasyon mwen achte yo?",
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": "Depi peman an konfime, aksè a debloke otomatikman nan Dashboard ou an liy sou DJR Akademi."
                        }
                    }
                ]
            }
        ]
    };

    return (
        <html lang="ht" className="dark" suppressHydrationWarning>
            <head>
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0"
                />
                <style dangerouslySetInnerHTML={{
                    __html: `
          .notranslate, [class*="material-symbols"] {
            translate: no !important;
          }
        `}} />
                {/* Schema.org JSON-LD Structured Data (SEO / GEO / AEO) */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
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
                    <ToastProvider>
                        <AnnouncementBar />
                        <ConnectionStatus />
                        {children}
                        <BottomNav />
                    </ToastProvider>
                </AuthProvider>
            </body>
        </html>
    );
}

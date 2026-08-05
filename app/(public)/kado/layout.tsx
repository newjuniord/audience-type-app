import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kado Gratis 🎁",
    description: "Telchaje kado ak resous gratis nou yo sou Entèlijans Artifisyèl ak kreyasyon kontni.",
};

export default function KadoLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

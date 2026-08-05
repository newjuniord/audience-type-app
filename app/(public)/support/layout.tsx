import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sipò & Kontak",
    description: "Beswen èd? Kontakte ekip sipò DJR Akademi an pou tout kesyon sou kou, e-books ak sèvis nou yo.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

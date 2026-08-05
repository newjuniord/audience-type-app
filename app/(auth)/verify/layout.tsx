import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Verifikasyon Kont",
    description: "Verifye adrès imèl kont DJR Akademi ou an.",
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

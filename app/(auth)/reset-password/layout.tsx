import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Reyinisyalize Modpas",
    description: "Chanje modpas kont DJR Akademi ou an.",
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

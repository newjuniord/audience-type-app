import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard - Kontni Mwen",
    description: "Aksede ak tout kou ak e-books ou achte yo sou DJR Akademi.",
};

export default function DashboardSubLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

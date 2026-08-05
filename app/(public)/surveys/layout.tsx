import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sondaj",
    description: "Patisipe nan sondaj DJR Akademi yo pou ede nou kreyasyon kontni ak sèvis ki adapte ak bezwen ou.",
};

export default function SurveysLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

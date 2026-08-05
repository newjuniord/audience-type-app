import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Repon Sondaj",
    description: "Patisipe nan sondaj sa a sou DJR Akademi.",
};

export default function SurveyDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

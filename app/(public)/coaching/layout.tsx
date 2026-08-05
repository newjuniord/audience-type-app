import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Coaching & Konsiltasyon",
    description: "Coaching prive ak pèsonalize pou lidè, antreprenè, ak kreyatè kontni sou DJR Akademi.",
};

export default function CoachingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

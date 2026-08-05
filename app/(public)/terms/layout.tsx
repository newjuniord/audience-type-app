import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kondisyon Itilizasyon",
    description: "Kondisyon jeneral ak tèm itilizasyon platfòm DJR Akademi.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

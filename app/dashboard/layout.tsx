"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import InstallBanner from "@/components/InstallBanner";
import SplashTransition from "@/components/SplashTransition";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <p>Chajman...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors">
            <SplashTransition />
            <DashboardHeader />
            <main className="min-h-screen">
                {children}
            </main>
            <DashboardFooter />
            <InstallBanner />
        </div>
    );
}

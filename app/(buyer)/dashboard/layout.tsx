"use client";

import { useAuth } from "@/context/AuthContext";
import DashboardHeader from "@/components/buyer/DashboardHeader";
import DashboardFooter from "@/components/buyer/DashboardFooter";
import InstallBanner from "@/components/shared/InstallBanner";
import SplashTransition from "@/components/shared/SplashTransition";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <p className="text-xs uppercase tracking-widest font-bold text-white/60">Chajman...</p>
                </div>
            </div>
        );
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

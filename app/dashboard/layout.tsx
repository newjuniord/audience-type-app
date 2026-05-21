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
        return null; // loading.tsx gère le skeleton
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

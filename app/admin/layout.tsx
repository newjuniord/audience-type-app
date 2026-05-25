"use client";

import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user || role?.trim().toLowerCase() !== "admin") {
                router.push("/");
            }
        }
    }, [user, role, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark">
                <div className="w-8 h-8 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user || role?.trim().toLowerCase() !== "admin") {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-background-dark text-white font-display">
            <AdminSidebar />
            <div className="flex-1 ml-64 p-10 bg-background-dark min-h-screen border-l border-white/5">
                {children}
            </div>
        </div>
    );
}

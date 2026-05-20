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
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user || role?.trim().toLowerCase() !== "admin") {
        return null;
    }

    return (
        // "light" class forces Tailwind's dark: variants to never apply inside admin
        <div className="light flex min-h-screen bg-white text-gray-900 font-display">
            <AdminSidebar />
            <div className="flex-1 ml-64 p-10 bg-gray-50 min-h-screen border-l border-gray-200">
                {children}
            </div>
        </div>
    );
}

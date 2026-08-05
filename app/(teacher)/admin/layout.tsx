"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        // Force light mode on admin mount by removing dark class
        const htmlElement = document.documentElement;
        htmlElement.classList.remove("dark");

        return () => {
            // Restore dark mode on admin unmount
            htmlElement.classList.add("dark");
        };
    }, []);

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
                <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user || role?.trim().toLowerCase() !== "admin") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Redireksyon...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-white text-gray-900 font-display overflow-x-hidden">
            <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            <div className={`flex-1 p-10 bg-gray-50 min-h-screen border-l border-gray-200 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
                {children}
            </div>
        </div>
    );
}

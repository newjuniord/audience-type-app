"use client";

import { useAuth } from "@/context/AuthContext";

export default function CourseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            {children}
        </>
    );
}

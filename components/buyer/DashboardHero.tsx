"use client";

import { useAuth } from "@/context/AuthContext";

export default function DashboardHero() {
    const { user } = useAuth();

    // Fallback: DisplayName -> Email prefix -> "l'ami"
    const userName = user?.displayName || user?.email?.split('@')[0] || "l'ami";

    return (
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-8 mb-12">
            <div className="flex flex-col gap-3">
                <h1 className="text-primary dark:text-white text-4xl sm:text-5xl font-black leading-tight tracking-[-0.04em]">
                    Bibliyotèk ou
                </h1>
                <p className="text-primary/60 dark:text-white/60 text-lg font-normal max-w-md">
                    <span>Byenveni, </span><span className="font-semibold text-primary/80 dark:text-white/80"><span>{userName}</span></span><span>. Katalòg ou a prè.</span>
                </p>
            </div>
        </div>
    );
}

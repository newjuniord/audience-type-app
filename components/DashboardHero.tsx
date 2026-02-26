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
                    Votre Bibliothèque
                </h1>
                <p className="text-primary/60 dark:text-white/60 text-lg font-normal max-w-md">
                    Bienvenue, <span className="font-semibold text-primary/80 dark:text-white/80">{userName}</span>. Continuez là où vous vous étiez arrêté dans votre collection numérique.
                </p>
            </div>
            <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSeACEIPri1TLyfSepzlfcfmRSmgGUV_j_WIvw3ECUq1TAluyA/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full md:w-auto min-w-[160px] cursor-pointer items-center justify-center gap-2 rounded-full h-12 px-8 bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 hover:scale-105 active:scale-95"
            >
                <span className="material-symbols-outlined text-sm">person_add</span>
                <span className="text-sm font-bold tracking-tight">Demande d'affiliation</span>
            </a>
        </div>
    );
}

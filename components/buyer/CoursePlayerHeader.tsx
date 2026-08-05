"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface CoursePlayerHeaderProps {
    courseTitle?: string;
    progress?: number;
}

export default function CoursePlayerHeader({ courseTitle, progress = 0 }: CoursePlayerHeaderProps) {
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
            <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link className="text-zinc-500 hover:text-primary dark:hover:text-white transition-colors" href="/dashboard">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h2 className="text-sm font-bold tracking-tight uppercase line-clamp-1">{courseTitle || "Chaje..."}</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Pwogrè Jeneral</p>
                        <p className="text-xs font-bold">Fini nan nivo {Math.round(progress)}%</p>
                    </div>
                    {user?.photoURL ? (
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 bg-cover bg-center" style={{ backgroundImage: `url('${user?.photoURL}')` }}></div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-zinc-400">person</span>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

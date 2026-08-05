"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
    {
        href: "/dashboard",
        icon: "grid_view",
        icon_active: "grid_view",
        label: "Kontni",
    },
    {
        href: "/products",
        icon: "storefront",
        icon_active: "storefront",
        label: "Pwodwi",
    },
    {
        href: "/kado",
        icon: "redeem",
        icon_active: "redeem",
        label: "Kado",
        highlight: true,
    },
    {
        href: "/coaching",
        icon: "psychology",
        icon_active: "psychology",
        label: "Coaching",
    },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { user, loading } = useAuth();

    if (loading || !user) return null;
    if (pathname.startsWith("/admin") || pathname.startsWith("/course/") || pathname.startsWith("/login")) return null;

    return (
        <>
            <div className="h-20 md:hidden" />

            <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
                <div className="relative bg-[#0e0e0e]/90 backdrop-blur-xl border-t border-white/[0.06] safe-area-pb">
                    <div className="flex items-center justify-around px-2 py-2">
                        {NAV_ITEMS.map(({ href, icon, label, highlight }) => {
                            const isActive = pathname === href || pathname.startsWith(href + "/");

                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className="flex flex-col items-center gap-1 flex-1 py-1.5 rounded-2xl transition-all duration-200 active:scale-90"
                                >
                                    <div className={`relative flex items-center justify-center w-10 h-8 rounded-2xl transition-all duration-300 ${
                                        isActive
                                            ? highlight
                                                ? "bg-orange-500/15"
                                                : "bg-primary/15"
                                            : ""
                                    }`}>
                                        {isActive && (
                                            <div className={`absolute inset-0 rounded-2xl ${highlight ? "bg-orange-500/20" : "bg-white/10"}`} />
                                        )}

                                        <span
                                            className={`material-symbols-outlined notranslate transition-all duration-300 ${
                                                isActive
                                                    ? highlight
                                                        ? "text-orange-400 text-[22px]"
                                                        : "text-white text-[22px]"
                                                    : "text-white/35 text-[20px]"
                                            }`}
                                            style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                        >
                                            {icon}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-bold tracking-tight transition-colors duration-200 leading-none ${
                                        isActive
                                            ? highlight ? "text-orange-400" : "text-white"
                                            : "text-white/30"
                                    }`}>
                                        {label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </>
    );
}

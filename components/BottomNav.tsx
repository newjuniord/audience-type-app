"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

const NAV_ITEMS = [
    {
        href: "/dashboard",
        icon: "grid_view",
        icon_active: "grid_view",
        label: "Contenu",
    },
    {
        href: "/products",
        icon: "storefront",
        icon_active: "storefront",
        label: "Produits",
    },
    {
        href: "/kado",
        icon: "redeem",
        icon_active: "redeem",
        label: "Kado",
        highlight: true,
    },
    {
        href: "/dashboard/chat",
        icon: "chat",
        icon_active: "chat",
        label: "Chat",
    },
    {
        href: "/consultation",
        icon: "support_agent",
        icon_active: "support_agent",
        label: "Konsiltasyon",
    },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const [hasUnread, setHasUnread] = useState(false);

    // Subscribe to unread messages for student
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "chats", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setHasUnread(!!docSnap.data().unreadByUser);
            } else {
                setHasUnread(false);
            }
        }, (err) => {
            console.error("Error subscribing to chat unread status:", err);
        });
        return () => unsub();
    }, [user]);

    // Only show for authenticated users, on mobile
    if (loading || !user) return null;

    // Hide on admin pages and course player
    if (pathname.startsWith("/admin") || pathname.startsWith("/course/") || pathname.startsWith("/login")) return null;

    return (
        <>
            {/* Spacer to prevent content being hidden behind the nav bar */}
            <div className="h-20 md:hidden" />

            <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
                {/* Glass background */}
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
                                        {/* Active pill indicator */}
                                        {isActive && (
                                            <div className={`absolute inset-0 rounded-2xl ${highlight ? "bg-orange-500/20" : "bg-white/10"}`} />
                                        )}

                                        {/* Unread badge for Chat item */}
                                        {href === "/dashboard/chat" && hasUnread && (
                                            <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse z-10" />
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

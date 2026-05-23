"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import { subscribeToAlerts } from "@/lib/alerts";

export default function DashboardHeader() {
    const { user, userData, loading, role, signOutUser } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Subscribe to unread alerts count
    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToAlerts(user.uid, (alerts) => {
            setUnreadCount(alerts.filter((a) => !a.isRead).length);
        });
        return () => unsub();
    }, [user]);

    if (loading) return null;

    return (
        <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-solid border-primary/10 px-6 md:px-10 lg:px-40 py-4 flex items-center justify-between whitespace-nowrap">
            <div className="flex items-center gap-4 text-primary dark:text-white">
                <Link href="/" className="flex items-center gap-2 md:gap-3 group">
                    <img src="/logo.png" alt="DJR Akademi Logo" className="size-8 md:size-9 rounded-lg object-cover transition-transform group-hover:scale-105" />
                    <h2 className="text-xl font-bold leading-tight tracking-tight">DJR Akademi</h2>
                </Link>
            </div>
            <div className="flex flex-1 justify-end gap-4 md:gap-8 items-center">
                {user && (
                    <nav className="hidden md:flex items-center gap-9">

                        <Link href="/products" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Pwodui
                        </Link>
                        <Link href="/dashboard" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Kontni mwen
                        </Link>
                        <Link href="/consultation" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Konsiltasyon
                        </Link>
                        <Link href="/coaching" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Coaching
                        </Link>
                        <Link href="/services" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Sèvis
                        </Link>
                        <Link href="/dashboard/transactions" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Tranzaksyon
                        </Link>
                        <Link href="/dashboard/profile" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Pwofil
                        </Link>
                    </nav>
                )}

                <div className="flex items-center gap-4">
                    {/* Diagnostic Debug - Visible for admins or when needed */}
                    {user && (
                        <div className="hidden lg:flex flex-col items-end opacity-[0.1] hover:opacity-100 transition-opacity pointer-events-none select-none">
                            <span className="text-[7px] font-mono leading-none">ROLE: {role || 'none'}</span>
                            <span className="text-[7px] font-mono leading-none">UID: {user.uid.slice(0, 6)}...</span>
                        </div>
                    )}
                    {user && role === 'admin' && (
                        <Link href="/admin" className="flex items-center gap-2 bg-primary text-white dark:bg-white dark:text-primary px-4 md:px-5 h-10 rounded-full text-xs font-bold tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg border border-black/5 dark:border-white/10">
                            <span className="material-symbols-outlined text-sm">security</span>
                            <span className="hidden md:inline uppercase">Espas Admin</span>
                        </Link>
                    )}
                    {/* Bell icon — alerts */}
                    {user && (
                        <Link href="/dashboard/alerts" className="relative flex items-center justify-center transition-all focus:outline-none text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white hover:scale-110">
                            <span className="material-symbols-outlined text-[26px]">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-md animate-pulse">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    )}
                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center justify-center transition-all focus:outline-none text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white hover:scale-110"
                            >
                                <span className="material-symbols-outlined text-[28px]">menu</span>
                            </button>

                            {/* Profile Dropdown — Premium Design */}
                            <div
                                className={`absolute right-0 mt-4 w-72 bg-white dark:bg-[#141414] border border-black/5 dark:border-white/[0.07] rounded-3xl shadow-2xl shadow-black/20 transition-all duration-300 transform origin-top-right overflow-hidden ${isDropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                            >
                                {/* Header utilisateur */}
                                <div className="px-5 pt-5 pb-4 border-b border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        {user.photoURL ? (
                                            <div
                                                className="size-11 rounded-2xl bg-cover bg-center border-2 border-primary/20 dark:border-white/10 shadow-md shrink-0"
                                                style={{ backgroundImage: `url("${user.photoURL}")` }}
                                            />
                                        ) : (
                                            <div className="size-11 rounded-2xl bg-primary/10 border-2 border-primary/20 dark:border-white/10 flex items-center justify-center text-primary shadow-md shrink-0">
                                                <span className="material-symbols-outlined text-xl">person</span>
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-black truncate leading-tight">{userData?.displayName || user.displayName || "Client"}</p>
                                            <p className="text-[11px] text-black/40 dark:text-white/40 truncate">{userData?.email || user.email || userData?.phone}</p>
                                        </div>
                                    </div>
                                    {role === 'admin' && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary dark:bg-white text-white dark:text-primary text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                                        >
                                            <span className="material-symbols-outlined text-sm notranslate">shield_person</span>
                                            Espas Administratè
                                        </Link>
                                    )}
                                </div>

                                {/* Navigation principale */}
                                <div className="px-3 py-3 space-y-0.5">
                                    <p className="px-2 text-[9px] font-black uppercase tracking-[0.15em] text-black/30 dark:text-white/30 mb-2">Navigasyon</p>

                                    {[
                                        { href: "/dashboard", icon: "grid_view", label: "Kontni mwen" },
                                        { href: "/products", icon: "storefront", label: "Pwodui" },
                                        { href: "/kado", icon: "redeem", label: "Kado", highlight: true },
                                        { href: "/consultation", icon: "support_agent", label: "Konsiltasyon" },
                                        { href: "/coaching", icon: "psychology", label: "Coaching" },
                                        { href: "/services", icon: "design_services", label: "Sèvis" },
                                    ].map(({ href, icon, label, highlight }) => (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={() => setIsDropdownOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold group ${highlight
                                                    ? "text-orange-500 hover:bg-orange-500/10"
                                                    : "text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined text-base notranslate ${highlight ? "text-orange-500" : "text-black/40 dark:text-white/40 group-hover:text-primary dark:group-hover:text-white"} transition-colors`}>{icon}</span>
                                            {label}
                                            {highlight && <span className="ml-auto text-[9px] font-black uppercase tracking-widest bg-orange-500/15 text-orange-500 px-2 py-0.5 rounded-full">Gratis</span>}
                                        </Link>
                                    ))}
                                </div>

                                {/* Section profil + déconnexion */}
                                <div className="px-3 pb-3 pt-1 border-t border-black/5 dark:border-white/5 space-y-0.5">
                                    <p className="px-2 text-[9px] font-black uppercase tracking-[0.15em] text-black/30 dark:text-white/30 mb-2 pt-2">Kont</p>
                                    <Link
                                        href="/dashboard/transactions"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm font-semibold text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white group"
                                    >
                                        <span className="material-symbols-outlined text-base notranslate text-black/40 dark:text-white/40 group-hover:text-primary dark:group-hover:text-white transition-colors">receipt_long</span>
                                        Tranzaksyon
                                    </Link>
                                    <Link
                                        href="/dashboard/profile"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm font-semibold text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white group"
                                    >
                                        <span className="material-symbols-outlined text-base notranslate text-black/40 dark:text-white/40 group-hover:text-primary dark:group-hover:text-white transition-colors">manage_accounts</span>
                                        Pwofil mwen
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="bg-primary dark:bg-white text-white dark:text-primary px-4 md:px-8 h-10 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px] md:hidden notranslate">login</span>
                            <span className="hidden md:inline">Konekte</span>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}


"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import ConsultationBanner from "@/components/shared/ConsultationBanner";
import LoginModal from "@/components/shared/LoginModal";

export default function DashboardHeader({ defaultAuthModalOpen = false }: { defaultAuthModalOpen?: boolean }) {
    const { user, userData, loading, role, signOutUser } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(defaultAuthModalOpen);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const renderMenuContent = (showClose: boolean = false) => {
        if (!user) return null;
        return (
            <>
                {/* Header utilisateur */}
                <div className="px-5 pt-5 pb-4 border-b border-white/5 relative">
                    {showClose && (
                        <button
                            onClick={() => setIsDropdownOpen(false)}
                            className="absolute top-4 right-4 text-white/40 hover:text-white md:hidden"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        {user?.photoURL ? (
                            <div
                                className="size-11 rounded-2xl bg-cover bg-center border-2 border-white/10 shadow-md shrink-0"
                                style={{ backgroundImage: `url("${user?.photoURL}")` }}                            />
                        ) : (
                            <div className="size-11 rounded-2xl bg-primary/10 border-2 border-white/10 flex items-center justify-center text-primary shadow-md shrink-0">
                                <span className="material-symbols-outlined text-xl">person</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-black truncate leading-tight text-white">{userData?.displayName || user?.displayName || "Client"}</p>
                            <p className="text-[11px] text-white/40 truncate">{userData?.email || user.email || userData?.phone}</p>
                        </div>
                    </div>
                    {role === 'admin' && (
                        <Link
                            href="/admin"
                            onClick={() => setIsDropdownOpen(false)}
                            className="mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white text-primary text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-sm notranslate mr-1.5">shield_person</span>
                            Espas Administratè
                        </Link>
                    )}
                </div>

                {/* Navigation principale */}
                <div className="px-3 py-3 space-y-0.5 overflow-y-auto flex-1">
                    <p className="px-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/30 mb-2">Navigasyon</p>

                    {[
                        { href: "/", icon: "home", label: "Akey" },
                        { href: "/dashboard", icon: "grid_view", label: "Kontni mwen" },
                        { href: "/products", icon: "storefront", label: "Kou & Ebook" },
                        { href: "/kado", icon: "redeem", label: "Kado", highlight: true },
                        { href: "/coaching", icon: "psychology", label: "Coaching & Konsiltasyon" },
                        { href: "/surveys", icon: "poll", label: "Sondaj" },
                    ].filter(item => {
                        if (showClose) {
                            return !["/dashboard", "/products", "/kado", "/consultation"].includes(item.href);
                        }
                        return true;
                    }).map(({ href, icon, label, highlight, badge }: any) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setIsDropdownOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold group ${highlight
                                ? "text-orange-500 hover:bg-orange-500/10"
                                : "text-white/80 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <span className={`material-symbols-outlined text-base notranslate ${highlight ? "text-orange-500" : "text-white/40 group-hover:text-white"} transition-colors`}>{icon}</span>
                            {label}
                            {highlight && <span className="ml-auto text-[9px] font-black uppercase tracking-widest bg-orange-500/15 text-orange-500 px-2 py-0.5 rounded-full">Gratis</span>}
                            {badge && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                        </Link>
                    ))}
                </div>

                {/* Section profil + déconnexion */}
                <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-0.5">
                    <p className="px-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/30 mb-2 pt-2">Kont</p>
                    <Link
                        href="/dashboard/transactions"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm font-semibold text-white/80 hover:text-white group"
                    >
                        <span className="material-symbols-outlined text-base notranslate text-white/40 group-hover:text-white transition-colors">receipt_long</span>
                        Tranzaksyon
                    </Link>
                    <Link
                        href="/dashboard/consultations"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm font-semibold text-white/80 hover:text-white group"
                    >
                        <span className="material-symbols-outlined text-base notranslate text-white/40 group-hover:text-white transition-colors">calendar_month</span>
                        Istwa Konsiltasyon
                    </Link>
                    <Link
                        href="/dashboard/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm font-semibold text-white/80 hover:text-white group"
                    >
                        <span className="material-symbols-outlined text-base notranslate text-white/40 group-hover:text-white transition-colors">manage_accounts</span>
                        Pwofil mwen
                    </Link>
                </div>
            </>
        );
    };

    if (loading) return null;

    return (
        <>
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-solid border-primary/10 px-6 md:px-10 lg:px-20 py-4 flex items-center justify-between whitespace-nowrap">
                {/* Brand Logo */}
                <div className="flex items-center gap-4 text-primary dark:text-white shrink-0">
                    <Link href="/" className="flex items-center gap-2 md:gap-3 group">
                        <img src="/logo.png" alt="DJR Akademi Logo" className="size-8 md:size-9 rounded-lg object-cover transition-transform group-hover:scale-105" />
                        <h2 className="text-xl font-bold leading-tight tracking-tight">DJR Akademi</h2>
                    </Link>
                </div>

                {/* Public Header Links Navigation */}
                <nav className="hidden lg:flex items-center gap-6 xl:gap-8 mx-auto">
                    <Link href="/" className="text-white/80 hover:text-white text-sm font-semibold leading-normal transition-colors">
                        Akey
                    </Link>
                    <Link href="/products" className="text-white/80 hover:text-white text-sm font-semibold leading-normal transition-colors">
                        Kou & Ebook
                    </Link>
                    <Link href="/kado" className="relative text-white/80 hover:text-white text-sm font-semibold leading-normal transition-colors flex items-center gap-1.5">
                        Kado
                        <span className="text-[9px] font-black uppercase tracking-widest bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
                            Gratis
                        </span>
                    </Link>
                    <Link href="/coaching" className="text-white/80 hover:text-white text-sm font-semibold leading-normal transition-colors">
                        Coaching & Konsiltasyon
                    </Link>
                    <Link href="/surveys" className="text-white/80 hover:text-white text-sm font-semibold leading-normal transition-colors flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">poll</span>
                        Sondaj
                    </Link>
                </nav>

                {/* Right Action Controls */}
                <div className="flex items-center gap-4 shrink-0">
                    {user && role === 'admin' && (
                        <Link href="/admin" className="flex items-center gap-2 bg-primary text-white dark:bg-white dark:text-primary px-4 md:px-5 h-10 rounded-full text-xs font-bold tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg border border-black/5 dark:border-white/10">
                            <span className="material-symbols-outlined text-sm">security</span>
                            <span className="hidden md:inline uppercase">Espas Admin</span>
                        </Link>
                    )}



                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center justify-center transition-all focus:outline-none text-white hover:text-white/80 hover:scale-110"
                            >
                                <span className="material-symbols-outlined text-[28px]">menu</span>
                            </button>

                            {/* Desktop Dropdown */}
                            <div
                                className={`
                                    bg-[#141414] border border-solid border-white/[0.07] rounded-3xl shadow-2xl shadow-black/20 transition-all duration-300 transform origin-top-right overflow-hidden hidden md:flex flex-col
                                    absolute right-0 mt-4 w-72 h-auto z-50
                                    ${isDropdownOpen
                                        ? 'opacity-100 scale-100'
                                        : 'opacity-0 scale-95 pointer-events-none'
                                    }
                                `}
                            >
                                {renderMenuContent(false)}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsAuthModalOpen(true)}
                                className="bg-primary text-white hover:bg-primary/90 px-6 md:px-8 h-10 rounded-full text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center"
                            >
                                Konekte
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Consultation Reminder Banner — Below header */}
            <ConsultationBanner />

            {/* Mobile Drawer */}
            {user && (
                <>
                    <div
                        onClick={() => setIsDropdownOpen(false)}
                        className={`
                            fixed inset-0 bottom-20 bg-black/60 backdrop-blur-sm z-[9998] md:hidden transition-all duration-300
                            ${isDropdownOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                        `}
                    />
                    <div
                        className={`
                            bg-[#141414] shadow-2xl transition-all duration-300 transform flex flex-col md:hidden
                            fixed top-0 right-0 bottom-20 w-[300px] z-[9999] border-l border-b border-solid border-white/[0.07] rounded-bl-3xl
                            ${isDropdownOpen ? 'translate-x-0' : 'translate-x-full'}
                        `}
                    >
                        {renderMenuContent(true)}
                    </div>
                </>
            )}

            <LoginModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onSuccess={() => setIsAuthModalOpen(false)}
                productName="DJR Akademi"
            />
        </>
    );
}

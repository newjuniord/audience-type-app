"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect, useRef } from "react";

export default function DashboardHeader() {
    const { user, loading, role } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    if (loading) return null;

    return (
        <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-solid border-primary/10 px-6 md:px-10 lg:px-40 py-4 flex items-center justify-between whitespace-nowrap">
            <div className="flex items-center gap-4 text-primary dark:text-white">
                <Link href="/" className="flex items-center gap-4">
                    <h2 className="text-xl font-bold leading-tight tracking-tight">Audience Type</h2>
                </Link>
            </div>
            <div className="flex flex-1 justify-end gap-4 md:gap-8 items-center">
                {user && (
                    <nav className="hidden md:flex items-center gap-9">

                        <Link href="/products" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Produits
                        </Link>
                        <Link href="/dashboard" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Mon contenu
                        </Link>
                        <Link href="/dashboard/transactions" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Transactions
                        </Link>
                        <Link href="/dashboard/profile" className="text-primary dark:text-white text-sm font-semibold leading-normal hover:text-primary/80 dark:hover:text-white/80 transition-colors">
                            Profil
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
                            <span className="hidden md:inline uppercase">Espace Admin</span>
                        </Link>
                    )}
                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center focus:outline-none"
                            >
                                <div
                                    className="h-10 w-10 rounded-full bg-cover bg-center border border-primary/10 hover:opacity-80 transition-opacity cursor-pointer"
                                    style={{ backgroundImage: `url("${user.photoURL || 'https://lh3.googleusercontent.com/a/default-user'}")` }}
                                >
                                </div>
                            </button>

                            {/* Profile Dropdown */}
                            <div
                                className={`absolute right-0 mt-4 w-64 bg-white dark:bg-background-dark border border-black/5 dark:border-white/5 rounded-3xl shadow-2xl transition-all duration-300 transform origin-top-right ${isDropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                    }`}
                            >
                                <div className="p-4 flex flex-col gap-1">
                                    <p className="text-xs font-bold text-primary/50 dark:text-white/50 uppercase tracking-widest mb-1">
                                        <span>Connecté en tant que</span>
                                    </p>
                                    <p className="text-sm font-black truncate">
                                        <span>{user.displayName || user.email}</span>
                                    </p>
                                    {role === 'admin' && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 hover:bg-primary/10 dark:hover:bg-white/10 transition-colors text-sm font-bold text-primary dark:text-white"
                                        >
                                            <span className="material-symbols-outlined text-lg notranslate">shield_person</span>
                                            Admin Panel
                                        </Link>
                                    )}
                                    <Link
                                        href="/products"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold"
                                    >
                                        <span className="material-symbols-outlined text-lg notranslate">storefront</span>
                                        Produits
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold"
                                    >
                                        <span className="material-symbols-outlined text-lg notranslate">grid_view</span>
                                        Mon contenu
                                    </Link>
                                    <Link
                                        href="/dashboard/transactions"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold"
                                    >
                                        <span className="material-symbols-outlined text-lg notranslate">receipt_long</span>
                                        Transactions
                                    </Link>
                                    <Link
                                        href="/dashboard/profile"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold border-b border-black/5 dark:border-white/5"
                                    >
                                        <span className="material-symbols-outlined text-lg notranslate">person</span>
                                        Profil
                                    </Link>

                                </div>
                            </div>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="bg-primary dark:bg-white text-white dark:text-primary px-8 h-10 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center"
                        >
                            <span>Se connecter</span>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}


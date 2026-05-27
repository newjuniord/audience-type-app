"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface AdminSidebarProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export default function AdminSidebar({ isOpen = true, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();
    const { user, userData } = useAuth();
    const [hasUnreadChats, setHasUnreadChats] = useState(false);

    // Subscribe to unread chat threads for Admin
    useEffect(() => {
        const chatRef = collection(db, "chats");
        const q = query(chatRef, where("unreadByAdmin", "==", true));
        const unsub = onSnapshot(q, (snapshot) => {
            setHasUnreadChats(snapshot.size > 0);
        }, (err) => {
            console.error("Error subscribing to admin unread chats:", err);
        });
        return () => unsub();
    }, []);

    const menuSections = [
        {
            title: "Contenu & Utilisateurs",
            items: [
                { label: "Utilisateurs", icon: "group", href: "/admin/users" },
                { label: "Cours", icon: "school", href: "/admin/courses" },
                { label: "Ebooks", icon: "menu_book", href: "/admin/ebooks" },
                { label: "App Réservations", icon: "calendar_today", href: "/admin/booking-application" },
                { label: "Consultations", icon: "calendar_month", href: "/admin/bookings" },
            ]
        },
        {
            title: "Marketing & Com",
            items: [
                { label: "Cadeaux 🎁", icon: "redeem", href: "/admin/kado" },
                { label: "Annonces", icon: "campaign", href: "/admin/announcement" },
                { label: "Notifications 🔔", icon: "notifications", href: "/admin/alerts" },
                { label: "Avis", icon: "reviews", href: "/admin/reviews" },
                { label: "Messages", icon: "mail", href: "/admin/messages" },
                { label: "Chat Support 💬", icon: "chat", href: "/admin/chat" },
            ]
        },
        {
            title: "Système",
            items: [
                { label: "Transactions", icon: "receipt", href: "/admin/orders" },
                { label: "Stockage", icon: "folder", href: "/admin/storage" },
                { label: "Paramètres", icon: "settings", href: "/admin/settings" },
            ]
        }
    ];

    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    useEffect(() => {
        // Automatically expand the section containing the active menu item
        let activeSectionTitle: string | null = null;
        menuSections.forEach(section => {
            const hasActiveItem = section.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));
            if (hasActiveItem) {
                activeSectionTitle = section.title;
            }
        });
        
        // If no menu item is active, default the first section to open
        if (!activeSectionTitle) {
            const hasAnyActive = menuSections.some(section => 
                section.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))
            );
            if (!hasAnyActive) {
                activeSectionTitle = "Contenu & Utilisateurs";
            }
        }

        setExpandedSection(activeSectionTitle);
    }, [pathname]);

    const toggleSection = (title: string) => {
        setExpandedSection(prev => (prev === title ? null : title));
    };

    return (
        <aside className={`w-64 border-r border-black/5 dark:border-white/10 bg-white dark:bg-background-dark flex flex-col fixed h-full z-50 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
            {/* Collapse Toggle Button */}
            {onToggle && (
                <button
                    onClick={onToggle}
                    className={`absolute top-8 w-8 h-8 rounded-full bg-white dark:bg-background-dark border border-black/5 dark:border-white/10 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all z-50 ${isOpen ? "-right-4" : "-right-8"}`}
                >
                    <span className="material-symbols-outlined text-sm text-black/50 dark:text-white/50">
                        {isOpen ? "chevron_left" : "chevron_right"}
                    </span>
                </button>
            )}
            <div className="p-8 flex items-center gap-3">
                <Link href="/" className="text-xl font-black tracking-tighter uppercase transition-opacity hover:opacity-80">DJR Akademi</Link>
            </div>

            <nav className="flex-1 px-4 space-y-4 overflow-y-auto custom-scrollbar pb-10">
                {menuSections.map((section) => {
                    const isExpanded = expandedSection === section.title;
                    return (
                        <div key={section.title} className="space-y-1">
                            <button
                                onClick={() => toggleSection(section.title)}
                                className="w-full flex items-center justify-between px-4 py-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-xl transition-all text-left group"
                            >
                                <span className="text-[10px] font-black text-black/40 dark:text-white/40 uppercase tracking-widest group-hover:text-black/60 dark:group-hover:text-white/60 transition-colors">
                                    {section.title}
                                </span>
                                <span className="material-symbols-outlined text-sm text-black/30 dark:text-white/30 transition-transform duration-300 font-bold">
                                    {isExpanded ? "remove" : "add"}
                                </span>
                            </button>
                            
                            <div 
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                                }`}
                            >
                                <div className="space-y-1 pt-1">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-3 px-4 py-2.5 rounded-full transition-all ${isActive
                                                    ? "bg-primary text-white font-bold shadow-lg shadow-primary/20"
                                                    : "hover:bg-gray-50 dark:hover:bg-white/5 text-black/60 dark:text-white/60 font-medium"
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                                                <span className="text-sm flex-1">{item.label}</span>
                                                {item.href === "/admin/chat" && hasUnreadChats && (
                                                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-black/5 dark:border-white/10">
                <div className="flex items-center gap-3 p-2">
                    <div className="size-10 rounded-full bg-black/10 overflow-hidden relative flex items-center justify-center">
                        {user?.photoURL ? (
                            <img
                                alt="Admin Profile"
                                className="w-full h-full object-cover"
                                src={user.photoURL}
                            />
                        ) : (
                            <span className="material-symbols-outlined text-black/40">person</span>
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold truncate max-w-[120px]">{userData?.displayName || user?.displayName || "Admin User"}</p>
                        <p className="text-[10px] text-black/50 dark:text-white/50 truncate max-w-[120px]">{userData?.email || user?.email || userData?.phone}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

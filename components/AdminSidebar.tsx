"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function AdminSidebar() {
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
                { label: "Users", icon: "group", href: "/admin" },
                { label: "Courses", icon: "school", href: "/admin/courses" },
                { label: "Ebooks", icon: "menu_book", href: "/admin/ebooks" },
                { label: "Booking App", icon: "calendar_today", href: "/admin/booking-application" },
                { label: "Consultations", icon: "calendar_month", href: "/admin/bookings" },
            ]
        },
        {
            title: "Marketing & Com",
            items: [
                { label: "Funnels", icon: "filter_alt", href: "/admin/funnels" },
                { label: "Kado 🎁", icon: "redeem", href: "/admin/kado" },
                { label: "Announcement", icon: "campaign", href: "/admin/announcement" },
                { label: "Notifikasyon 🔔", icon: "notifications", href: "/admin/alerts" },
                { label: "Reviews", icon: "reviews", href: "/admin/reviews" },
                { label: "Messages", icon: "mail", href: "/admin/messages" },
                { label: "Chat Support 💬", icon: "chat", href: "/admin/chat" },
            ]
        },
        {
            title: "Système",
            items: [
                { label: "Transactions", icon: "receipt", href: "/admin/orders" },
                { label: "Storage", icon: "folder", href: "/admin/storage" },
                { label: "Settings", icon: "settings", href: "/admin/settings" },
            ]
        }
    ];

    return (
        <aside className="w-64 border-r border-black/5 dark:border-white/10 bg-white dark:bg-background-dark flex flex-col fixed h-full z-50">
            <div className="p-8 flex items-center gap-3">
                <Link href="/" className="text-xl font-black tracking-tighter uppercase transition-opacity hover:opacity-80">DJR Akademi</Link>
            </div>

            <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar pb-10">
                {menuSections.map((section) => (
                    <div key={section.title}>
                        <p className="px-4 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-4">{section.title}</p>
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all ${isActive
                                            ? "bg-primary text-white font-bold shadow-lg shadow-primary/20"
                                            : "hover:bg-gray-50 dark:hover:bg-white/5 text-black/60 dark:text-white/60 font-medium"
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                        <span className="text-sm flex-1">{item.label}</span>
                                        {item.href === "/admin/chat" && hasUnreadChats && (
                                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
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

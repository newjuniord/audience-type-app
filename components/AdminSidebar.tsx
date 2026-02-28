"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminSidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const navItems = [
        { label: "Users", icon: "group", href: "/admin" },
        { label: "Courses", icon: "school", href: "/admin/courses" },
        { label: "Ebooks", icon: "menu_book", href: "/admin/ebooks" },
        { label: "Booking Application", icon: "calendar_today", href: "/admin/booking-application" },
        { label: "Bookings", icon: "calendar_today", href: "/admin/bookings" },
        { label: "Messages", icon: "mail", href: "/admin/messages" },
        { label: "Reviews", icon: "reviews", href: "/admin/reviews" },
        { label: "Storage", icon: "folder", href: "/admin/storage" },
    ];

    return (
        <aside className="w-64 border-r border-black/5 dark:border-white/10 bg-white dark:bg-background-dark flex flex-col fixed h-full z-50">
            <div className="p-8 flex items-center gap-3">
                <h1 className="text-xl font-black tracking-tighter uppercase">Audience Type</h1>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                <p className="px-4 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-4">Main Menu</p>

                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all ${isActive
                                ? "bg-gray-100 dark:bg-white/10 text-primary dark:text-white font-bold"
                                : "hover:bg-gray-50 dark:hover:bg-white/5 text-black/60 dark:text-white/60 font-medium"
                                }`}
                        >
                            <span className="material-symbols-outlined text-xl">{item.icon}</span>
                            <span className="text-sm">{item.label}</span>
                        </Link>
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
                        <p className="text-xs font-bold truncate max-w-[120px]">{user?.displayName || "Admin User"}</p>
                        <p className="text-[10px] text-black/50 dark:text-white/50 truncate max-w-[120px]">{user?.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

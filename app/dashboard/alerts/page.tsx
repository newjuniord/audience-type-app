"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchAlerts, markAlertAsRead, markAllAlertsAsRead } from "@/lib/alerts";
import { Alert, AlertCategory } from "@/lib/types";
import Link from "next/link";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function timeAgo(timestamp: any): string {
    if (!timestamp) return "";
    const date = timestamp.toDate ? new Date(timestamp as any) : new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "Kounye a";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function AlertsPage() {
    const { user, loading: authLoading } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<AlertCategory>("utility");
    const [markingAll, setMarkingAll] = useState(false);
    const { permissionStatus, requestPermissionAndGetToken, isSupportedBrowser } = usePushNotifications();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        // Mock data
        const mockAlerts: Alert[] = [
            {
                id: "mock-alert-1",
                userId: "mock-user-123",
                title: "Bienvenue sur Audience Type",
                body: "Merci de nous rejoindre. Votre compte a été configuré avec succès.",
                category: "utility",
                type: "account_security",
                isRead: false,
                icon: "waving_hand",
                iconColor: "text-primary",
                iconBg: "bg-primary/10",
                createdAt: new Date().toISOString(),
                actionLabel: "Voir Profil",
                actionUrl: "/dashboard/profile"
            }
        ];
        setAlerts(mockAlerts);
        setLoading(false);
    }, [user]);

    const handleMarkAll = async () => {
        if (!user) return;
        setMarkingAll(true);
        await markAllAlertsAsRead(user.id);
        setMarkingAll(false);
    };

    const handleRead = async (alert: Alert) => {
        if (!alert.isRead && alert.id) await markAlertAsRead(alert.id);
    };

    const filtered = alerts.filter((a) => a.category === tab);
    const unreadCount = alerts.filter((a) => !a.isRead).length;

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-background-dark flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-dark text-white font-display pb-24">
            {/* Push Notification Request Banner */}
            {isSupportedBrowser && permissionStatus === 'default' && (
                <div className="bg-primary/20 border-b border-primary/30 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">notifications_active</span>
                        <p className="text-sm text-primary-light font-medium">
                            Aktive notifikasyon pou ou pa rate okenn mesaj!
                        </p>
                    </div>
                    <button
                        onClick={requestPermissionAndGetToken}
                        className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/90 transition-colors whitespace-nowrap shadow-md"
                    >
                        Aktive
                    </button>
                </div>
            )}
            
            {/* Hero */}
            <div className="relative overflow-hidden border-b border-white/5 bg-white/[0.02] px-4 sm:px-8 pt-10 pb-8">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(242,140,40,0.07),transparent_60%)] pointer-events-none" />
                <div className="max-w-3xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5 mb-2">
                                <span className="material-symbols-outlined text-primary text-2xl">notifications</span>
                                <h1 className="text-2xl font-black tracking-tight">Notifikasyon</h1>
                                {unreadCount > 0 && (
                                    <span className="bg-primary text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                        {unreadCount} nouvo
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-white/40">Tout mesaj ak alèt pou kont ou.</p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAll}
                                disabled={markingAll}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                            >
                                {markingAll
                                    ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                    : <span className="material-symbols-outlined text-sm">done_all</span>}
                                Tout mak kòm li
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-8 bg-white/5 p-1 rounded-2xl w-fit">
                        {(["utility", "marketing"] as AlertCategory[]).map((t) => {
                            const tabUnread = alerts.filter((a) => a.category === t && !a.isRead).length;
                            const label = t === "utility" ? "Utilitè" : "Pwomosyon";
                            const icon = t === "utility" ? "build_circle" : "campaign";
                            return (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/50 hover:text-white"}`}
                                >
                                    <span className="material-symbols-outlined text-base">{icon}</span>
                                    {label}
                                    {tabUnread > 0 && (
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === t ? "bg-white/20 text-white" : "bg-primary/20 text-primary"}`}>
                                            {tabUnread}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="max-w-3xl mx-auto px-4 sm:px-8 mt-6 space-y-3">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        {/* Animated icon ring */}
                        <div className="relative mb-8">
                            <div className="w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-5xl text-white/10">
                                    {tab === "utility" ? "notifications_off" : "campaign"}
                                </span>
                            </div>
                            {/* Floating decorative dots */}
                            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary/20 border border-primary/30" />
                            <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-white/10" />
                        </div>

                        {tab === "utility" ? (
                            <>
                                <h3 className="text-lg font-black text-white/60 mb-2">Pa gen notifikasyon pou kounye a</h3>
                                <p className="text-sm text-white/30 leading-relaxed max-w-xs">
                                    Lè ou fè yon peman, konekte, oswa gen yon konsiltasyon, ou pral wè yon mesaj isit la.
                                </p>
                                <div className="mt-8 flex flex-col gap-2 w-full max-w-xs">
                                    {[
                                        { icon: "payments", color: "text-emerald-400", bg: "bg-emerald-400/10", text: "Peman réisi" },
                                        { icon: "event", color: "text-orange-400", bg: "bg-orange-400/10", text: "Rapèl konsiltasyon" },
                                        { icon: "shield", color: "text-blue-400", bg: "bg-blue-400/10", text: "Aktivite kont" },
                                    ].map((item) => (
                                        <div key={item.text} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 opacity-40">
                                            <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                                                <span className={`material-symbols-outlined text-base ${item.color}`}>{item.icon}</span>
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="h-2 rounded-full bg-white/20 w-3/4 mb-1.5" />
                                                <div className="h-1.5 rounded-full bg-white/10 w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-6">
                                    Notifikasyon ou yo pral parèt isit la
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-black text-white/60 mb-2">Okenn pwomosyon pou kounye a</h3>
                                <p className="text-sm text-white/30 leading-relaxed max-w-xs">
                                    Siveye espas sa a — nou voye ofèt espesyal, fòmasyon ak kontni gratis isit la.
                                </p>
                                <Link
                                    href="/products"
                                    className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-black hover:bg-primary/20 transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">storefront</span>
                                    Wè tout pwodui yo
                                </Link>
                            </>
                        )}
                    </div>
                ) : (
                    filtered.map((alert) => (
                        <div key={alert.id} onClick={() => handleRead(alert)}
                            className={`group relative flex gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${!alert.isRead ? "bg-primary/5 border-primary/20 hover:bg-primary/10" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"}`}
                        >
                            {!alert.isRead && (
                                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                            )}
                            <div className={`w-11 h-11 rounded-xl ${alert.iconBg} flex items-center justify-center shrink-0`}>
                                <span className={`material-symbols-outlined text-xl ${alert.iconColor}`}>{alert.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm font-black leading-tight ${alert.isRead ? "text-white/70" : "text-white"}`}>{alert.title}</p>
                                    <span className="text-[10px] text-white/30 font-bold whitespace-nowrap shrink-0 mt-0.5">{timeAgo(alert.createdAt)}</span>
                                </div>
                                <p className="text-xs text-white/50 mt-1 leading-relaxed">{alert.body}</p>
                                {alert.actionUrl && alert.actionLabel && (
                                    <Link href={alert.actionUrl} onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-black text-primary hover:text-primary/80 transition-colors uppercase tracking-wide"
                                    >
                                        {alert.actionLabel}
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

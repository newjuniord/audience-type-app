"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getBookingApplicationsByUser } from "@/lib/booking-applications";
import { BookingApplication } from "@/lib/types";
import Link from "next/link";

const MONTHS_HT = [
    "Janvye", "Fevrye", "Mas", "Avril", "Me", "Jen",
    "Jiyè", "Out", "Septanm", "Oktòb", "Novanm", "Desanm"
];

const DAYS_HT = ["Dimanch", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi"];

function getStatusConfig(status: string) {
    switch (status?.toLowerCase()) {
        case "confirmed":
        case "accepted":
            return {
                label: "Konfime",
                icon: "check_circle",
                bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
            };
        case "cancelled":
        case "rejected":
            return {
                label: "Anile",
                icon: "cancel",
                bg: "bg-red-500/10 border-red-500/20 text-red-400",
            };
        default:
            return {
                label: "An atant",
                icon: "hourglass_empty",
                bg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
            };
    }
}

function parseBookingMessage(msg?: string) {
    const result: Record<string, string> = {};
    if (!msg) return result;
    msg.split("\n").forEach((line) => {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
            const key = line.substring(0, colonIdx).trim().toLowerCase();
            const value = line.substring(colonIdx + 1).trim();
            if (key.includes("kategori") || key.includes("catégorie")) result.kategori = value;
            else if (key.includes("sijè") || key.includes("sujet")) result.sujet = value;
            else if (key.includes("kréneau") || key.includes("creneau") || key.includes("kreyo")) result.creneau = value;
        }
    });
    return result;
}

export default function ConsultationsHistoryPage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<BookingApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!user) return;
        const fetchBookings = async () => {
            try {
                const data = await getBookingApplicationsByUser(user.id);
                // Oldest first (chronological order)
                data.sort((a, b) => {
                    const tsA = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
                    const tsB = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
                    return tsA - tsB;
                });
                setBookings(data);
            } catch (err) {
                console.error("Error fetching consultations", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, [user]);

    const filtered = bookings.filter((b) => {
        const q = searchTerm.toLowerCase();
        return (
            (b.serviceName ?? "").toLowerCase().includes(q) ||
            (b.title ?? "").toLowerCase().includes(q) ||
            (b.message ?? "").toLowerCase().includes(q) ||
            (b.status ?? "").toLowerCase().includes(q)
        );
    });

    const confirmedCount = bookings.filter(
        (b) => b.status === "confirmed" || b.status === "accepted"
    ).length;

    const pendingCount = bookings.filter((b) => b.status === "pending").length;

    return (
        <div className="pt-24 pb-28 max-w-[1100px] mx-auto px-4 md:px-8">
            {/* ── Page Header ── */}
            <div className="py-10 border-b border-black/5 dark:border-white/5 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-1.5 text-xs font-bold text-black/40 dark:text-white/40 hover:text-primary dark:hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Dashboard
                        </Link>
                        <span className="text-black/20 dark:text-white/20 text-xs">/</span>
                        <span className="text-xs font-bold text-primary dark:text-white/70 uppercase tracking-widest">Konsiltasyon</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-primary dark:text-white">
                        Istwa Konsiltasyon
                    </h1>
                    <p className="text-black/50 dark:text-white/40 text-sm mt-1">
                        Tout demann konsiltasyon ou yo, nan lòd tan yo te kreye a.
                    </p>
                </div>

                {/* Stats pills */}
                {!loading && bookings.length > 0 && (
                    <div className="flex items-stretch gap-3">
                        <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-black/5 dark:border-white/10 text-center min-w-[80px]">
                            <p className="text-2xl font-black text-primary dark:text-white">{bookings.length}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mt-0.5">Total</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center min-w-[80px]">
                            <p className="text-2xl font-black text-emerald-500">{confirmedCount}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mt-0.5">Konfime</p>
                        </div>
                        {pendingCount > 0 && (
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center min-w-[80px]">
                                <p className="text-2xl font-black text-amber-500">{pendingCount}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mt-0.5">Atant</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-2 mb-8">
                <Link href="/dashboard/transactions" className="px-5 py-2.5 bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white rounded-full text-xs font-bold uppercase tracking-widest transition-colors">
                    Tranzaksyon
                </Link>
                <Link href="/dashboard/consultations" className="px-5 py-2.5 bg-primary text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                    Istwa Konsiltasyon
                </Link>
            </div>

            {/* ── Search ── */}
            {!loading && bookings.length > 0 && (
                <div className="mb-8">
                    <div className="relative max-w-md">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 text-[20px]">search</span>
                        <input
                            className="w-full h-12 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-2xl pl-12 pr-4 text-sm text-primary dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:border-primary/50 dark:focus:border-white/30 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
                            placeholder="Chèche pa sèvis, sijè..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* ── Content ── */}
            {loading ? (
                <div className="space-y-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-5">
                            <div className="w-16 h-20 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse shrink-0" />
                            <div className="flex-1 h-20 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28 text-center gap-5">
                    <div className="size-20 rounded-[2rem] bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-black/20 dark:text-white/20">calendar_month</span>
                    </div>
                    <div>
                        <p className="font-black text-xl text-primary dark:text-white">
                            {searchTerm ? "Okenn rezilta" : "Okenn konsiltasyon"}
                        </p>
                        <p className="text-black/40 dark:text-white/40 text-sm mt-1 max-w-xs mx-auto">
                            {searchTerm
                                ? "Eseye yon lòt mo-kle."
                                : "Ou poko fè okenn demann konsiltasyon. Pran yon randevou jodi a !"}
                        </p>
                    </div>
                    {!searchTerm && (
                        <Link
                            href="/consultation"
                            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-base">add</span>
                            Pran yon randevou
                        </Link>
                    )}
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical timeline connector line */}
                    <div className="absolute left-8 top-2 bottom-2 w-px bg-gradient-to-b from-black/0 via-black/10 to-black/0 dark:from-white/0 dark:via-white/10 dark:to-white/0 hidden md:block" />

                    <ol className="space-y-5">
                        {filtered.map((booking, idx) => {
                            const date = booking.createdAt ? new Date(booking.createdAt as any) : undefined;
                            const day = date ? date.getDate() : "—";
                            const month = date ? MONTHS_HT[date.getMonth()] : "";
                            const year = date ? date.getFullYear() : "";
                            const dayOfWeek = date ? DAYS_HT[date.getDay()] : "";
                            const status = getStatusConfig(booking.status);
                            const parsed = parseBookingMessage(booking.message);
                            const serviceName = booking.serviceName || booking.title || "Konsiltasyon";

                            return (
                                <li key={booking.id ?? idx} className="flex items-start gap-4 md:gap-6 group">

                                    {/* ── Date badge ── */}
                                    <div className="shrink-0 w-16 flex flex-col items-center text-center bg-white dark:bg-black/30 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300">
                                        {/* Month strip (primary color) */}
                                        <div className="w-full bg-primary py-1.5 px-1">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/90 leading-none">
                                                {month}
                                            </span>
                                        </div>
                                        {/* Day number – big */}
                                        <div className="py-2.5 px-1 flex flex-col items-center gap-0.5 w-full">
                                            <span className="text-3xl font-black leading-none text-primary dark:text-white tabular-nums">
                                                {day}
                                            </span>
                                            <span className="text-[8px] font-bold text-black/25 dark:text-white/25 uppercase tracking-wide">
                                                {year}
                                            </span>
                                        </div>
                                    </div>

                                    {/* ── Card ── */}
                                    <div className="flex-1 min-w-0 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden hover:border-black/10 dark:hover:border-white/20 hover:shadow-lg transition-all duration-300 shadow-sm">
                                        {/* Top accent bar */}
                                        <div className={`h-0.5 w-full ${
                                            booking.status === "confirmed" || booking.status === "accepted"
                                                ? "bg-gradient-to-r from-emerald-400 to-green-500"
                                                : booking.status === "cancelled" || booking.status === "rejected"
                                                    ? "bg-gradient-to-r from-red-400 to-rose-500"
                                                    : "bg-gradient-to-r from-amber-400 to-yellow-500"
                                        }`} />

                                        <div className="p-5">
                                            {/* Row 1: Service name + status */}
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-sm text-primary dark:text-white leading-tight truncate">
                                                            {serviceName}
                                                        </p>
                                                        <p className="text-[10px] text-black/40 dark:text-white/40 mt-0.5">
                                                            {dayOfWeek}{date ? `, ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Status badge */}
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide border shrink-0 ${status.bg}`}>
                                                    <span className="material-symbols-outlined text-[12px]">{status.icon}</span>
                                                    {status.label}
                                                </span>
                                            </div>

                                            {/* Row 2: Info chips */}
                                            <div className="flex flex-wrap gap-2 items-center">
                                                {parsed.kategori && (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-black/60 dark:text-white/60 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 px-2.5 py-1 rounded-lg">
                                                        <span className="material-symbols-outlined text-[11px]">label</span>
                                                        {parsed.kategori}
                                                    </span>
                                                )}
                                                {parsed.creneau && (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-black/60 dark:text-white/60 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 px-2.5 py-1 rounded-lg">
                                                        <span className="material-symbols-outlined text-[11px]">schedule</span>
                                                        {parsed.creneau}
                                                    </span>
                                                )}
                                                {parsed.sujet && (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-black/60 dark:text-white/60 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 px-2.5 py-1 rounded-lg max-w-full">
                                                        <span className="material-symbols-outlined text-[11px] shrink-0">subject</span>
                                                        <span className="truncate">{parsed.sujet}</span>
                                                    </span>
                                                )}
                                                {/* Sequence number */}
                                                <span className="ml-auto text-[10px] font-bold text-black/20 dark:text-white/20 tabular-nums">
                                                    #{idx + 1}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>

                    {/* CTA at bottom */}
                    <div className="mt-12 flex justify-center">
                        <Link
                            href="/consultation"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-base">add_circle</span>
                            Nouvo demann konsiltasyon
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

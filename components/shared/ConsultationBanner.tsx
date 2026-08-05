"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

interface UpcomingConsultation {
    id: string;
    bookingDate: string;
    bookingTime: string;
    serviceName?: string;
    title?: string;
    status: string;
    userPhone?: string;
    message?: string;
    userName?: string;
    adminPhone?: string;
}

const JOURS_HT = ["Dimanch", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi"];
const MOIS_HT = ["Janvye", "Fevriye", "Mas", "Avril", "Me", "Jen", "Jiyè", "Out", "Septanm", "Oktòb", "Novanm", "Desanm"];

function formatConsultationDate(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return { dayName: JOURS_HT[dateObj.getDay()], dayNum: d, month: MOIS_HT[m - 1], year: y };
}

function formatTime12(timeStr: string): string {
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    const mm = m > 0 ? `:${String(m).padStart(2, "0")}` : "";
    return `${h12}${mm} ${period}`;
}

function getTimeUntil(dateStr: string, timeStr: string): string {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, m] = timeStr.split(":").map(Number);
    const diffMs = new Date(y, mo - 1, d, h, m).getTime() - Date.now();
    if (diffMs <= 0) return "kounye a";
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffH / 24);
    const remH = diffH % 24;
    if (diffD > 0) return remH > 0 ? `nan ${diffD}j ${remH}h` : `nan ${diffD} jou`;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffH > 0) { const remMin = diffMin % 60; return remMin > 0 ? `nan ${diffH}h ${remMin}min` : `nan ${diffH} èdtan`; }
    return `nan ${diffMin} minit`;
}

function getCountry(phone?: string) {
    if (!phone) return { name: "Non spécifié", flag: "🌐" };
    const clean = phone.replace(/\D/g, "");
    if (clean.startsWith("509")) return { name: "Ayiti", flag: "🇭🇹" };
    if (clean.startsWith("82")) return { name: "Kore di Sid", flag: "🇰🇷" };
    if (clean.startsWith("1809") || clean.startsWith("1829") || clean.startsWith("1849")) return { name: "Repiblik Dominikèn", flag: "🇩🇴" };
    if (clean.startsWith("1")) return { name: "Etazini / Kanada", flag: "🇺🇸" };
    return { name: "Lòt peyi", flag: "🌐" };
}

function formatPhone(phone?: string) {
    if (!phone) return "Pa disponib";
    let clean = phone.trim();
    if (!clean.startsWith("+") && clean.length > 5) clean = "+" + clean;
    if (clean.startsWith("+509")) {
        const n = clean.replace("+509", "").trim();
        if (n.length === 8) return `+509 ${n.slice(0, 4)} ${n.slice(4)}`;
    }
    return clean;
}

function formatReadablePhone(phone: string) {
    const clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("82") && clean.length === 12) {
        return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 8)} ${clean.slice(8)}`;
    }
    if (clean.startsWith("509") && clean.length === 11) {
        return `+509 ${clean.slice(3, 7)} ${clean.slice(7)}`;
    }
    if (clean.startsWith("1") && clean.length === 11) {
        return `+1 ${clean.slice(1, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
    }
    return "+" + clean.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function parseMessage(msg?: string) {
    const res: Record<string, string> = {};
    if (!msg) return res;
    msg.split("\n").forEach(line => {
        const idx = line.indexOf(":");
        if (idx < 0) return;
        const k = line.substring(0, idx).trim().toLowerCase();
        const v = line.substring(idx + 1).trim();
        if (k.includes("kategori") || k.includes("catégorie")) res.kategori = v;
        else if (k.includes("kreyo") || k.includes("creneau")) res.creneau = v;
    });
    return res;
}

function getStatusConfig(status: string) {
    const s = status?.toLowerCase();
    if (["confirmed", "accepted", "approved"].includes(s)) return { label: "Konfime", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: "check_circle" };
    if (["cancelled", "rejected"].includes(s)) return { label: "Anile", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: "cancel" };
    return { label: "An atant", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: "hourglass_empty" };
}

export default function ConsultationBanner() {
    const { user, loading: authLoading } = useAuth();
    const [consultation, setConsultation] = useState<UpcomingConsultation | null>(null);
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");
    const [dismissed, setDismissed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const touchStartY = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartY.current === null) return;
        const currentY = e.changedTouches[0].clientY;
        const diff = currentY - touchStartY.current;
        if (diff > 40) {
            setDrawerOpen(false);
        }
        touchStartY.current = null;
    };

    useEffect(() => {
        if (!consultation) return;
        const update = () => setTimeLeft(getTimeUntil(consultation.bookingDate, consultation.bookingTime));
        update();
        const interval = setInterval(update, 60_000);
        return () => clearInterval(interval);
    }, [consultation]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    if (loading || authLoading || !consultation || dismissed) return null;

    const { dayName, dayNum, month, year } = formatConsultationDate(consultation.bookingDate);
    const formattedTime = formatTime12(consultation.bookingTime);
    const isPending = consultation.status?.toLowerCase() === "pending";
    const country = getCountry(consultation.userPhone);
    const parsed = parseMessage(consultation.message);
    const statusCfg = getStatusConfig(consultation.status);

    return (
        <>
            <div className="consultation-banner-wrapper">
                <div
                    className="consultation-banner"
                    onClick={() => setDrawerOpen(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && setDrawerOpen(true)}
                    style={{ cursor: "pointer" }}
                >
                    <div className="banner-bg-glow" />
                    <div className="banner-bg-particles">
                        <div className="particle p1" /><div className="particle p2" />
                        <div className="particle p3" /><div className="particle p4" /><div className="particle p5" />
                    </div>

                    <div className="banner-content">
                        <div className="banner-icon-wrap">
                            <div className="banner-icon-pulse" />
                            <div className="banner-icon">
                                <span className="material-symbols-outlined text-xl">event_available</span>
                            </div>
                        </div>

                        <div className="banner-info">
                            <div className="banner-label">
                                <span className="banner-live-dot" />
                                <span>{isPending ? "Konsiltasyon an atant" : "Pwochen konsiltasyon ou"}</span>
                            </div>
                            <div className="banner-date-row">
                                <span className="banner-day">{dayName}</span>
                                <span className="banner-separator">·</span>
                                <span className="banner-date">{dayNum} {month} {year}</span>
                                <span className="banner-separator">·</span>
                                <span className="banner-time">{formattedTime}</span>
                            </div>
                            <div className="banner-countdown">
                                <span className="material-symbols-outlined text-xs">schedule</span>
                                <span>{timeLeft}</span>
                                <span className="banner-click-hint">· Klike pou detay</span>
                            </div>
                        </div>

                        <button
                            className="banner-cta"
                            onClick={e => { e.stopPropagation(); setDrawerOpen(true); }}
                            aria-label="Wè detay konsiltasyon"
                        >
                            <span className="material-symbols-outlined text-sm">info</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

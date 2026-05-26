"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

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
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState("");
    const [dismissed, setDismissed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        if (!user || authLoading) { setLoading(false); return; }
        async function fetchUpcoming() {
            try {
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                const q = query(collection(db, "bookingApplications"), where("usersId", "==", user!.uid));
                const snap = await getDocs(q);
                const validStatuses = ["pending", "approved", "confirmed", "paid", "success", "active", "accepted"];
                const upcoming: UpcomingConsultation[] = [];
                snap.docs.forEach(doc => {
                    const d = doc.data();
                    if (d.bookingDate && d.bookingTime && validStatuses.includes((d.status || "").toLowerCase()) && d.bookingDate >= todayStr) {
                        upcoming.push({
                            id: doc.id,
                            bookingDate: d.bookingDate,
                            bookingTime: d.bookingTime,
                            serviceName: d.serviceName || d.title,
                            title: d.title,
                            status: d.status,
                            userPhone: d.userPhone,
                            message: d.message,
                            userName: d.userName,
                        });
                    }
                });
                upcoming.sort((a, b) => `${a.bookingDate}T${a.bookingTime}`.localeCompare(`${b.bookingDate}T${b.bookingTime}`));
                setConsultation(upcoming[0] || null);
            } catch (err) { console.error("Error fetching upcoming consultations:", err); }
            finally { setLoading(false); }
        }
        fetchUpcoming();
    }, [user, authLoading]);

    useEffect(() => {
        if (!consultation) return;
        const update = () => setTimeLeft(getTimeUntil(consultation.bookingDate, consultation.bookingTime));
        update();
        const interval = setInterval(update, 60_000);
        return () => clearInterval(interval);
    }, [consultation]);

    // Close drawer on ESC
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
            {/* ── Banner ── */}
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

                <style jsx>{`
                    .consultation-banner-wrapper { position: sticky; top: 57px; z-index: 45; width: 100%; }
                    .consultation-banner { position: relative; overflow: hidden; background: linear-gradient(135deg,rgba(242,140,40,0.12) 0%,rgba(242,140,40,0.06) 40%,rgba(18,58,90,0.08) 100%); border-bottom: 1px solid rgba(242,140,40,0.15); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); padding: 10px 16px; animation: bannerSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
                    .consultation-banner:hover { background: linear-gradient(135deg,rgba(242,140,40,0.17) 0%,rgba(242,140,40,0.09) 40%,rgba(18,58,90,0.1) 100%); }
                    @keyframes bannerSlideIn { from { opacity:0; transform:translateY(-100%); } to { opacity:1; transform:translateY(0); } }
                    .banner-bg-glow { position:absolute; inset:0; background:radial-gradient(ellipse at 20% 50%,rgba(242,140,40,0.15),transparent 60%); animation:glowShift 4s ease-in-out infinite alternate; pointer-events:none; }
                    @keyframes glowShift { 0% { background:radial-gradient(ellipse at 20% 50%,rgba(242,140,40,0.15),transparent 60%); } 100% { background:radial-gradient(ellipse at 80% 50%,rgba(242,140,40,0.15),transparent 60%); } }
                    .banner-bg-particles { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
                    .particle { position:absolute; border-radius:50%; background:rgba(242,140,40,0.3); animation:particleFloat 6s ease-in-out infinite; }
                    .p1{width:4px;height:4px;top:20%;left:10%;animation-delay:0s;animation-duration:5s;}
                    .p2{width:3px;height:3px;top:60%;left:30%;animation-delay:1s;animation-duration:7s;}
                    .p3{width:5px;height:5px;top:30%;left:60%;animation-delay:2s;animation-duration:6s;}
                    .p4{width:3px;height:3px;top:70%;left:80%;animation-delay:0.5s;animation-duration:8s;}
                    .p5{width:4px;height:4px;top:50%;left:90%;animation-delay:3s;animation-duration:5.5s;}
                    @keyframes particleFloat { 0%,100%{transform:translateY(0) scale(1);opacity:0.3;} 50%{transform:translateY(-8px) scale(1.3);opacity:0.7;} }
                    .banner-content { position:relative; z-index:5; display:flex; align-items:center; gap:12px; max-width:1200px; margin:0 auto; }
                    .banner-icon-wrap { position:relative; flex-shrink:0; }
                    .banner-icon-pulse { position:absolute; inset:-4px; border-radius:14px; background:rgba(242,140,40,0.2); animation:iconPulse 2s ease-in-out infinite; }
                    @keyframes iconPulse { 0%,100%{transform:scale(1);opacity:0.4;} 50%{transform:scale(1.2);opacity:0;} }
                    .banner-icon { position:relative; width:36px; height:36px; border-radius:12px; background:linear-gradient(135deg,#F28C28,#e07020); display:flex; align-items:center; justify-content:center; color:white; box-shadow:0 4px 16px rgba(242,140,40,0.3); }
                    .banner-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
                    .banner-label { display:flex; align-items:center; gap:6px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.12em; color:rgba(242,140,40,0.9); }
                    .banner-live-dot { width:6px; height:6px; border-radius:50%; background:#F28C28; animation:livePulse 1.5s ease-in-out infinite; box-shadow:0 0 8px rgba(242,140,40,0.6); }
                    @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.8);} }
                    .banner-date-row { display:flex; align-items:baseline; gap:6px; flex-wrap:wrap; }
                    .banner-day { font-size:14px; font-weight:900; color:white; text-transform:capitalize; }
                    .banner-separator { color:rgba(255,255,255,0.15); font-weight:300; }
                    .banner-date { font-size:13px; font-weight:600; color:rgba(255,255,255,0.7); }
                    .banner-time { font-size:13px; font-weight:800; color:#F28C28; background:rgba(242,140,40,0.1); padding:1px 8px; border-radius:6px; border:1px solid rgba(242,140,40,0.15); animation:timeGlow 3s ease-in-out infinite; }
                    @keyframes timeGlow { 0%,100%{box-shadow:0 0 0 0 rgba(242,140,40,0);} 50%{box-shadow:0 0 12px 2px rgba(242,140,40,0.15);} }
                    .banner-countdown { display:flex; align-items:center; gap:4px; font-size:10px; font-weight:700; color:rgba(255,255,255,0.35); }
                    .banner-click-hint { color:rgba(242,140,40,0.5); }
                    .banner-cta { flex-shrink:0; display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:10px; background:rgba(242,140,40,0.15); border:1px solid rgba(242,140,40,0.2); color:#F28C28; font-size:11px; font-weight:800; cursor:pointer; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); }
                    .banner-cta:hover { background:rgba(242,140,40,0.25); border-color:rgba(242,140,40,0.4); transform:translateY(-1px); box-shadow:0 4px 16px rgba(242,140,40,0.2); }
                    @media(max-width:640px){ .consultation-banner{padding:8px 12px;} .banner-content{gap:10px;} .banner-icon{width:32px;height:32px;border-radius:10px;} .banner-day{font-size:13px;} .banner-date{font-size:12px;} .banner-time{font-size:11px;} .banner-cta{padding:7px 10px;} .banner-click-hint{display:none;} }
                `}</style>
            </div>

            {/* ── Backdrop ── */}
            {drawerOpen && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 9998 }}
                    onClick={() => setDrawerOpen(false)}
                />
            )}

            {/* ── Detail Drawer ── */}
            <div style={{
                position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
                transform: drawerOpen ? "translateY(0)" : "translateY(100%)",
                transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
                background: "linear-gradient(180deg,#0f0f0f 0%,#111 100%)",
                borderTop: "1px solid rgba(242,140,40,0.15)",
                borderRadius: "28px 28px 0 0",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "0 0 40px",
            }}>
                {/* Drag handle */}
                <div 
                    onClick={() => setDrawerOpen(false)}
                    style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px", cursor: "pointer" }}
                >
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
                </div>

                <div style={{ padding: "0 20px 8px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#F28C28,#e07020)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", boxShadow: "0 4px 20px rgba(242,140,40,0.3)", flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>event_available</span>
                            </div>
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(242,140,40,0.8)", marginBottom: 2 }}>
                                    Detay Konsiltasyon
                                </p>
                                <h3 style={{ fontSize: 16, fontWeight: 900, color: "white", lineHeight: 1.2 }}>
                                    {consultation.serviceName || consultation.title || "Konsiltasyon"}
                                </h3>
                            </div>
                        </div>
                        <button
                            onClick={() => setDrawerOpen(false)}
                            className="hidden sm:flex"
                            style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                        </button>
                    </div>

                    {/* Status badge & WhatsApp Admin */}
                    <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", background: isPending ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", border: isPending ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(16,185,129,0.2)", color: isPending ? "#fbbf24" : "#34d399" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{statusCfg.icon}</span>
                            {statusCfg.label}
                        </span>

                        <div style={{ display: "flex", alignItems: "stretch", background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 999, overflow: "hidden" }}>
                            <a 
                                href="https://wa.me/821012345678" 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", color: "#25D366", fontSize: 11, fontWeight: 800, textDecoration: "none" }}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                </svg>
                                +82 10 1234 5678
                            </a>
                            <button
                                onClick={() => { navigator.clipboard.writeText("+821012345678"); alert("Nimewo a kopye !"); }}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", borderLeft: "1px solid rgba(37,211,102,0.2)", color: "#25D366", background: "transparent", cursor: "pointer", height: "100%", borderTop: "none", borderBottom: "none", borderRight: "none" }}
                                title="Kopye nimewo a"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>content_copy</span>
                            </button>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                        {/* Date */}
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 16px" }}>
                            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Dat</p>
                            <p style={{ fontSize: 13, fontWeight: 900, color: "white", lineHeight: 1.3 }}>{dayName}</p>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{dayNum} {month} {year}</p>
                        </div>

                        {/* Time */}
                        <div style={{ background: "rgba(242,140,40,0.05)", border: "1px solid rgba(242,140,40,0.12)", borderRadius: 16, padding: "14px 16px" }}>
                            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(242,140,40,0.6)", marginBottom: 6 }}>Lè Konsiltasyon</p>
                            <p style={{ fontSize: 18, fontWeight: 900, color: "#F28C28", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                                {parsed.creneau?.includes("/") 
                                    ? parsed.creneau.split("/").pop()?.replace("lè lokal", "").trim() 
                                    : parsed.creneau || formattedTime}
                            </p>
                            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Lè {country.name}</p>
                        </div>

                        {/* Phone */}
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 16px" }}>
                            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Telefòn</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: "monospace" }}>{formatPhone(consultation.userPhone)}</p>
                        </div>

                        {/* Country */}
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 16px" }}>
                            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Peyi</p>
                            <p style={{ fontSize: 20 }}>{country.flag}</p>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{country.name}</p>
                        </div>
                    </div>

                    {/* Category */}
                    {parsed.kategori && (
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "rgba(242,140,40,0.7)", flexShrink: 0 }}>label</span>
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>Kategori</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{parsed.kategori}</p>
                            </div>
                        </div>
                    )}

                    {/* Countdown pill */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20, padding: "12px 20px", background: "rgba(242,140,40,0.06)", border: "1px solid rgba(242,140,40,0.1)", borderRadius: 999 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "rgba(242,140,40,0.7)" }}>schedule</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{timeLeft}</span>
                    </div>
                </div>
            </div>
        </>
    );
}

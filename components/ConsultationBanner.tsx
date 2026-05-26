"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

interface UpcomingConsultation {
    id: string;
    bookingDate: string; // "2026-05-28"
    bookingTime: string; // "14:00"
    serviceName?: string;
    title?: string;
    status: string;
}

const JOURS_HT = ["Dimanch", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi"];
const MOIS_HT = ["Janvye", "Fevriye", "Mas", "Avril", "Me", "Jen", "Jiyè", "Out", "Septanm", "Oktòb", "Novanm", "Desanm"];

function formatConsultationDate(dateStr: string): { dayName: string; dayNum: number; month: string; year: number } {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return {
        dayName: JOURS_HT[dateObj.getDay()],
        dayNum: d,
        month: MOIS_HT[m - 1],
        year: y,
    };
}

function formatTime12(timeStr: string): string {
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    const mm = m > 0 ? `:${String(m).padStart(2, "0")}` : "";
    return `${h12}${mm} ${period}`;
}

function getTimeUntil(dateStr: string, timeStr: string): string {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, m] = timeStr.split(":").map(Number);
    const target = new Date(y, mo - 1, d, h, m);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return "kounye a";

    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);
    const remainH = diffH % 24;

    if (diffD > 0) {
        return remainH > 0 ? `nan ${diffD}j ${remainH}h` : `nan ${diffD} jou`;
    }
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffH > 0) {
        const remainMin = diffMin % 60;
        return remainMin > 0 ? `nan ${diffH}h ${remainMin}min` : `nan ${diffH} èdtan`;
    }
    return `nan ${diffMin} minit`;
}

export default function ConsultationBanner() {
    const { user, loading: authLoading } = useAuth();
    const [consultation, setConsultation] = useState<UpcomingConsultation | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState("");
    const [dismissed, setDismissed] = useState(false);

    // Fetch upcoming consultations
    useEffect(() => {
        if (!user || authLoading) {
            setLoading(false);
            return;
        }

        async function fetchUpcoming() {
            try {
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

                // Query bookingApplications for this user
                const q = query(
                    collection(db, "bookingApplications"),
                    where("usersId", "==", user!.uid)
                );
                const snap = await getDocs(q);

                const validStatuses = ["pending", "approved", "confirmed", "paid", "success", "active", "accepted"];

                const upcoming: UpcomingConsultation[] = [];
                snap.docs.forEach((doc) => {
                    const data = doc.data();
                    if (
                        data.bookingDate &&
                        data.bookingTime &&
                        validStatuses.includes((data.status || "").toLowerCase()) &&
                        data.bookingDate >= todayStr
                    ) {
                        upcoming.push({
                            id: doc.id,
                            bookingDate: data.bookingDate,
                            bookingTime: data.bookingTime,
                            serviceName: data.serviceName || data.title,
                            title: data.title,
                            status: data.status,
                        });
                    }
                });

                // Sort by date+time, pick the closest
                upcoming.sort((a, b) => {
                    const da = `${a.bookingDate}T${a.bookingTime}`;
                    const db2 = `${b.bookingDate}T${b.bookingTime}`;
                    return da.localeCompare(db2);
                });

                setConsultation(upcoming[0] || null);
            } catch (err) {
                console.error("Error fetching upcoming consultations:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchUpcoming();
    }, [user, authLoading]);

    // Live countdown
    useEffect(() => {
        if (!consultation) return;

        const update = () => {
            setTimeLeft(getTimeUntil(consultation.bookingDate, consultation.bookingTime));
        };
        update();
        const interval = setInterval(update, 60_000);
        return () => clearInterval(interval);
    }, [consultation]);

    if (loading || authLoading || !consultation || dismissed) return null;

    const { dayName, dayNum, month, year } = formatConsultationDate(consultation.bookingDate);
    const formattedTime = formatTime12(consultation.bookingTime);
    const statusLabel = consultation.status?.toLowerCase();
    const isPending = statusLabel === "pending";

    return (
        <div className="consultation-banner-wrapper">
            <div className="consultation-banner">
                {/* Animated background elements */}
                <div className="banner-bg-glow" />
                <div className="banner-bg-particles">
                    <div className="particle p1" />
                    <div className="particle p2" />
                    <div className="particle p3" />
                    <div className="particle p4" />
                    <div className="particle p5" />
                </div>



                <div className="banner-content">
                    {/* Left: Pulsing icon */}
                    <div className="banner-icon-wrap">
                        <div className="banner-icon-pulse" />
                        <div className="banner-icon">
                            <span className="material-symbols-outlined text-xl">event_available</span>
                        </div>
                    </div>

                    {/* Center: Info */}
                    <div className="banner-info">
                        <div className="banner-label">
                            <span className="banner-live-dot" />
                            <span>
                                {isPending ? "Konsiltasyon an atant" : "Pwochen konsiltasyon ou"}
                            </span>
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
                        </div>
                    </div>

                    {/* Right: CTA */}
                    <Link href="/consultation" className="banner-cta">
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                </div>
            </div>

            <style jsx>{`
                .consultation-banner-wrapper {
                    position: sticky;
                    top: 57px;
                    z-index: 45;
                    width: 100%;
                }

                .consultation-banner {
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(
                        135deg,
                        rgba(242, 140, 40, 0.12) 0%,
                        rgba(242, 140, 40, 0.06) 40%,
                        rgba(18, 58, 90, 0.08) 100%
                    );
                    border-bottom: 1px solid rgba(242, 140, 40, 0.15);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    padding: 10px 16px;
                    animation: bannerSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                @keyframes bannerSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* ── Background glow ── */
                .banner-bg-glow {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(
                        ellipse at 20% 50%,
                        rgba(242, 140, 40, 0.15),
                        transparent 60%
                    );
                    animation: glowShift 4s ease-in-out infinite alternate;
                    pointer-events: none;
                }

                @keyframes glowShift {
                    0% {
                        background: radial-gradient(
                            ellipse at 20% 50%,
                            rgba(242, 140, 40, 0.15),
                            transparent 60%
                        );
                    }
                    100% {
                        background: radial-gradient(
                            ellipse at 80% 50%,
                            rgba(242, 140, 40, 0.15),
                            transparent 60%
                        );
                    }
                }

                /* ── Floating particles ── */
                .banner-bg-particles {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    overflow: hidden;
                }

                .particle {
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(242, 140, 40, 0.3);
                    animation: particleFloat 6s ease-in-out infinite;
                }

                .p1 { width: 4px; height: 4px; top: 20%; left: 10%; animation-delay: 0s; animation-duration: 5s; }
                .p2 { width: 3px; height: 3px; top: 60%; left: 30%; animation-delay: 1s; animation-duration: 7s; }
                .p3 { width: 5px; height: 5px; top: 30%; left: 60%; animation-delay: 2s; animation-duration: 6s; }
                .p4 { width: 3px; height: 3px; top: 70%; left: 80%; animation-delay: 0.5s; animation-duration: 8s; }
                .p5 { width: 4px; height: 4px; top: 50%; left: 90%; animation-delay: 3s; animation-duration: 5.5s; }

                @keyframes particleFloat {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
                    50% { transform: translateY(-8px) scale(1.3); opacity: 0.7; }
                }

                /* ── Dismiss ── */
                .banner-dismiss {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    color: rgba(255, 255, 255, 0.3);
                    border: none;
                    cursor: pointer;
                    z-index: 10;
                    transition: all 0.2s;
                }
                .banner-dismiss:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.6);
                }

                /* ── Content layout ── */
                .banner-content {
                    position: relative;
                    z-index: 5;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                /* ── Pulsing icon ── */
                .banner-icon-wrap {
                    position: relative;
                    flex-shrink: 0;
                }

                .banner-icon-pulse {
                    position: absolute;
                    inset: -4px;
                    border-radius: 14px;
                    background: rgba(242, 140, 40, 0.2);
                    animation: iconPulse 2s ease-in-out infinite;
                }

                @keyframes iconPulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.2); opacity: 0; }
                }

                .banner-icon {
                    position: relative;
                    width: 36px;
                    height: 36px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #F28C28, #e07020);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 4px 16px rgba(242, 140, 40, 0.3);
                }

                /* ── Info block ── */
                .banner-info {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .banner-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 9px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    color: rgba(242, 140, 40, 0.9);
                }

                .banner-live-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #F28C28;
                    animation: livePulse 1.5s ease-in-out infinite;
                    box-shadow: 0 0 8px rgba(242, 140, 40, 0.6);
                }

                @keyframes livePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.8); }
                }

                .banner-date-row {
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .banner-day {
                    font-size: 14px;
                    font-weight: 900;
                    color: white;
                    text-transform: capitalize;
                }

                .banner-separator {
                    color: rgba(255, 255, 255, 0.15);
                    font-weight: 300;
                }

                .banner-date {
                    font-size: 13px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.7);
                }

                .banner-time {
                    font-size: 13px;
                    font-weight: 800;
                    color: #F28C28;
                    background: rgba(242, 140, 40, 0.1);
                    padding: 1px 8px;
                    border-radius: 6px;
                    border: 1px solid rgba(242, 140, 40, 0.15);
                    animation: timeGlow 3s ease-in-out infinite;
                }

                @keyframes timeGlow {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(242, 140, 40, 0);
                    }
                    50% {
                        box-shadow: 0 0 12px 2px rgba(242, 140, 40, 0.15);
                    }
                }

                .banner-countdown {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.35);
                }

                /* ── CTA Button ── */
                .banner-cta {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    border-radius: 10px;
                    background: rgba(242, 140, 40, 0.15);
                    border: 1px solid rgba(242, 140, 40, 0.2);
                    color: #F28C28;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    text-decoration: none;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    overflow: hidden;
                }

                .banner-cta::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(242, 140, 40, 0.1),
                        transparent
                    );
                    transform: translateX(-100%);
                    animation: ctaShimmer 3s ease-in-out infinite;
                }

                @keyframes ctaShimmer {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(100%); }
                    100% { transform: translateX(100%); }
                }

                .banner-cta:hover {
                    background: rgba(242, 140, 40, 0.25);
                    border-color: rgba(242, 140, 40, 0.4);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 16px rgba(242, 140, 40, 0.2);
                }

                .banner-cta:active {
                    transform: scale(0.97);
                }

                /* ── Mobile responsive ── */
                @media (max-width: 640px) {
                    .consultation-banner {
                        padding: 8px 12px;
                    }
                    .banner-content {
                        gap: 10px;
                    }
                    .banner-icon {
                        width: 32px;
                        height: 32px;
                        border-radius: 10px;
                    }
                    .banner-day {
                        font-size: 13px;
                    }
                    .banner-date {
                        font-size: 12px;
                    }
                    .banner-time {
                        font-size: 11px;
                    }
                    .banner-cta {
                        padding: 7px 10px;
                        font-size: 10px;
                    }
                }
            `}</style>
        </div>
    );
}

"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from "@/context/AuthContext";
import { getUserById, updateUser } from "@/lib/users";
import { getEnrollmentsByUser } from "@/lib/enrollments";
import { getBookingApplicationsByUser } from "@/lib/booking-applications";
import { updateProfile } from "firebase/auth";
import { db } from '@/lib/firebase';
import { doc as firestoreDoc } from "firebase/firestore";

export default function ProfilePage() {
    const { user, loading: authLoading, signOutUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [displayName, setDisplayName] = useState("");
    const [phoneDisplay, setPhoneDisplay] = useState(""); // read-only unified phone
    const [photoURL, setPhotoURL] = useState("");
    const [memberSince, setMemberSince] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    // Stats State
    const [stats, setStats] = useState({ coursesRaw: 0, ebooks: 0, bookings: 0 });

    // Temp Link states
    const [canGenerateTempLinks, setCanGenerateTempLinks] = useState(false);
    const [tempLinksCount, setTempLinksCount] = useState(0);
    const [generatedLink, setGeneratedLink] = useState("");
    const [generatingLink, setGeneratingLink] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        async function fetchProfileData() {
            if (!user) return;
            try {
                const userDoc = await getUserById(user.uid);
                if (userDoc) {
                    setDisplayName(userDoc.displayName || user.displayName || "");
                    setPhotoURL(userDoc.photoURL || user.photoURL || "");
                    setCanGenerateTempLinks(userDoc.canGenerateTempLinks || false);
                    setTempLinksCount(userDoc.tempLinksCount || 0);

                    // Unified phone: prefer phone (WhatsApp), fallback to phoneNumber or Firebase auth
                    const rawPhone = userDoc.phone || userDoc.phoneNumber || user.phoneNumber || "";
                    const cleanPhone = rawPhone
                        .replace("whatsapp:", "")
                        .replace(/"/g, "")
                        .replace(/'/g, "")
                        .trim();
                    setPhoneDisplay(cleanPhone || "");

                    if (userDoc.createdAt) {
                        setMemberSince(userDoc.createdAt.toDate().toLocaleDateString('fr-FR', {
                            month: 'long', year: 'numeric'
                        }));
                    }
                } else {
                    setDisplayName(user.displayName || "");
                    setPhotoURL(user.photoURL || "");
                }

                const userRef = firestoreDoc(db, "users", user.uid);
                const [enrollments, bookings] = await Promise.all([
                    getEnrollmentsByUser(user.uid).catch(() => []),
                    getBookingApplicationsByUser(userRef).catch(() => [])
                ]);

                setStats({
                    coursesRaw: enrollments.filter(e => e.productType === 'Course' || e.productType === 'course').length,
                    ebooks: enrollments.filter(e => e.productType === 'Ebook' || e.productType === 'ebook').length,
                    bookings: bookings.filter(b => b.status === 'pending' || b.status === 'accepted').length,
                });
            } catch (error) {
                console.error("Profile error:", error);
            } finally {
                setLoading(false);
            }
        }
        if (!authLoading) fetchProfileData();
    }, [user, authLoading]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateUser(user.uid, { displayName });
            await updateProfile(user, { displayName });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error("Error updating profile", error);
            alert("Erreur lors de la mise à jour.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await signOutUser();
        window.location.href = "/login";
    };

    const handleGenerateTempLink = async () => {
        if (!user) return;
        setGeneratingLink(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/auth/temp-link/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Erreur"); }
            const { link } = await res.json();
            setGeneratedLink(link);
            setTempLinksCount(prev => prev + 1);
        } catch (error: any) {
            alert(error.message || "Erreur lors de la génération du lien.");
        } finally {
            setGeneratingLink(false);
        }
    };

    const copyLinkToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark text-white/50 text-sm">
                Tanpri konekte w.
            </div>
        );
    }

    const initials = (displayName || user.email || "?")
        .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

    return (
        <div className="min-h-screen bg-background-dark text-white font-display overflow-x-hidden">
            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl shadow-emerald-500/30 font-bold text-sm">
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        Pwofil ou mete ajou avèk siksè !
                    </div>
                </div>
            )}

            <main className="flex flex-col items-center px-4 pt-10 pb-24">
                <div className="w-full max-w-[680px] flex flex-col gap-6">

                    {/* ── Hero Card ── */}
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] p-8 flex flex-col items-center text-center">
                        {/* Top gradient bar */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                        {/* Background radial glow */}
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_center,rgba(242,140,40,0.08),transparent_60%)]" />

                        {/* Avatar */}
                        <div className="relative mb-5 z-10">
                            {photoURL ? (
                                <img
                                    src={photoURL}
                                    alt={displayName}
                                    className="w-24 h-24 rounded-full object-cover border-2 border-primary/30 shadow-xl shadow-primary/20"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-3xl font-black text-primary shadow-xl shadow-primary/20">
                                    {initials}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-background-dark flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-black text-white z-10 relative">{displayName || "Itilizatè"}</h1>
                        {memberSince && (
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1 z-10 relative">
                                Manm depi {memberSince}
                            </p>
                        )}

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-3 w-full mt-8 z-10 relative">
                            {[
                                { icon: "menu_book", label: "Kou", value: stats.coursesRaw, color: "text-blue-400" },
                                { icon: "auto_stories", label: "Ebook", value: stats.ebooks, color: "text-purple-400" },
                                { icon: "event_available", label: "Rezèvasyon", value: stats.bookings, color: "text-emerald-400" },
                            ].map((s) => (
                                <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1">
                                    <span className={`material-symbols-outlined text-xl ${s.color}`}>{s.icon}</span>
                                    <span className="text-2xl font-black text-white">{s.value}</span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-white/40">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Personal Info Card ── */}
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        <h2 className="text-sm font-black uppercase tracking-widest text-white/50 mb-6">
                            Enfòmasyon pèsonèl
                        </h2>

                        <div className="flex flex-col gap-5">
                            {/* Display Name */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Non konplè</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                                    placeholder="Jean Ronald"
                                />
                            </div>

                            {/* Email or Phone (read-only) */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">
                                        {user.email ? "Adrès e-mail" : "Nimewo telefòn"}
                                    </label>
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-xs">lock</span>
                                        Lekti sèlman
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        readOnly
                                        type={user.email ? "email" : "tel"}
                                        value={user.email || phoneDisplay || ""}
                                        className="w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white/50 cursor-not-allowed"
                                    />
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-base text-white/20">
                                        {user.email ? "alternate_email" : "phone"}
                                    </span>
                                </div>
                            </div>

                            {/* WhatsApp phone (read-only) — only shown if email user also has a phone */}
                            {user.email && phoneDisplay && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="text-emerald-400 text-sm material-symbols-outlined">phone_iphone</span>
                                            Nimewo WhatsApp
                                        </label>
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-xs">lock</span>
                                            Lekti sèlman
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            readOnly
                                            type="tel"
                                            value={phoneDisplay}
                                            className="w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white/50 cursor-not-allowed font-mono tracking-widest"
                                        />
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-base text-white/20">
                                            lock
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="mt-8 w-full py-3.5 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-wide hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                        >
                            {saving ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    N ap sove...
                                </span>
                            ) : "Sove chanjman yo"}
                        </button>
                    </div>

                    {/* ── Magic Link Card ── */}
                    {canGenerateTempLinks && (
                        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8 relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">share_reviews</span>
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-white/70">Aksè Pataje</h2>
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mt-0.5">Lyen koneksyon tanporè</p>
                                </div>
                            </div>

                            <p className="text-sm text-white/60 leading-relaxed mb-5">
                                Kreye yon lyen espesyal pou pèmèt yon lòt moun gen aksè ak kour ou yo{" "}
                                <strong className="text-white">san ou pa pataje modpas ou</strong>.
                            </p>

                            <div className="flex flex-col gap-2 mb-6">
                                {[
                                    { icon: "check_circle", color: "text-emerald-500", text: "Bon pou 24 èdtan sèlman." },
                                    { icon: "check_circle", color: "text-emerald-500", text: "Yon sèl fwa itilizasyon (li ekspire apre premye koneksyon an)." },
                                    { icon: "info", color: "text-white/30", text: `Kota : ${2 - tempLinksCount} lyen ki rete.` },
                                ].map((item) => (
                                    <div key={item.text} className="flex items-start gap-2 text-xs text-white/50">
                                        <span className={`material-symbols-outlined text-sm mt-0.5 ${item.color}`}>{item.icon}</span>
                                        <span>{item.text}</span>
                                    </div>
                                ))}
                            </div>

                            {generatedLink ? (
                                <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                                    <p className="text-[10px] uppercase font-black text-white/30 tracking-widest">Lyen ou kreye a :</p>
                                    <div className="relative">
                                        <input
                                            readOnly
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white/60 pr-24"
                                            value={generatedLink}
                                        />
                                        <button
                                            onClick={() => copyLinkToClipboard(generatedLink)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-xs">{linkCopied ? 'check' : 'content_copy'}</span>
                                            {linkCopied ? 'Kopye' : 'Kopye'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-red-400 italic">Atansyon : ou ka sèvi ak lyen sa a yon sèl fwa sèlman.</p>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerateTempLink}
                                    disabled={generatingLink || tempLinksCount >= 2}
                                    className="w-full py-3.5 rounded-xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                                >
                                    {generatingLink ? (
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <span className="material-symbols-outlined text-xl">add_link</span>
                                    )}
                                    {tempLinksCount >= 2 ? 'Kota lyen yo rive nan limit' : 'Kreye yon lyen aksè espesyal'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Logout ── */}
                    <div className="flex justify-center pt-2">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold text-sm transition-colors group"
                        >
                            <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">logout</span>
                            Dekonekte
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
}

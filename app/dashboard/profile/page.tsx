"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { getUserById, updateUser } from "@/lib/users";
import { getEnrollmentsByUser } from "@/lib/enrollments";
import { getBookingApplicationsByUser } from "@/lib/booking-applications";
import { updateProfile } from "firebase/auth";
import { db } from '@/lib/firebase';
import { doc as firestoreDoc, collection, query, where, getDocs } from "firebase/firestore";
import { sendPreludeVerificationAction, verifyPreludeAndLinkPhoneAction } from "@/app/actions/auth";

// ─── COUNTRIES LIST ──────────────────────────────────────────────────────────
const COUNTRIES = [
    { code: 'HT', name: 'Haïti', dial: '+509', flag: '🇭🇹' },
    { code: 'DO', name: 'Rép. Dominicaine', dial: '+1', flag: '🇩🇴' },
    { code: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺' },
    { code: 'JM', name: 'Jamaïque', dial: '+1', flag: '🇯🇲' },
    { code: 'PR', name: 'Porto Rico', dial: '+1', flag: '🇵🇷' },
    { code: 'TT', name: 'Trinidad & Tobago', dial: '+1', flag: '🇹🇹' },
    { code: 'BB', name: 'Barbade', dial: '+1', flag: '🇧🇧' },
    { code: 'US', name: 'États-Unis', dial: '+1', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
    { code: 'MX', name: 'Mexique', dial: '+52', flag: '🇲🇽' },
    { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
    { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
    { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
    { code: 'NI', name: 'Nicaragua', dial: '+505', flag: '🇳🇮' },
    { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
    { code: 'PA', name: 'Panama', dial: '+507', flag: '🇵🇦' },
    { code: 'CO', name: 'Colombie', dial: '+57', flag: '🇨🇴' },
    { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
    { code: 'EC', name: 'Équateur', dial: '+593', flag: '🇪🇨' },
    { code: 'PE', name: 'Pérou', dial: '+51', flag: '🇵🇪' },
    { code: 'BO', name: 'Bolivie', dial: '+591', flag: '🇧🇴' },
    { code: 'CL', name: 'Chili', dial: '+56', flag: '🇨🇱' },
    { code: 'AR', name: 'Argentine', dial: '+54', flag: '🇦🇷' },
    { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
    { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
    { code: 'BR', name: 'Brésil', dial: '+55', flag: '🇧🇷' },
    { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
    { code: 'BE', name: 'Belgique', dial: '+32', flag: '🇧🇪' },
    { code: 'CH', name: 'Suisse', dial: '+41', flag: '🇨🇭' },
    { code: 'GP', name: 'Guadeloupe', dial: '+590', flag: '🇬🇵' },
    { code: 'MQ', name: 'Martinique', dial: '+596', flag: '🇲🇶' },
    { code: 'GF', name: 'Guyane', dial: '+594', flag: '🇬🇫' },
    { code: 'RE', name: 'La Réunion', dial: '+262', flag: '🇷🇪' },
    { code: 'GB', name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧' },
    { code: 'DE', name: 'Allemagne', dial: '+49', flag: '🇩🇪' },
    { code: 'ES', name: 'Espagne', dial: '+34', flag: '🇪🇸' },
    { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
    { code: 'IT', name: 'Italie', dial: '+39', flag: '🇮🇹' },
    { code: 'NL', name: 'Pays-Bas', dial: '+31', flag: '🇳🇱' },
    { code: 'CN', name: 'Chine', dial: '+86', flag: '🇨🇳' },
    { code: 'KR', name: 'Corée du Sud', dial: '+82', flag: '🇰🇷' },
    { code: 'JP', name: 'Japon', dial: '+81', flag: '🇯🇵' },
];

const TIMEZONE_MAP: Record<string, string> = {
    'America/Port-au-Prince': 'HT', 'America/Santo_Domingo': 'DO',
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
    'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Winnipeg': 'CA',
    'America/Montreal': 'CA', 'America/Halifax': 'CA',
    'Europe/Paris': 'FR', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH',
    'America/Guadeloupe': 'GP', 'America/Martinique': 'MQ',
    'America/Cayenne': 'GF', 'Indian/Reunion': 'RE',
    'America/Havana': 'CU', 'America/Jamaica': 'JM', 'America/Puerto_Rico': 'PR',
    'America/Port_of_Spain': 'TT', 'America/Barbados': 'BB',
    'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Monterrey': 'MX',
    'America/Guatemala': 'GT', 'America/Tegucigalpa': 'HN', 'America/El_Salvador': 'SV',
    'America/Managua': 'NI', 'America/Costa_Rica': 'CR', 'America/Panama': 'PA',
    'America/Bogota': 'CO', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC',
    'America/Lima': 'PE', 'America/La_Paz': 'BO', 'America/Santiago': 'CL',
    'America/Argentina/Buenos_Aires': 'AR', 'America/Montevideo': 'UY', 'America/Asuncion': 'PY',
    'America/Sao_Paulo': 'BR', 'America/Manaus': 'BR', 'America/Fortaleza': 'BR',
    'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES',
    'Europe/Lisbon': 'PT', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL',
    'Asia/Shanghai': 'CN', 'Asia/Chongqing': 'CN', 'Asia/Beijing': 'CN',
    'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP',
};

function detectCountry(): (typeof COUNTRIES)[0] {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const code = TIMEZONE_MAP[tz];
        if (code) { const found = COUNTRIES.find(c => c.code === code); if (found) return found; }
    } catch { }
    return COUNTRIES[0]; // fallback Haïti
}

function formatPhone(digits: string, countryCode: string): string {
    if (!digits) return '';
    if (countryCode === 'HT') {
        const d = digits.slice(0, 8);
        if (d.length <= 4) return d;
        return `${d.slice(0, 4)} ${d.slice(4)}`;
    }
    const plusOne = ['US', 'CA', 'DO', 'JM', 'PR', 'TT', 'BB'];
    if (plusOne.includes(countryCode)) {
        const d = digits.slice(0, 10);
        if (d.length <= 3) return d;
        if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
        return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    }
    const d = digits.slice(0, 10);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
    if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
    if (d.length <= 8) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6)}`;
    return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

export default function ProfilePage() {
    const { user, loading: authLoading, signOutUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [displayName, setDisplayName] = useState("");
    const [phoneDisplay, setPhoneDisplay] = useState(""); // read-only for WhatsApp users
    const [phoneEditable, setPhoneEditable] = useState(""); // editable for email users
    const [photoURL, setPhotoURL] = useState("");
    const [memberSince, setMemberSince] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [showErrorPopup, setShowErrorPopup] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Verification states
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [checkingPhone, setCheckingPhone] = useState(false);
    const [showVerificationStep, setShowVerificationStep] = useState(false);
    const [verificationOtp, setVerificationOtp] = useState("");
    const [linkingPhone, setLinkingPhone] = useState(false);

    // Stats State
    const [stats, setStats] = useState({ coursesRaw: 0, ebooks: 0, bookings: 0 });



    // Country selection states & refs
    const [selectedCountry, setSelectedCountry] = useState(() => detectCountry());
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, above: false });
    const [countrySearch, setCountrySearch] = useState('');
    const countryBtnRef = useRef<HTMLButtonElement>(null);
    const countryDropdownRef = useRef<HTMLDivElement>(null);

    // Effet pour fermer le dropdown au clic extérieur
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
                setShowCountryDropdown(false);
                setCountrySearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Positionner et ouvrir le dropdown des pays
    const openCountryDropdown = () => {
        if (!countryBtnRef.current) return;
        const rect = countryBtnRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const above = spaceBelow < 260;
        setDropdownPos({
            top: above ? rect.top - 8 : rect.bottom + 4,
            left: rect.left,
            above,
        });
        setShowCountryDropdown(true);
        setCountrySearch('');
    };

    useEffect(() => {
        async function fetchProfileData() {
            if (!user) return;
            try {
                const userDoc = await getUserById(user.uid);
                if (userDoc) {
                    setDisplayName(userDoc.displayName || user.displayName || "");
                    setPhotoURL(userDoc.photoURL || user.photoURL || "");


                    // For WhatsApp users: read-only display
                    const rawPhone = userDoc.phone || user.phoneNumber || "";
                    const cleanPhone = rawPhone
                        .replace("whatsapp:", "")
                        .replace(/"/g, "")
                        .replace(/'/g, "")
                        .trim();
                    setPhoneDisplay(cleanPhone || "");

                    // For email users: editable phone field (phoneNumber field)
                    const rawPhoneNum = userDoc.phoneNumber || userDoc.phone || "";
                    let cleanPhoneNum = rawPhoneNum.replace("whatsapp:", "").replace(/"/g, "").replace(/'/g, "").trim();

                    if (cleanPhoneNum) {
                        setIsPhoneVerified(true);
                        let detectedCountry: any = COUNTRIES[0]; // default Haiti
                        let displayDigits = cleanPhoneNum;

                        if (cleanPhoneNum.startsWith('+')) {
                            const sortedCountries = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
                            const match = sortedCountries.find(c => cleanPhoneNum.startsWith(c.dial));
                            if (match) {
                                detectedCountry = match;
                                displayDigits = cleanPhoneNum.slice(match.dial.length);
                            }
                        } else {
                            detectedCountry = "-";
                            displayDigits = cleanPhoneNum;
                        }

                        if (typeof detectedCountry !== "string") {
                            setSelectedCountry(detectedCountry);
                            setPhoneEditable(formatPhone(displayDigits.replace(/\D/g, ""), detectedCountry.code));
                        } else {
                            setPhoneEditable(cleanPhoneNum);
                        }
                    } else {
                        setIsPhoneVerified(false);
                        setPhoneEditable("");
                    }

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
            const updates: any = { displayName };
            await updateUser(user.uid, updates);
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

    const handleInitiatePhoneLink = async () => {
        if (!user) return;
        const digits = phoneEditable.replace(/\D/g, "");
        if (!digits) return;
        const fullPhone = selectedCountry.dial + digits;

        setCheckingPhone(true);
        try {
            const res = await sendPreludeVerificationAction(user.uid, fullPhone);
            if (res.error) {
                setErrorMessage(res.error);
                setShowErrorPopup(true);
            } else {
                setShowVerificationStep(true);
            }
        } catch (error) {
            console.error("Error initiating phone verification:", error);
            alert("Erreur lors de l'initiation de la vérification.");
        } finally {
            setCheckingPhone(false);
        }
    };

    const handleVerifyOtpAndLink = async () => {
        if (!user) return;
        const digits = phoneEditable.replace(/\D/g, "");
        if (!digits) return;
        const fullPhone = selectedCountry.dial + digits;

        setLinkingPhone(true);
        try {
            const res = await verifyPreludeAndLinkPhoneAction(user.uid, fullPhone, verificationOtp);
            if (res.error) {
                setErrorMessage(res.error);
                setShowErrorPopup(true);
            } else {
                setIsPhoneVerified(true);
                setShowVerificationStep(false);
                setVerificationOtp("");
                
                // Afficher le message de succès
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        } catch (error) {
            console.error("Error verifying and linking phone number:", error);
            alert("Erreur lors de la confirmation du code.");
        } finally {
            setLinkingPhone(false);
        }
    };

    const handleLogout = async () => {
        await signOutUser();
        window.location.href = "/login";
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mt-8 z-10 relative">
                            {[
                                { icon: "menu_book", label: "Kou", value: stats.coursesRaw, color: "text-blue-400" },
                                { icon: "auto_stories", label: "Ebook", value: stats.ebooks, color: "text-purple-400" },
                                { icon: "event_available", label: "Rezèvasyon", value: stats.bookings, color: "text-emerald-400" },
                            ].map((s, index) => (
                                <div key={s.label} className={`bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1 ${index === 2 ? 'col-span-2 sm:col-span-1' : ''}`}>
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

                            {/* Phone field — editable or locked for email users */}
                            {user.email && (
                                isPhoneVerified ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="text-emerald-400 text-sm material-symbols-outlined">phone_iphone</span>
                                                Nimewo telefòn
                                            </label>
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                                <span className="material-symbols-outlined text-xs">verified</span>
                                                Verifye epi fèmen
                                            </span>
                                        </div>
                                        <div className="relative animate-in fade-in duration-200">
                                            <input
                                                readOnly
                                                type="tel"
                                                value={phoneEditable}
                                                className="w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white/50 cursor-not-allowed font-mono"
                                            />
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-base text-emerald-400">
                                                lock
                                             </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="text-emerald-400 text-sm material-symbols-outlined">phone_iphone</span>
                                            Nimewo telefòn (opsyonèl)
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                ref={countryBtnRef}
                                                type="button"
                                                disabled={showVerificationStep}
                                                onClick={openCountryDropdown}
                                                className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-white shrink-0 disabled:opacity-50"
                                            >
                                                <span className="text-base leading-none">{selectedCountry.flag}</span>
                                                <span className="font-bold">{selectedCountry.dial}</span>
                                                <span className="material-symbols-outlined notranslate text-xs text-white/40">keyboard_arrow_down</span>
                                            </button>
                                            <input
                                                type="tel"
                                                disabled={showVerificationStep}
                                                value={phoneEditable}
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, "");
                                                    setPhoneEditable(formatPhone(digits, selectedCountry.code));
                                                }}
                                                placeholder={selectedCountry.code === 'HT' ? "3456 7890" : "06 12 34 56 78"}
                                                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                        
                                        {!showVerificationStep ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={handleInitiatePhoneLink}
                                                    disabled={checkingPhone || !phoneEditable.replace(/\D/g, "")}
                                                    className="mt-1.5 w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {checkingPhone ? "N ap voye SMS..." : "Verifye nimewo sa a pa SMS"}
                                                </button>
                                                <p className="text-[10px] text-white/30 leading-relaxed">
                                                    Ajoute nimewo sa a si ou vle resevwa kòd koneksyon pa SMS tou.
                                                </p>
                                            </>
                                        ) : (
                                            <div className="mt-2 p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                                                <p className="text-xs text-white/80 font-medium leading-relaxed">
                                                    Nou voye yon kòd verifikasyon pa SMS sou nimewo sa a : <strong className="text-emerald-400 font-bold font-mono">{selectedCountry.dial + " " + phoneEditable}</strong>.
                                                </p>
                                                
                                                <div className="flex flex-col gap-1.5">
                                                     <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                                         Antre kòd ou resevwa a :
                                                     </label>
                                                     <div className="flex gap-2">
                                                         <input
                                                             type="text"
                                                             maxLength={6}
                                                             value={verificationOtp}
                                                             onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ""))}
                                                             placeholder="Ex: 1234"
                                                             className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-center font-mono focus:outline-none focus:border-primary/60 text-white placeholder:text-white/20"
                                                         />
                                                         <button
                                                             type="button"
                                                             onClick={handleVerifyOtpAndLink}
                                                             disabled={linkingPhone || verificationOtp.length < 4}
                                                             className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                         >
                                                             {linkingPhone ? "Ap verifye..." : "Konfime"}
                                                         </button>
                                                     </div>
                                                </div>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowVerificationStep(false);
                                                        setVerificationOtp("");
                                                    }}
                                                    className="text-[10px] text-white/40 hover:text-white/60 font-bold uppercase tracking-wider mt-1 text-center"
                                                >
                                                    Anile
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
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

            {/* Country Dropdown (rendered via Portal) */}
            {showCountryDropdown && typeof window !== "undefined" && createPortal(
                <div
                    ref={countryDropdownRef}
                    style={{
                        position: 'fixed',
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        zIndex: 9999,
                    }}
                    className="w-64 max-h-60 overflow-y-auto bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="sticky top-0 bg-zinc-900 pb-2 mb-2 border-b border-white/5">
                        <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Chache yon peyi..."
                            className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-0.5">
                        {COUNTRIES.filter(c =>
                            c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                            c.dial.includes(countrySearch)
                        ).map((c) => (
                            <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                    setSelectedCountry(c);
                                    setShowCountryDropdown(false);
                                    setCountrySearch('');
                                    setPhoneEditable('');
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${selectedCountry.code === c.code
                                        ? 'bg-primary text-white font-bold'
                                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    <span>{c.flag}</span>
                                    <span className="truncate">{c.name}</span>
                                </span>
                                <span className="text-white/40 font-mono text-[10px]">{c.dial}</span>
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
            {/* Error Popup Modal */}
            {showErrorPopup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-red-500 text-2xl notranslate">warning</span>
                        </div>
                        <h3 className="text-base font-extrabold text-white mb-2">Nimewo sa a deja itilize</h3>
                        <p className="text-xs text-white/60 leading-relaxed mb-6">
                            {errorMessage}
                        </p>
                        <button
                            onClick={() => setShowErrorPopup(false)}
                            className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors"
                        >
                            Dakò
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

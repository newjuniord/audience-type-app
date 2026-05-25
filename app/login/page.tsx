"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithCustomToken } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
// Importation des fonctions Firestore pour manipuler les documents
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
    checkUserAction,
    generateOtpAction,
    verifyOtpAndLoginAction,
    generateMagicLinkAction
} from "@/app/actions/auth";

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
        if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
        return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    }
    const d = digits.slice(0, 12);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoginView, setIsLoginView] = useState(true);
    const router = useRouter();
    const { user, role, loading: authLoading } = useAuth();

    // Connexion sans mot de passe
    const [loginMethod, setLoginMethod] = useState<'whatsapp' | 'phone' | 'email' | 'password'>('whatsapp');
    const [step, setStep] = useState<'input' | 'verify'>('input');
    const [phone, setPhone] = useState("");
    const [verifiedPhone, setVerifiedPhone] = useState("");
    const [selectedCountry, setSelectedCountry] = useState(() => detectCountry());
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, above: false });
    const [countrySearch, setCountrySearch] = useState('');
    const countryBtnRef = useRef<HTMLButtonElement>(null);
    const countryDropdownRef = useRef<HTMLDivElement>(null);

    const [verificationCode, setVerificationCode] = useState("");
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [magicLinkToken, setMagicLinkToken] = useState<string | null>(null);
    const [whatsappRedirect, setWhatsappRedirect] = useState<{ url: string; businessPhone: string; isNewUser?: boolean } | null>(null);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    // Effet pour fermer le dropdown des pays au clic extérieur
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

    // Ouvrir le dropdown des pays au bon endroit
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

    // Cooldown du code de vérification
    useEffect(() => {
        if (cooldownSeconds > 0) {
            const timer = setTimeout(() => setCooldownSeconds(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldownSeconds]);

    // Écoute du Magic Link en temps réel
    useEffect(() => {
        if (!magicLinkToken) return;

        let timeoutId: NodeJS.Timeout;

        const unsubscribe = onSnapshot(doc(db, "magic_links", magicLinkToken), async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.status === "used" && data.customToken) {
                    try {
                        await signInWithCustomToken(auth, data.customToken);
                        setMagicLinkToken(null);
                    } catch (err) {
                        console.error("Erreur de connexion via magic link", err);
                        setVerificationError("Koneksyon otomatik la echwe.");
                    }
                } else if (data.status === "expired") {
                    setVerificationError("Lyen an ekspire. Tanpri rekòmanse.");
                    setMagicLinkToken(null);
                }
            }
        });

        // Timeout local de 10 minutes
        timeoutId = setTimeout(() => {
            unsubscribe();
            setVerificationError("Tan datant lan depase (10 minit).");
            setMagicLinkToken(null);
        }, 10 * 60 * 1000);

        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [magicLinkToken]);

    // Redirection automatique après connexion
    useEffect(() => {
        if (!authLoading && user) {
            if (role?.trim().toLowerCase() === "admin") {
                router.push("/admin");
            } else {
                router.push("/dashboard");
            }
        }
    }, [user, role, authLoading, router]);

    // Envoi du Magic Link ou OTP
    const handlePasswordlessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (loginMethod === 'email' && !email) {
            setIsLoading(false);
            return;
        }

        let cleanPhone = "";
        if (loginMethod === 'whatsapp' || loginMethod === 'phone') {
            if (!phone) {
                setIsLoading(false);
                return;
            }
            let cleanNumber = phone.replace(/\D/g, "");
            const dialDigits = selectedCountry.dial.replace(/\D/g, "");
            if (cleanNumber.startsWith(dialDigits)) cleanNumber = cleanNumber.substring(dialDigits.length);
            if (cleanNumber.startsWith("0")) cleanNumber = cleanNumber.substring(1);

            const getExpectedDigitsLength = (code: string) => {
                switch (code) {
                    case 'HT': return 8;
                    case 'FR': case 'BE': case 'CH': case 'GP': case 'MQ': case 'GF': case 'RE': return 9;
                    case 'US': case 'CA': case 'DO': case 'PR': case 'JM': case 'TT': case 'BB': case 'MX': case 'CO': return 10;
                    default: return 8;
                }
            };

            const expectedLength = getExpectedDigitsLength(selectedCountry.code);
            if (cleanNumber.length !== expectedLength) {
                setError(
                    selectedCountry.code === 'HT'
                        ? `Nimewo pou Ayiti a dwe gen 8 chif ladan l (egz: 34567890). Ou antre ${cleanNumber.length} chif.`
                        : `Nimewo pou ${selectedCountry.name} la dwe gen presizeman ${expectedLength} chif ladan l. Ou antre ${cleanNumber.length} chif.`
                );
                setIsLoading(false);
                return;
            }
            cleanPhone = `${selectedCountry.dial}${cleanNumber}`;
            setVerifiedPhone(cleanPhone);
        }

        try {
            const contactToUse = (loginMethod === 'whatsapp' || loginMethod === 'phone') ? cleanPhone : email;

            if (loginMethod === 'whatsapp') {
                const businessPhone = process.env.NEXT_PUBLIC_TWILIO_NUMBER?.replace(/\D/g, '') || "17157507852";
                setWhatsappRedirect({
                    url: `https://wa.me/${businessPhone}?text=metem`,
                    businessPhone: `+${businessPhone}`,
                    isNewUser: true
                });
                setMagicLinkToken(null);
                setVerificationError(null);
                setVerificationCode("");
                setCooldownSeconds(0);
                setStep('verify');
            } else {
                const genData = await generateOtpAction(contactToUse, loginMethod === 'phone' ? 'phone' : 'email');
                if (genData.error) throw new Error(genData.error);

                if (genData.action === "redirect_to_whatsapp" && genData.businessPhone) {
                    window.open(`https://wa.me/${genData.businessPhone}?text=${encodeURIComponent("Bonjou, mwen ta renmen resevwa kòd verifikasyon mwen an.")}`, "_blank");
                }

                setVerificationError(null);
                setVerificationCode("");
                setCooldownSeconds(loginMethod === 'phone' ? 299 : 60);
                setStep('verify');
            }
        } catch (err: any) {
            console.error("Erreur de connexion sans mot de passe :", err);
            if (err.message && err.message.toLowerCase().includes("server action")) {
                setError("Tanpri refrechi paj la konplètman (F5 oswa glise desann). Gen yon mizajou ki fèk fèt sou sit la.");
            } else {
                setError(err.message || "Gen yon erè ki fèt. Tanpri reyezi ankò.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Validation du code OTP (SMS / E-mail)
    const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isValidLength = loginMethod === 'phone' 
            ? (verificationCode.length >= 4 && verificationCode.length <= 6)
            : (verificationCode.length === 4);
        if (!verificationCode || !isValidLength) {
            setVerificationError(loginMethod === 'phone' ? "Kòd la dwe gen ant 4 ak 6 chif." : "Kòd la dwe gen 4 chif presizeman.");
            return;
        }
        setIsLoading(true);
        setVerificationError(null);

        try {
            const contactToUse = (loginMethod === 'phone' || loginMethod === 'whatsapp') ? verifiedPhone : email;
            const typeParam = loginMethod === 'phone' ? 'phone' : (loginMethod === 'whatsapp' ? 'whatsapp' : 'email');
            const data = await verifyOtpAndLoginAction(contactToUse, verificationCode.trim(), typeParam);

            if (data.error) throw new Error(data.error);

            if (data.customToken) {
                await signInWithCustomToken(auth, data.customToken);
            }
        } catch (err: any) {
            if (err.message && err.message.toLowerCase().includes("server action")) {
                setVerificationError("Tanpri refrechi paj la konplètman (F5). Gen yon mizajou ki fèk fèt sou sit la.");
            } else {
                setVerificationError(err.message || "Kòd verifikasyon sa a pa bon.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            setError("Tanpri antre adrès imel ou pou nou ka voye yon lyen pou chanje modpas ou.");
            setMessage(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        setMessage(null);
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Nou voye yon imel pou chanje modpas ou nan adrès ou a.");
        } catch (err: any) {
            console.error("Reset password error:", err);
            if (err.code === 'auth/user-not-found') {
                setError("Nou pa jwenn okenn itilizatè ki gen adrès imel sa a.");
            } else {
                setError("Erè pandan n ap voye imel pou chanje modpas la.");
            }
        }
        setIsLoading(false);
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        if (!isLoginView) {
            if (password !== confirmPassword) {
                setError("Modpas yo pa parèy.");
                return;
            }
            if (password.length < 6) {
                setError("Modpas la dwe gen 6 karaktè pou pi piti.");
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        setMessage(null);
        try {
            let user;
            if (isLoginView) {
                const result = await signInWithEmailAndPassword(auth, email, password);
                user = result.user;
            } else {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                user = result.user;
            }

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    fullName: email.split('@')[0],
                    email: user.email,
                    photoURL: "",
                    phone: "",
                    role: "customer",
                    createdAt: serverTimestamp(),
                });

                window.location.href = "/dashboard";
                return;
            }

            if (userSnap.exists()) {
                if (!userSnap.data().createdAt) {
                    await setDoc(userRef, { createdAt: serverTimestamp() }, { merge: true });
                }

                if (userSnap.data().role?.trim().toLowerCase() === "admin") {
                    window.location.href = "/admin";
                } else {
                    window.location.href = "/dashboard";
                }
                return;
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            if (isLoginView) {
                setError("Imel oswa modpas la pa bon.");
            } else {
                if (err.code === 'auth/email-already-in-use') {
                    setError("Adrès imel sa a deja itilize.");
                } else if (err.code === 'auth/weak-password') {
                    setError("Modpas la dwe gen 6 karaktè pou pi piti.");
                } else {
                    setError("Gen yon erè ki fèt pandan enskripsyon an.");
                }
            }
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Déclenche le popup de connexion Google
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // 2. Création d'une référence vers le document de l'utilisateur dans la collection "users"
            // On utilise l'UID unique de l'utilisateur comme identifiant de document
            const userRef = doc(db, "users", user.uid);

            // 3. Vérifie si l'utilisateur existe déjà dans Firestore
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // SI L'UTILISATEUR N'EXISTE PAS : On crée son profil complet
                await setDoc(userRef, {
                    displayName: user.displayName || "Anonyme", // Nom récupéré de Google
                    email: user.email,                      // Email récupéré de Google
                    photoURL: user.photoURL,                // Photo de profil récupérée de Google
                    phoneNumber: user.phoneNumber || "",          // Numéro de téléphone (si disponible)
                    role: "user",                           // Rôle par défaut
                    createdAt: serverTimestamp(),           // Date de création via le serveur Firebase
                });
            } else {
                // SI L'UTILISATEUR EXISTE DÉJÀ : On met à jour ses infos et on s'assure qu'il a une date de création
                const existingData = userSnap.data();
                const updates: any = {
                    displayName: user.displayName || existingData.displayName || existingData.fullName,
                    photoURL: user.photoURL || existingData.photoURL,
                };

                if (!existingData.createdAt) {
                    updates.createdAt = serverTimestamp();
                }

                await setDoc(userRef, updates, { merge: true });
            }
            // 4. Redirection vers le tableau approprié
            if (userSnap.exists() && userSnap.data().role?.trim().toLowerCase() === "admin") {
                window.location.href = "/admin";
            } else {
                window.location.href = "/dashboard";
            }
        } catch (err: any) {
            console.error("Login error:", err);
            setError("Gen yon erè ki fèt pandan koneksyon an. Tanpri reyezi ankò.");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-background-dark text-white overflow-hidden">
            {/* Left Side: Auth Form */}
            <div className="w-full lg:w-[62%] xl:w-[68%] flex flex-col px-1.5 md:px-16 lg:px-24 xl:px-32 py-6 md:py-12 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full bg-[#080808]">
                {/* Logo Area */}
                <Link href="/" className="flex items-center gap-3 mb-20 group">
                    <img src="/logo.png" alt="DJR Akademi" className="size-10 rounded-xl object-cover" />
                    <span className="text-white text-xl font-black tracking-tighter uppercase">DJR Akademi</span>
                </Link>

                <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
                    <div className="mb-10">
                        <p className="text-primary text-xs font-black uppercase tracking-[0.25em] mb-3">Byenvini</p>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase leading-[0.9] text-white">
                            Aprann sèvi <br /> ak IA.
                        </h1>
                        <p className="text-white/50 text-base">
                            Antre nan kou w, ebook ak rezèvasyon w yo fasil.
                        </p>
                    </div>

                    <div className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium text-center">
                                {message}
                            </div>
                        )}

                        {step === 'verify' ? (
                            <div className="flex flex-col gap-4">
                                {loginMethod === 'whatsapp' ? (
                                    magicLinkToken ? (
                                        <div className="flex flex-col items-center text-center p-6 bg-white/[0.02] border border-white/10 rounded-2xl w-full">
                                            <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                                <svg viewBox="0 0 24 24" className="w-10 h-10 animate-pulse" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="12" fill="#25D366" />
                                                    <path d="M12.012 3c-4.966 0-9.006 4.04-9.006 9.002 0 1.588.413 3.131 1.2 4.493L3 21.01l4.636-1.215a8.96 8.96 0 004.377 1.135h.004c4.964 0 9.003-4.04 9.003-9.003-.002-2.405-.939-4.667-2.639-6.368A8.956 8.956 0 0012.012 3zm4.945 12.393c-.271.765-1.353 1.394-1.854 1.488-.475.09-1.092.164-1.748-.05-.417-.137-.935-.308-1.579-.585-2.738-1.176-4.521-3.957-4.658-4.14-.136-.184-1.112-1.48-1.112-2.825 0-1.344.704-2.004.954-2.271.25-.266.542-.333.722-.333h.52c.162 0 .38.062.593.57.217.519.742 1.81.805 1.942.064.133.107.288.021.462-.085.174-.128.3-.255.448-.128.148-.268.33-.383.443-.128.125-.263.262-.113.52.15.258.667 1.1 1.433 1.785.987.88 1.815 1.152 2.073 1.28.258.128.408.107.562-.067.155-.174.663-.77.842-1.034.178-.264.358-.22.604-.128.247.092 1.56.735 1.829.87.269.135.448.203.513.315.065.112.065.65-.206 1.414z" fill="#ffffff" />
                                                </svg>
                                            </div>
                                            <h3 className="font-bold text-lg mb-1 text-white">Verifye WhatsApp ou</h3>
                                            <p className="text-xs text-white/50 mb-4 max-w-xs leading-relaxed">
                                                Nou voye yon lyen koneksyon rapid nan <span className="text-emerald-400 font-bold">{verifiedPhone}</span>.
                                            </p>

                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] text-white/60 mb-6">
                                                <div className="size-2 rounded-full bg-primary animate-ping" />
                                                N ap tann koneksyon otomatik la...
                                            </div>

                                            {verificationError && (
                                                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium w-full">
                                                    {verificationError}
                                                </div>
                                            )}

                                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                                                <p className="text-xs text-white/50 mb-3 text-center">
                                                    Si lyen an pa mache, antre kòd 4 chif nou voye w la :
                                                </p>
                                                <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-3">
                                                    <input
                                                        type="text"
                                                        maxLength={4}
                                                        value={verificationCode}
                                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").substring(0, 4))}
                                                        placeholder="0000"
                                                        className="w-full text-center tracking-[1em] pl-[1em] py-3 rounded-xl bg-black/20 border border-white/10 focus:outline-none focus:border-primary/60 text-lg font-black text-white placeholder:text-white/10"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={isLoading || verificationCode.length !== 4}
                                                        className="w-full py-3 bg-primary/20 text-primary border border-primary/30 rounded-xl font-bold text-sm hover:bg-primary/30 transition-all disabled:opacity-50 flex items-center justify-center"
                                                    >
                                                        {isLoading ? <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Valide kòd la"}
                                                    </button>
                                                </form>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStep('input');
                                                    setMagicLinkToken(null);
                                                    setWhatsappRedirect(null);
                                                    setError(null);
                                                }}
                                                className="text-xs text-white/40 hover:text-white transition-colors py-1 underline"
                                            >
                                                Chanje nimewo a / Retounen
                                            </button>
                                        </div>
                                    ) : whatsappRedirect ? (
                                        <div className="flex flex-col items-center text-center p-6 bg-white/[0.02] border border-white/10 rounded-2xl w-full">
                                            <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                                <span className="text-3xl">📱</span>
                                            </div>
                                            <h3 className="font-bold text-lg mb-2 text-white uppercase">Ouvri WhatsApp !</h3>
                                            <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-sm">
                                                Klike sou bouton anba a pou w voye mesaj la. <strong className="text-white">Robo a ap reponn ou ak kòd ou a!</strong>
                                            </p>

                                            <a href={whatsappRedirect.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-4 mb-5 bg-[#25D366] text-white font-black rounded-xl text-sm transition-all hover:bg-[#1ebd5a] shadow-lg shadow-[#25D366]/20">
                                                <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                                                Ouvri WhatsApp
                                            </a>

                                            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-4 text-left w-full">
                                                <p className="text-xs text-white/50 leading-relaxed">
                                                    <strong className="text-white">Lòt aparèy ?</strong> Si ou pa gen WhatsApp sou aparèy sa a, voye mo <strong className="text-[#25D366]">{whatsappRedirect.isNewUser ? "METEM" : "KÒD"}</strong> nan nimewo <strong className="text-white">WhatsApp</strong> nou an anba a depi sou telefòn ou :
                                                </p>
                                                <p className="text-lg font-black text-white tracking-widest font-mono mt-2 text-center bg-black/20 rounded-lg p-2.5 border border-white/5">
                                                    {whatsappRedirect.businessPhone.length === 12 && whatsappRedirect.businessPhone.startsWith('+1')
                                                        ? whatsappRedirect.businessPhone.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')
                                                        : whatsappRedirect.businessPhone}
                                                </p>
                                            </div>

                                            <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-4 w-full">
                                                <div className="flex flex-col items-center text-center">
                                                    <p className="text-xs text-white/50 leading-relaxed">
                                                        Kou ou resevwa kòd la sou WhatsApp, antre li la :
                                                    </p>
                                                </div>
                                                <input
                                                    type="text"
                                                    maxLength={4}
                                                    value={verificationCode}
                                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").substring(0, 4))}
                                                    placeholder="1234"
                                                    className="w-full h-14 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-center text-xl font-mono placeholder-white/20 tracking-[0.5em] focus:outline-none focus:border-white transition-colors bg-transparent text-white"
                                                />
                                                {verificationError && (
                                                    <p className="text-[11px] text-red-500 font-semibold text-center">
                                                        ⚠️ {verificationError}
                                                    </p>
                                                )}
                                                <button
                                                    type="submit"
                                                    disabled={isLoading || verificationCode.length !== 4}
                                                    className="w-full h-14 bg-gradient-to-r from-primary to-orange-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {isLoading ? <div className="size-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /> : "Valide kòd la"}
                                                </button>
                                            </form>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStep('input');
                                                    setMagicLinkToken(null);
                                                    setWhatsappRedirect(null);
                                                    setError(null);
                                                }}
                                                className="text-xs text-white/40 hover:text-white transition-colors py-1 mt-4 underline"
                                            >
                                                Chanje nimewo a / Retounen
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 text-white/50 text-sm w-full">
                                            Pa gen okenn aksyon ki kòmanse. Tanpri retounen.
                                            <button onClick={() => setStep('input')} className="block mx-auto mt-4 text-xs underline">Retounen</button>
                                        </div>
                                    )
                                ) : (
                                    <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-4 py-5 px-4 sm:p-5 border border-white/10 rounded-2xl bg-white/[0.03]">
                                        <div className="flex flex-col items-center text-center mb-2">
                                            <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center mb-3 text-primary">
                                                <span className="material-symbols-outlined notranslate text-2xl">{loginMethod === 'phone' ? 'sms' : 'mail'}</span>
                                            </div>
                                            <h3 className="font-bold text-base text-white">Antre kòd verifikasyon an</h3>
                                            <p className="text-xs text-white/50 max-w-xs leading-relaxed mt-1">
                                                {loginMethod === 'phone' ? "Antre kòd nou voye nan :" : "Antre kòd 4 chif nou voye nan :"} <br />
                                                <span className="text-white font-bold">{loginMethod === 'phone' ? verifiedPhone : email}</span>
                                            </p>
                                            {loginMethod === 'email' && (
                                                <p className="text-[11px] text-amber-400/80 font-medium mt-2 max-w-xs leading-relaxed bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10">
                                                    ⚠️ Si ou pa resevwa kòd la, tanpri verifye dosye <strong>Spam</strong> ou an.
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <input
                                                type="text"
                                                maxLength={loginMethod === 'phone' ? 6 : 4}
                                                value={verificationCode}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "");
                                                    setVerificationCode(val);
                                                }}
                                                placeholder={loginMethod === 'phone' ? "000000" : "0000"}
                                                className="w-full text-center tracking-[1em] pl-[1em] py-3.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-lg font-black text-white placeholder:text-white/10"
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        {verificationError && (
                                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
                                                {verificationError}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isLoading || (loginMethod === 'phone' ? (verificationCode.length < 4 || verificationCode.length > 6) : verificationCode.length !== 4)}
                                            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {isLoading ? (
                                                <div className="h-5 w-5 mx-auto border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                "Valide kòd la"
                                            )}
                                        </button>

                                        <div className="flex justify-between items-center mt-2 px-1 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStep('input');
                                                    setError(null);
                                                }}
                                                className="text-white/40 hover:text-white transition-colors"
                                            >
                                                Retounen
                                            </button>
                                            {cooldownSeconds > 0 ? (
                                                <span className="text-white/30">
                                                    Renvoye kòd la nan {cooldownSeconds}s
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handlePasswordlessSubmit}
                                                    className="text-primary hover:underline font-semibold"
                                                >
                                                    Renvoye kòd la
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {/* TABS SELECTOR */}
                                <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-2">
                                    {(['whatsapp', 'email', 'password'] as const).map((method) => {
                                        const labels = {
                                            whatsapp: 'WhatsApp',
                                            phone: 'SMS',
                                            email: 'Kòd',
                                            password: 'Modpas'
                                        };
                                        const icons = {
                                            whatsapp: 'chat',
                                            phone: 'sms',
                                            email: 'mail',
                                            password: 'lock'
                                        };
                                        const isActive = loginMethod === method;
                                        return (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => {
                                                    setLoginMethod(method);
                                                    setError(null);
                                                    setMessage(null);
                                                }}
                                                className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all duration-200 ${isActive
                                                        ? 'bg-primary text-white font-bold shadow-md'
                                                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                                    }`}
                                            >
                                                {method === 'whatsapp' ? (
                                                    <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" xmlns="http://www.w3.org/2000/svg">
                                                        <circle cx="12" cy="12" r="12" fill={isActive ? '#ffffff' : '#25D366'} />
                                                        <path d="M12.012 3c-4.966 0-9.006 4.04-9.006 9.002 0 1.588.413 3.131 1.2 4.493L3 21.01l4.636-1.215a8.96 8.96 0 004.377 1.135h.004c4.964 0 9.003-4.04 9.003-9.003-.002-2.405-.939-4.667-2.639-6.368A8.956 8.956 0 0012.012 3zm4.945 12.393c-.271.765-1.353 1.394-1.854 1.488-.475.09-1.092.164-1.748-.05-.417-.137-.935-.308-1.579-.585-2.738-1.176-4.521-3.957-4.658-4.14-.136-.184-1.112-1.48-1.112-2.825 0-1.344.704-2.004.954-2.271.25-.266.542-.333.722-.333h.52c.162 0 .38.062.593.57.217.519.742 1.81.805 1.942.064.133.107.288.021.462-.085.174-.128.3-.255.448-.128.148-.268.33-.383.443-.128.125-.263.262-.113.52.15.258.667 1.1 1.433 1.785.987.88 1.815 1.152 2.073 1.28.258.128.408.107.562-.067.155-.174.663-.77.842-1.034.178-.264.358-.22.604-.128.247.092 1.56.735 1.829.87.269.135.448.203.513.315.065.112.065.65-.206 1.414z" fill={isActive ? '#25D366' : '#ffffff'} />
                                                    </svg>
                                                ) : (
                                                    <span className="material-symbols-outlined notranslate text-lg mb-0.5">{icons[method]}</span>
                                                )}
                                                <span className="text-[10px] uppercase tracking-wider font-semibold">{labels[method]}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {loginMethod === 'password' ? (
                                    <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 py-5 px-4 sm:p-5 border border-white/10 rounded-2xl bg-white/[0.03]">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Adrès imel</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                                                placeholder="nom@exemple.com"
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Modpas</label>
                                                {isLoginView && (
                                                    <button
                                                        type="button"
                                                        onClick={handleResetPassword}
                                                        className="text-xs text-white/40 hover:text-primary transition-colors"
                                                    >
                                                        Ou bliye modpas ou?
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                                                placeholder="••••••••"
                                                required
                                                minLength={isLoginView ? undefined : 6}
                                            />
                                        </div>
                                        {!isLoginView && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Konfime modpas la</label>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                                                    placeholder="••••••••"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-3 mt-1 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {isLoading ? (
                                                <div className="h-5 w-5 mx-auto border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                isLoginView ? "Konekte" : "Kreye yon kont"
                                            )}
                                        </button>

                                        <div className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsLoginView(!isLoginView);
                                                    setError(null);
                                                    setMessage(null);
                                                }}
                                                className="text-sm text-white/40 hover:text-white transition-colors"
                                            >
                                                {isLoginView ? "Ou pa gen kont? Kreye yon kont" : "Ou gen yon kont deja? Konekte"}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={handlePasswordlessSubmit} className="flex flex-col gap-4 py-5 px-4 sm:p-5 border border-white/10 rounded-2xl bg-white/[0.03]">
                                        {(loginMethod === 'whatsapp' || loginMethod === 'phone') ? (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">
                                                    Nimewo telefòn
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        ref={countryBtnRef}
                                                        type="button"
                                                        onClick={openCountryDropdown}
                                                        className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-white shrink-0"
                                                    >
                                                        <span className="text-base leading-none">{selectedCountry.flag}</span>
                                                        <span className="font-bold">{selectedCountry.dial}</span>
                                                        <span className="material-symbols-outlined notranslate text-xs text-white/40">keyboard_arrow_down</span>
                                                    </button>
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={(e) => {
                                                            const digits = e.target.value.replace(/\D/g, "");
                                                            setPhone(formatPhone(digits, selectedCountry.code));
                                                        }}
                                                        placeholder={selectedCountry.code === 'HT' ? "3456 7890" : "06 12 34 56 78"}
                                                        className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Adrès imel</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="nom@exemple.com"
                                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                                                    required
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-3 mt-1 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {isLoading ? (
                                                <div className="h-5 w-5 mx-auto border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            ) : loginMethod === 'whatsapp' ? (
                                                "Konekte ak WhatsApp"
                                            ) : loginMethod === 'phone' ? (
                                                "Resevwa kòd pa SMS"
                                            ) : (
                                                "Resevwa kòd pa Imel"
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

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
                                                setPhone('');
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


                        <p className="text-center text-xs text-white/30">
                            Lè ou kontinye, ou dakò ak{" "}
                            <Link href="/terms" className="underline hover:text-primary transition-colors">
                                Kondisyon itilizasyon
                            </Link>{" "}
                            ak{" "}
                            <Link href="/privacy" className="underline hover:text-primary transition-colors">
                                Règleman konfidansyalite
                            </Link>.
                        </p>
                    </div>
                </div>

                {/* Footer Quote */}
                <div className="mt-auto pt-12">
                    <p className="text-xs font-medium italic text-white/20">
                        "Mond lan Gen ase richès pou tout moun jwenn epi viv byen."
                    </p>
                </div>
            </div>

            {/* Right Side: Sleek Designer Panel */}
            <div className="hidden lg:flex lg:w-[38%] xl:w-[32%] flex-col justify-between p-12 relative bg-[#070707] border-l border-white/[0.06] overflow-hidden">
                {/* Background Grid Pattern & Radial Glows */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/15 blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange-500/10 blur-[120px]" />

                {/* Top Badge */}
                <div className="relative z-10 flex justify-end">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-full">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Live Platform</span>
                    </div>
                </div>

                {/* Interactive Preview Cards (Sleek Visuals) */}
                <div className="relative z-10 my-auto space-y-5">
                    {/* Course Card Preview */}
                    <div className="p-4 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl transition-all duration-300 hover:border-white/20 group">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined notranslate">school</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Kou Aktif</p>
                                <h4 className="text-sm font-bold text-white truncate">Metriz Entelijans Atifisyèl (IA)</h4>
                            </div>
                        </div>
                        <div className="mt-4 space-y-1.5">
                            <div className="flex justify-between text-[10px] text-white/50">
                                <span>Pwogrè</span>
                                <span className="font-bold text-primary">68%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: '68%' }} />
                            </div>
                        </div>
                    </div>

                    {/* Booking Card Preview */}
                    <div className="p-4 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl transition-all duration-300 hover:border-white/20 group">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined notranslate">calendar_today</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Konsiltasyon</p>
                                <h4 className="text-sm font-bold text-white truncate">Rezèv konfime ak DJR</h4>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-white/60 bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="material-symbols-outlined notranslate text-sm text-emerald-400">check_circle</span>
                            <span>Jodi a a 15:00 (15 min)</span>
                        </div>
                    </div>
                </div>

                {/* Footer Content */}
                <div className="relative z-10 mt-auto">
                    <h3 className="text-white text-2xl font-black uppercase tracking-tight leading-none mb-4">
                        Kominote <br />
                        <span className="text-primary">DJR Akademi</span>
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2.5">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="size-8 rounded-full border border-black bg-white/20 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User" />
                                </div>
                            ))}
                            <div className="size-8 rounded-full border border-black bg-primary flex items-center justify-center text-[9px] font-black text-white">
                                +100
                            </div>
                        </div>
                        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Plis pase 100 elèv</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ActionModal } from "@/components/ui/ActionModal";

declare global {
    interface Window {
        turnstile?: any;
    }
}

interface WhatsAppLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productName: string;
}

const COUNTRIES = [
    // Caraïbes & Haïti
    { code: 'HT', name: 'Haïti',              dial: '+509', flag: '🇭🇹' },
    { code: 'DO', name: 'Rép. Dominicaine',    dial: '+1',   flag: '🇩🇴' },
    { code: 'CU', name: 'Cuba',               dial: '+53',  flag: '🇨🇺' },
    { code: 'JM', name: 'Jamaïque',           dial: '+1',   flag: '🇯🇲' },
    { code: 'PR', name: 'Porto Rico',          dial: '+1',   flag: '🇵🇷' },
    { code: 'TT', name: 'Trinidad & Tobago',   dial: '+1',   flag: '🇹🇹' },
    { code: 'BB', name: 'Barbade',             dial: '+1',   flag: '🇧🇧' },
    // Amérique du Nord
    { code: 'US', name: 'États-Unis',          dial: '+1',   flag: '🇺🇸' },
    { code: 'CA', name: 'Canada',              dial: '+1',   flag: '🇨🇦' },
    { code: 'MX', name: 'Mexique',             dial: '+52',  flag: '🇲🇽' },
    // Amérique Centrale
    { code: 'GT', name: 'Guatemala',           dial: '+502', flag: '🇬🇹' },
    { code: 'HN', name: 'Honduras',            dial: '+504', flag: '🇲🇳' },
    { code: 'SV', name: 'El Salvador',         dial: '+503', flag: '🇸🇻' },
    { code: 'NI', name: 'Nicaragua',           dial: '+505', flag: '🇳🇮' },
    { code: 'CR', name: 'Costa Rica',          dial: '+506', flag: '🇨🇷' },
    { code: 'PA', name: 'Panama',              dial: '+507', flag: '🇵🇦' },
    // Amérique du Sud
    { code: 'CO', name: 'Colombie',            dial: '+57',  flag: '🇨🇴' },
    { code: 'VE', name: 'Venezuela',           dial: '+58',  flag: '🇻🇪' },
    { code: 'EC', name: 'Équateur',            dial: '+593', flag: '🇪🇨' },
    { code: 'PE', name: 'Pérou',              dial: '+51',  flag: '🇵🇪' },
    { code: 'BO', name: 'Bolivie',             dial: '+591', flag: '🇧🇴' },
    { code: 'CL', name: 'Chili',              dial: '+56',  flag: '🇨🇱' },
    { code: 'AR', name: 'Argentine',           dial: '+54',  flag: '🇦🇷' },
    { code: 'UY', name: 'Uruguay',             dial: '+598', flag: '🇺🇾' },
    { code: 'PY', name: 'Paraguay',            dial: '+595', flag: '🇵🇾' },
    { code: 'BR', name: 'Brésil',             dial: '+55',  flag: '🇧🇷' },
    // Europe francophone
    { code: 'FR', name: 'France',              dial: '+33',  flag: '🇫🇷' },
    { code: 'BE', name: 'Belgique',            dial: '+32',  flag: '🇧🇪' },
    { code: 'CH', name: 'Suisse',              dial: '+41',  flag: '🇨🇭' },
    { code: 'GP', name: 'Guadeloupe',          dial: '+590', flag: '🇬🇵' },
    { code: 'MQ', name: 'Martinique',          dial: '+596', flag: '🇲🇶' },
    { code: 'GF', name: 'Guyane',             dial: '+594', flag: '🇬🇫' },
    { code: 'RE', name: 'La Réunion',         dial: '+262', flag: '🇷🇪' },
    // Europe
    { code: 'GB', name: 'Royaume-Uni',         dial: '+44',  flag: '🇬🇧' },
    { code: 'DE', name: 'Allemagne',           dial: '+49',  flag: '🇩🇪' },
    { code: 'ES', name: 'Espagne',             dial: '+34',  flag: '🇪🇸' },
    { code: 'PT', name: 'Portugal',            dial: '+351', flag: '🇵🇹' },
    { code: 'IT', name: 'Italie',              dial: '+39',  flag: '🇮🇹' },
    { code: 'NL', name: 'Pays-Bas',           dial: '+31',  flag: '🇳🇱' },
    // Asie
    { code: 'CN', name: 'Chine',              dial: '+86',  flag: '🇨🇳' },
    { code: 'KR', name: 'Corée du Sud',        dial: '+82',  flag: '🇰🇷' },
    { code: 'JP', name: 'Japon',              dial: '+81',  flag: '🇯🇵' },
];

function formatPhone(digits: string, countryCode: string): string {
    if (!digits) return '';
    if (countryCode === 'HT') {
        const d = digits;
        if (d.length <= 2) return d;
        if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
        return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
    }
    const plusOne = ['US','CA','DO','JM','PR','TT','BB'];
    if (plusOne.includes(countryCode)) {
        const d = digits;
        if (d.length <= 3) return d;
        if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
        return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    }
    const d = digits;
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}

export default function WhatsAppLoginModal({
    isOpen,
    onClose,
    onSuccess,
    productName
}: WhatsAppLoginModalProps) {
    const [step, setStep] = useState<'phone' | 'no_account' | 'code'>('phone');
    const [phone, setPhone] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tempUserId, setTempUserId] = useState<string | null>(null);
    const [isSessionInactive, setIsSessionInactive] = useState(false);

    // Cooldown state
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    // Cloudflare Turnstile states
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const turnstileWidgetRef = useRef<HTMLDivElement>(null);

    const countryDropdownRef = useRef<HTMLDivElement>(null);
    const countryBtnRef = useRef<HTMLButtonElement>(null);

    // Reset state on open/close
    useEffect(() => {
        if (isOpen) {
            setStep('phone');
            setPhone('');
            setVerificationCode('');
            setError(null);
            setIsSessionInactive(false);
            setTurnstileToken(null);
        }
    }, [isOpen]);

    // Cooldown timer effect
    useEffect(() => {
        if (cooldownSeconds > 0) {
            const timer = setTimeout(() => setCooldownSeconds(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldownSeconds]);

    // Load Cloudflare Turnstile script dynamically
    useEffect(() => {
        if (isOpen) {
            if (!document.getElementById('cloudflare-turnstile-script')) {
                const script = document.createElement('script');
                script.id = 'cloudflare-turnstile-script';
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                script.async = true;
                script.defer = true;
                document.body.appendChild(script);
            }
        }
    }, [isOpen]);

    // Render / Reset Cloudflare Turnstile widget
    useEffect(() => {
        if (isOpen && step === 'phone' && window.turnstile && turnstileWidgetRef.current) {
            try {
                window.turnstile.render(turnstileWidgetRef.current, {
                    sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
                    callback: (token: string) => {
                        setTurnstileToken(token);
                    },
                    "expired-callback": () => {
                        setTurnstileToken(null);
                    },
                    "error-callback": () => {
                        setTurnstileToken(null);
                    }
                });
            } catch (e) {
                console.error("Turnstile render error:", e);
            }
        }

        return () => {
            if (window.turnstile && turnstileWidgetRef.current) {
                try {
                    window.turnstile.remove(turnstileWidgetRef.current);
                } catch (e) {}
            }
        };
    }, [isOpen, step]);

    const resetTurnstile = () => {
        setTurnstileToken(null);
        if (window.turnstile && turnstileWidgetRef.current) {
            try {
                window.turnstile.reset(turnstileWidgetRef.current);
            } catch (e) {}
        }
    };

    const getCleanPhone = () => {
        let cleanNumber = phone.replace(/\D/g, "");
        const dialDigits = selectedCountry.dial.replace(/\D/g, "");
        if (cleanNumber.startsWith(dialDigits)) {
            cleanNumber = cleanNumber.substring(dialDigits.length);
        }
        if (cleanNumber.startsWith("0")) {
            cleanNumber = cleanNumber.substring(1);
        }
        return `${selectedCountry.dial}${cleanNumber}`;
    };

    // Cooldown checking on load
    useEffect(() => {
        if (isOpen && phone) {
            const cleanPhone = getCleanPhone();
            const lastSentKey = `otp_last_sent_whatsapp_${cleanPhone}`;
            const lastSentTime = localStorage.getItem(lastSentKey);
            if (lastSentTime) {
                const diff = Date.now() - parseInt(lastSentTime);
                if (diff < 60 * 1000) {
                    setCooldownSeconds(Math.ceil((60 * 1000 - diff) / 1000));
                } else {
                    setCooldownSeconds(0);
                }
            }
        }
    }, [isOpen, phone, selectedCountry, step]);

    // LocalStorage spam limits
    const checkLocalLimits = (phoneStr: string, channelType: 'whatsapp' | 'sms'): { allowed: boolean; reason?: string } => {
        const now = Date.now();
        
        // 1. Check cooldown (60s)
        const lastSentKey = `otp_last_sent_${channelType}_${phoneStr}`;
        const lastSentTime = localStorage.getItem(lastSentKey);
        if (lastSentTime) {
            const diff = now - parseInt(lastSentTime);
            if (diff < 60 * 1000) {
                const waitSec = Math.ceil((60 * 1000 - diff) / 1000);
                return { allowed: false, reason: `Veuillez patienter ${waitSec} secondes avant de demander un nouveau code.` };
            }
        }
        
        // 2. Check 24h count limit
        const limitKey = `otp_count_24h_${channelType}_${phoneStr}`;
        const limitVal = localStorage.getItem(limitKey);
        const maxLimit = channelType === 'whatsapp' ? 5 : 3;
        
        if (limitVal) {
            try {
                const { count, firstSent } = JSON.parse(limitVal);
                if (now - firstSent < 24 * 60 * 60 * 1000) {
                    if (count >= maxLimit) {
                        return { allowed: false, reason: `Limite de tentative quotidienne atteinte pour ce numéro (max ${maxLimit}/24h).` };
                    }
                } else {
                    localStorage.removeItem(limitKey);
                }
            } catch (e) {
                localStorage.removeItem(limitKey);
            }
        }
        
        return { allowed: true };
    };

    const incrementLocalCount = (phoneStr: string, channelType: 'whatsapp' | 'sms') => {
        const now = Date.now();
        const lastSentKey = `otp_last_sent_${channelType}_${phoneStr}`;
        localStorage.setItem(lastSentKey, now.toString());
        
        const limitKey = `otp_count_24h_${channelType}_${phoneStr}`;
        const limitVal = localStorage.getItem(limitKey);
        
        if (limitVal) {
            try {
                const { count, firstSent } = JSON.parse(limitVal);
                if (now - firstSent < 24 * 60 * 60 * 1000) {
                    localStorage.setItem(limitKey, JSON.stringify({ count: count + 1, firstSent }));
                } else {
                    localStorage.setItem(limitKey, JSON.stringify({ count: 1, firstSent: now }));
                }
            } catch (e) {
                localStorage.setItem(limitKey, JSON.stringify({ count: 1, firstSent: now }));
            }
        } else {
            localStorage.setItem(limitKey, JSON.stringify({ count: 1, firstSent: now }));
        }
    };

    // Handle outside click for country dropdown
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
                setShowCountryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);


    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        let cleanNumber = phone.replace(/\D/g, "");
        const dialDigits = selectedCountry.dial.replace(/\D/g, "");
        if (cleanNumber.startsWith(dialDigits)) {
            cleanNumber = cleanNumber.substring(dialDigits.length);
        }
        if (cleanNumber.startsWith("0")) {
            cleanNumber = cleanNumber.substring(1);
        }

        const getExpectedLength = (code: string): number => {
            if (code === 'HT') return 8;
            if (['FR','BE','CH','GP','MQ','GF','RE'].includes(code)) return 9;
            if (['US','CA','DO','PR','JM','TT','BB','MX','CO'].includes(code)) return 10;
            return 0;
        };

        const expectedLength = getExpectedLength(selectedCountry.code);
        if (expectedLength > 0 && cleanNumber.length !== expectedLength) {
            setError(
                selectedCountry.code === 'HT'
                    ? "Le numéro pour Haïti doit comporter 8 chiffres (ex: 34567890)."
                    : `Le numéro doit comporter exactement ${expectedLength} chiffres.`
            );
            return;
        } else if (expectedLength === 0 && (cleanNumber.length < 7 || cleanNumber.length > 15)) {
            setError("Le numéro de téléphone doit comporter entre 7 et 15 chiffres.");
            return;
        }

        const cleanPhone = `${selectedCountry.dial}${cleanNumber}`;

        // Local limits check
        const localLimit = checkLocalLimits(cleanPhone, 'whatsapp');
        if (!localLimit.allowed) {
            setError(localLimit.reason || "Trop de demandes.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Vérifier si l'appareil est de confiance pour ce numéro de téléphone
            const checkTrustedRes = await fetch("/api/auth/trusted-device-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleanPhone })
            });

            if (checkTrustedRes.ok) {
                const trustedData = await checkTrustedRes.json();
                if (trustedData.valid && trustedData.customToken) {
                    document.cookie = "logged_in=true; path=/; max-age=315360000; SameSite=Strict; Secure";
                    await signInWithCustomToken(auth, trustedData.customToken);
                    onSuccess();
                    onClose();
                    return;
                }
            }

            // 2. Flux normal de vérification/création si l'appareil n'est pas valide
            const checkRes = await fetch("/api/auth/check-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: cleanPhone
                })
            });

            if (!checkRes.ok) throw new Error("Erreur de vérification.");
            const checkData = await checkRes.json();

            if (checkData.exists) {
                // User exists: automatically send code and go to verify step
                setTempUserId(checkData.userId);
                
                const genRes = await fetch("/api/auth/temp-link/anonymous-generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: checkData.userId,
                        contactMethod: "phone",
                        phone: cleanPhone,
                        turnstileToken
                    })
                });

                if (!genRes.ok) {
                    const genData = await genRes.json();
                    resetTurnstile();
                    if (genData.isSessionInactive) {
                        setIsSessionInactive(true);
                        setStep('no_account');
                        return;
                    }
                    if (genData.isBlocked) {
                        setError("Trop de tentatives de connexion (limite dépassée pour WhatsApp).");
                        return;
                    }
                    throw new Error(genData.error || "Échec d'envoi du code WhatsApp.");
                }
                
                incrementLocalCount(cleanPhone, 'whatsapp');
                setCooldownSeconds(60);
                setStep('code');
            } else {
                setStep('no_account');
            }
        } catch (err: any) {
            console.error("Phone submit error:", err);
            setError(err.message || "Erreur de connexion. Veuillez réessayer.");
            resetTurnstile();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSmsRegistration = async () => {
        setError(null);
        const cleanPhone = getCleanPhone();

        // Local limits check
        const localLimit = checkLocalLimits(cleanPhone, 'sms');
        if (!localLimit.allowed) {
            setError(localLimit.reason || "Trop de demandes.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Register user
            const regRes = await fetch("/api/auth/register-or-find", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: cleanPhone,
                    contactMethod: "phone"
                })
            });

            if (!regRes.ok) throw new Error("Erreur de création de compte.");
            const regData = await regRes.json();
            setTempUserId(regData.userId);

            // 2. Send SMS verification code
            const genRes = await fetch("/api/auth/temp-link/anonymous-generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: regData.userId,
                    contactMethod: "phone",
                    phone: cleanPhone,
                    turnstileToken
                })
            });

            if (!genRes.ok) {
                const genData = await genRes.json().catch(() => ({}));
                resetTurnstile();
                if (genData.isBlocked) {
                    throw new Error("Trop de tentatives de connexion par SMS (limite de 3/24h dépassée).");
                }
                throw new Error(genData.error || "Échec d'envoi du code SMS.");
            }

            incrementLocalCount(cleanPhone, 'sms');
            setCooldownSeconds(60);
            setStep('code');
        } catch (err: any) {
            console.error("SMS Registration error:", err);
            setError(err.message || "Erreur lors de la création de compte.");
            resetTurnstile();
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (verificationCode.length !== 4) {
            setError("Le code doit comporter 4 chiffres.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const verifyRes = await fetch("/api/auth/temp-link/anonymous-verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: tempUserId || undefined,
                    code: verificationCode.trim()
                })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Code incorrect.");

            const token = new URL(verifyData.link).searchParams.get("token");
            const tokenVerifyRes = await fetch(`/api/auth/temp-link/verify?token=${token}`);
            const tokenVerifyData = await tokenVerifyRes.json();
            if (!tokenVerifyRes.ok) throw new Error(tokenVerifyData.error || "Erreur de connexion.");

            await signInWithCustomToken(auth, tokenVerifyData.customToken);

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Code verify error:", err);
            setError(err.message || "Code invalide. Veuillez réessayer.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAlreadyHasCode = async () => {
        setError(null);
        let cleanNumber = phone.replace(/\D/g, "");
        if (!phone || !cleanNumber) {
            setError("Veuillez d'abord saisir votre numéro de téléphone.");
            return;
        }
        
        // Valider la longueur
        const dialDigits = selectedCountry.dial.replace(/\D/g, "");
        if (cleanNumber.startsWith(dialDigits)) {
            cleanNumber = cleanNumber.substring(dialDigits.length);
        }
        if (cleanNumber.startsWith("0")) {
            cleanNumber = cleanNumber.substring(1);
        }
        
        const getExpectedLength = (code: string): number => {
            if (code === 'HT') return 8;
            if (['FR','BE','CH','GP','MQ','GF','RE'].includes(code)) return 9;
            if (['US','CA','DO','PR','JM','TT','BB','MX','CO'].includes(code)) return 10;
            return 0;
        };

        const expectedLength = getExpectedLength(selectedCountry.code);
        if (expectedLength > 0 && cleanNumber.length !== expectedLength) {
            setError(
                selectedCountry.code === 'HT'
                    ? "Le numéro pour Haïti doit comporter 8 chiffres (ex: 34567890)."
                    : `Le numéro doit comporter exactement ${expectedLength} chiffres.`
            );
            return;
        } else if (expectedLength === 0 && (cleanNumber.length < 7 || cleanNumber.length > 15)) {
            setError("Le numéro de téléphone doit comporter entre 7 et 15 chiffres.");
            return;
        }

        const cleanPhone = `${selectedCountry.dial}${cleanNumber}`;
        setIsLoading(true);
        
        try {
            const checkRes = await fetch("/api/auth/check-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleanPhone })
            });
            
            if (!checkRes.ok) throw new Error("Erreur de vérification.");
            const checkData = await checkRes.json();
            
            if (checkData.exists) {
                setTempUserId(checkData.userId);
                setStep('code');
            } else {
                setError("Aucun compte trouvé avec ce numéro. Veuillez d'abord valider votre numéro pour recevoir un code.");
            }
        } catch (err: any) {
            console.error("Error checking user for existing code:", err);
            setError("Une erreur est survenue lors de la vérification du numéro.");
        } finally {
            setIsLoading(false);
        }
    };

    const getPlaceholder = () => {
        if (selectedCountry.code === 'HT') return '34 56 7890';
        if (['US','CA','DO','PR','JM','TT','BB'].includes(selectedCountry.code)) return '809 484 2020';
        return '6 12 34 56';
    };

    const getModalSubtitle = () => {
        if (step === 'phone') {
            return `Pour acheter ${productName}, saisissez votre numéro de téléphone pour continuer.`;
        }
        if (step === 'no_account') {
            if (isSessionInactive) {
                return "Votre session de communication WhatsApp est inactive. Réactivez-la ou choisissez le SMS.";
            }
            return "Aucun compte n'est associé à ce numéro. Choisissez une méthode pour continuer.";
        }
        return `Saisissez le code d'accès à 4 chiffres envoyé pour débloquer ${productName}.`;
    };

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title="Accès Premium"
            subtitle={getModalSubtitle()}
            iconEmoji={step === 'code' ? "🔒" : "💬"}
        >
            {step === 'phone' && (
                <div className="space-y-6 pt-2">
                    <form onSubmit={handlePhoneSubmit} className="space-y-4">
                        <div className="flex gap-2 relative w-full">
                            {/* Country selector */}
                            <div className="relative shrink-0" ref={countryDropdownRef}>
                                <button
                                    ref={countryBtnRef}
                                    type="button"
                                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                    className="h-16 px-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-1.5 hover:bg-white/10 text-white transition-all text-sm font-bold whitespace-nowrap"
                                >
                                    <span className="text-base">{selectedCountry.flag}</span>
                                    <span className="text-white/70">{selectedCountry.dial}</span>
                                    <svg className={`size-3 text-white/40 transition-transform ${showCountryDropdown ? '-rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                </button>

                                {showCountryDropdown && (
                                    <div className="absolute left-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl z-50 py-2 max-h-60 overflow-y-auto">
                                        <div className="px-3 pb-2 pt-1 border-b border-white/5 sticky top-0 bg-zinc-900 z-10">
                                            <input
                                                type="text"
                                                placeholder="Rechercher..."
                                                value={countrySearch}
                                                onChange={(e) => setCountrySearch(e.target.value)}
                                                className="w-full h-10 px-3 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-white placeholder:text-white/30 focus:outline-none"
                                            />
                                        </div>
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
                                                }}
                                                className={`w-full px-4 py-3 hover:bg-white/5 flex items-center gap-3 text-left transition-colors ${
                                                    selectedCountry.code === c.code ? 'bg-primary/10 text-primary' : 'text-white/80'
                                                }`}
                                            >
                                                <span className="text-xl">{c.flag}</span>
                                                <span className="flex-1 font-bold text-xs">{c.name}</span>
                                                <span className="text-xs text-white/40">{c.dial}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Phone input */}
                            <input
                                type="tel"
                                value={formatPhone(phone, selectedCountry.code)}
                                onChange={(e) => {
                                    setPhone(e.target.value.replace(/\D/g, ''));
                                    setError(null);
                                }}
                                placeholder={getPlaceholder()}
                                className="flex-1 min-w-0 w-full h-16 px-6 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-white placeholder:text-white/30 rounded-2xl text-lg font-black transition-all"
                                required
                            />
                        </div>

                        {/* Turnstile Container — DÉSACTIVÉ TEMPORAIREMENT */}
                        {/* <div ref={turnstileWidgetRef} className="my-4 flex justify-center min-h-[65px]"></div> */}

                        {error && (
                            <p className="text-[10px] font-black uppercase text-red-500 tracking-widest text-center mt-2">
                                {error}
                            </p>
                        )}

                        {cooldownSeconds > 0 && (
                            <p className="text-[11px] font-bold text-white/50 text-center mt-2">
                                Veuillez patienter {cooldownSeconds}s avant de pouvoir demander un nouveau code.
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !phone || cooldownSeconds > 0}
                            className="w-full h-16 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                "Continuer"
                            )}
                        </button>
                    </form>

                    <button
                        onClick={handleAlreadyHasCode}
                        className="w-full text-xs font-bold text-white/40 hover:text-white transition-colors text-center"
                    >
                        J'ai déjà reçu un code
                    </button>
                </div>
            )}

            {step === 'no_account' && (
                <div className="space-y-6 pt-2">
                    <p className="text-sm text-white/60 text-center font-medium bg-white/5 border border-white/10 rounded-2xl p-4">
                        💡 <span className="text-white font-bold">Conseil :</span> WhatsApp est fortement conseillé pour un accès instantané et sécurisé.
                    </p>

                    <div className="space-y-4">
                        {/* WhatsApp Button */}
                        <button
                            onClick={handleSmsRegistration}
                            className="w-full h-16 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3"
                        >
                            <svg className="size-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.008c6.56 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Continuer avec WhatsApp
                        </button>

                        {/* SMS Button */}
                        <button
                            onClick={handleSmsRegistration}
                            disabled={isLoading || cooldownSeconds > 0}
                            className="w-full h-16 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>💬</span>
                                    {isSessionInactive ? "Recevoir le code par SMS" : "Continuer par SMS"}
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <p className="text-[10px] font-black uppercase text-red-500 tracking-widest text-center">
                            {error}
                        </p>
                    )}

                    <button 
                        type="button"
                        onClick={() => {
                            setStep('phone');
                            setError(null);
                        }}
                        className="w-full text-xs font-bold text-white/40 hover:text-white transition-colors text-center"
                    >
                        Retour
                    </button>
                </div>
            )}

            {step === 'code' && (
                <div className="space-y-6 pt-2">
                    <form onSubmit={handleCodeSubmit} className="space-y-4">
                        <div className="relative group">
                            <input 
                                placeholder="Entrer le code" 
                                className={`w-full h-16 px-8 rounded-2xl bg-white/5 border border-white/10 transition-all outline-none text-center text-lg font-black tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:font-medium placeholder:text-white/20 ${
                                    error ? 'border-red-500/50 text-red-500' : 'focus:border-primary/20'
                                }`} 
                                type="text" 
                                maxLength={4}
                                value={verificationCode}
                                onChange={(e) => {
                                    setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 4));
                                    setError(null);
                                }}
                                autoFocus
                            />
                            {error && (
                                <p className="absolute -bottom-6 left-0 w-full text-[10px] font-black uppercase text-red-500 tracking-widest text-center">
                                    {error}
                                </p>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading || verificationCode.length !== 4}
                            className="w-full h-16 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-primary/20 mt-8 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                "Vérifier le code"
                            )}
                        </button>
                    </form>

                    <button 
                        type="button"
                        onClick={() => {
                            setStep('phone');
                            setError(null);
                            setVerificationCode('');
                        }}
                        className="w-full text-xs font-bold text-white/40 hover:text-white transition-colors text-center"
                    >
                        Retour
                    </button>
                </div>
            )}
        </ActionModal>
    );
}

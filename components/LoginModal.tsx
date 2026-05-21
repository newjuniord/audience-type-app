"use client";

import { useState, useEffect, useRef } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ActionModal } from "@/components/ui/ActionModal";
import {
    checkUserAction,
    registerOrFindUserAction,
    generateTempLinkAction,
    verifyTempLinkCodeAction,
    verifyTempLinkTokenAction
} from "@/app/actions/auth";

declare global {
    interface Window {
        turnstile?: any;
    }
}

interface LoginModalProps {
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

export default function LoginModal({
    isOpen,
    onClose,
    onSuccess,
    productName
}: LoginModalProps) {
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
            // Vérifier si l'utilisateur existe
            const checkData = await checkUserAction(cleanPhone);
            if (checkData.error) throw new Error(checkData.error);

            if (checkData.exists) {
                setTempUserId(checkData.userId || null);

                const genRes = await generateTempLinkAction(checkData.userId!, cleanPhone);
                if (genRes.error) {
                    resetTurnstile();
                    if (genRes.isBlocked) {
                        setError("Trop de tentatives de connexion (limite dépassée).");
                        return;
                    }
                    throw new Error(genRes.error);
                }

                incrementLocalCount(cleanPhone, 'sms');
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
            const regData = await registerOrFindUserAction(cleanPhone);
            if (regData.error) throw new Error(regData.error);
            setTempUserId(regData.userId || null);

            // 2. Send SMS verification code
            const genRes = await generateTempLinkAction(regData.userId!, cleanPhone);
            if (genRes.error) {
                resetTurnstile();
                if (genRes.isBlocked) {
                    throw new Error("Trop de tentatives de connexion par SMS (limite de 3/24h dépassée).");
                }
                throw new Error(genRes.error);
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
            const verifyData = await verifyTempLinkCodeAction(tempUserId || "", verificationCode.trim());
            if (verifyData.error) throw new Error(verifyData.error);

            const token = verifyData.token;
            if (!token) throw new Error("Token introuvable.");

            const tokenVerifyData = await verifyTempLinkTokenAction(token);
            if (tokenVerifyData.error) throw new Error(tokenVerifyData.error);
            if (!tokenVerifyData.customToken) throw new Error("Erreur de connexion.");

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
            const checkData = await checkUserAction(cleanPhone);
            if (checkData.error) throw new Error(checkData.error);
            
            if (checkData.exists) {
                setTempUserId(checkData.userId || null);
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
            return "Aucun compte n'est associé à ce numéro. Choisissez une méthode pour continuer.";
        }
        return `Saisissez le code d'accès à 4 chiffres envoyé par SMS pour débloquer ${productName}.`;
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
                        💬 <span className="text-white font-bold">Aucun compte trouvé</span> avec ce numéro.<br />
                        Créez un compte gratuitement pour continuer.
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={handleSmsRegistration}
                            disabled={isLoading || cooldownSeconds > 0}
                            className="w-full h-16 bg-primary hover:opacity-90 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>💬</span>
                                    Créer un compte par SMS
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

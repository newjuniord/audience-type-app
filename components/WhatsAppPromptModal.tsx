"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateUser } from "@/lib/users";

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
    { code: 'HN', name: 'Honduras',            dial: '+504', flag: '🇭🇳' },
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

export default function WhatsAppPromptModal() {
    const { user, userData, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [phone, setPhone] = useState("");
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

    const countryDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
                setShowCountryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!loading && user && userData && !userData.whatsappNumber && !hasBeenDismissed) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 2000);
            return () => clearTimeout(timer);
        } else {
            setIsOpen(false);
        }
    }, [user, userData, loading, hasBeenDismissed]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!user || !phone.trim()) return;

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

        setIsSubmitting(true);
        try {
            await updateUser(user.uid, { whatsappNumber: cleanPhone });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update WhatsApp number", error);
            setError("Impossible de mettre à jour votre numéro.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDismiss = () => {
        setIsOpen(false);
        setHasBeenDismissed(true);
        localStorage.setItem(`dismiss_whatsapp_prompt_${user?.uid}`, Date.now().toString());
    };

    useEffect(() => {
        if (user) {
            const lastDismiss = localStorage.getItem(`dismiss_whatsapp_prompt_${user.uid}`);
            if (lastDismiss) {
                const dismissDate = parseInt(lastDismiss);
                const now = Date.now();
                if (now - dismissDate < 24 * 60 * 60 * 1000) {
                    setHasBeenDismissed(true);
                }
            }
        }
    }, [user]);

    if (!isOpen) return null;

    const getPlaceholder = () => {
        if (selectedCountry.code === 'HT') return '34 56 7890';
        if (['US','CA','DO','PR','JM','TT','BB'].includes(selectedCountry.code)) return '809 484 2020';
        return '6 12 34 56';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white dark:bg-[#18181b] rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="relative p-8">
                    {/* Close button */}
                    <button 
                        onClick={handleDismiss}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-black/40 dark:text-white/40">close</span>
                    </button>

                    <div className="flex flex-col items-center text-center">
                        {/* Icon */}
                        <div className="size-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <svg className="size-10 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.895-5.335 11.898-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </div>

                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-3">Ajoutez votre WhatsApp</h2>
                        <p className="text-black/50 dark:text-white/50 text-sm mb-8 leading-relaxed">
                            Afin de mieux vous accompagner et vous tenir informé de l'évolution de vos cours, veuillez ajouter votre numéro WhatsApp.
                        </p>

                        <form onSubmit={handleSubmit} className="w-full space-y-4">
                            <div className="flex gap-2 relative w-full text-left">
                                {/* Country selector */}
                                <div className="relative shrink-0" ref={countryDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                        className="h-14 px-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl flex items-center gap-1.5 hover:bg-black/10 text-zinc-900 dark:text-white transition-all text-sm font-bold whitespace-nowrap"
                                    >
                                        <span className="text-base">{selectedCountry.flag}</span>
                                        <span className="text-zinc-500 dark:text-white/70">{selectedCountry.dial}</span>
                                        <svg className={`size-3 text-black/40 dark:text-white/40 transition-transform ${showCountryDropdown ? '-rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                    </button>

                                    {showCountryDropdown && (
                                        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 rounded-2xl shadow-xl z-50 py-2 max-h-60 overflow-y-auto">
                                            <div className="px-3 pb-2 pt-1 border-b border-black/5 dark:border-white/5 sticky top-0 bg-white dark:bg-[#18181b] z-10">
                                                <input
                                                    type="text"
                                                    placeholder="Rechercher..."
                                                    value={countrySearch}
                                                    onChange={(e) => setCountrySearch(e.target.value)}
                                                    className="w-full h-10 px-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl text-xs font-bold text-zinc-900 dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none"
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
                                                    className={`w-full px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 text-left transition-colors ${
                                                        selectedCountry.code === c.code ? 'bg-green-500/10 text-green-500' : 'text-zinc-700 dark:text-white/80'
                                                    }`}
                                                >
                                                    <span className="text-xl">{c.flag}</span>
                                                    <span className="flex-1 font-bold text-xs">{c.name}</span>
                                                    <span className="text-xs text-black/40 dark:text-white/40">{c.dial}</span>
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
                                    className="flex-1 min-w-0 w-full h-14 px-5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/40 text-zinc-900 dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 rounded-2xl text-base font-bold transition-all"
                                    required
                                />
                            </div>

                            {error && (
                                <p className="text-[10px] font-black uppercase text-red-500 tracking-widest text-center mt-2">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !phone}
                                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">save</span>
                                        Enregistrer
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="w-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-black/40 dark:text-white/40 font-bold py-3 rounded-2xl transition-all text-sm"
                            >
                                Plus tard
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

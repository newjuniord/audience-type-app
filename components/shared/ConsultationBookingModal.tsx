"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ActionModal } from "@/components/ui/ActionModal";
import { useAuth } from "@/context/AuthContext";
import { Service } from "@/lib/types";
import CheckoutModal from "@/components/buyer/CheckoutModal";
import LoginModal from "@/components/shared/LoginModal";
import BookingCalendar from "@/components/shared/booking/BookingCalendar";
import CountrySelect from "@/components/shared/booking/CountrySelect";
import {
    CountryInfo,
    detectBrowserTimezone,
    detectCountryFromPhone,
    detectCountryFromTimezone,
    formatInTimeZone,
    formatUtcOffset,
    getCountry,
    getDefaultTimezone,
    getTimezoneLabel,
} from "@/lib/timezones";
import {
    getBookingWindow,
    getServiceTimezone,
    getSessionMinutes,
    getMinNoticeHours,
    Slot,
} from "@/lib/slots";
import { getServiceCoach } from "@/lib/coaches";
import {
    createBookingHold,
    releaseBookingHold,
    subscribeToOccupiedSlots,
    SlotOccupancy,
    SlotUnavailableError,
} from "@/lib/booking-applications";

const CATEGORIES = [
    "Coaching Privé",
    "Brand Pèsonèl",
    "Kreyasyon Kontni",
    "Biznis Dijital",
    "Ekriti Liv/Ebook",
    "Storytelling ak Kominikasyon",
    "Estrateji AI pou travay / biznis",
];

/**
 * Le parcours est découpé en 8 écrans courts plutôt qu'en 6 longs : le choix de la date,
 * celui de l'heure et le récapitulatif tenaient chacun sur plus d'un écran et obligeaient
 * à faire défiler le modal. Un écran = une décision.
 */
const STEP_TITLES = [
    "Apèsi",
    "Kiyès ou ye",
    "Zòn lè w ak bezwen w",
    "Chwazi dat",
    "Chwazi lè",
    "Sijè a",
    "Verifye enfòmasyon",
    "Konfime epi peye",
];

const LAST_STEP = STEP_TITLES.length - 1;

/** "14:30" -> "2:30 PM" — l'audience lit surtout le format 12h. */
function to12h(time24: string): string {
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Formate une date calendaire "YYYY-MM-DD" déjà exprimée dans le fuseau du client.
 * On la fixe à midi UTC et on la lit en UTC : aucune conversion, donc aucun risque
 * de décalage d'un jour.
 */
function formatLongDate(dateStr: string): string {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    return formatInTimeZone(
        new Date(Date.UTC(y, m - 1, d, 12)),
        "UTC",
        { weekday: "long", day: "numeric", month: "long", year: "numeric" },
        "fr-FR"
    );
}

export interface ConsultationBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    service: Service | null;
}

export default function ConsultationBookingModal({
    isOpen,
    onClose,
    service,
}: ConsultationBookingModalProps) {
    const { user, userData } = useAuth();

    const [step, setStep] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [countryCode, setCountryCode] = useState("");
    const [nationalPhone, setNationalPhone] = useState("");
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [timezone, setTimezone] = useState("");
    const [category, setCategory] = useState("");
    const [subject, setSubject] = useState("");

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

    const [occupied, setOccupied] = useState<Map<string, SlotOccupancy>>(new Map());
    const [slotsLoading, setSlotsLoading] = useState(true);
    const [slotsError, setSlotsError] = useState<string | null>(null);

    const [now, setNow] = useState(() => new Date());
    const [isHolding, setIsHolding] = useState(false);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);

    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    /** Le paiement a été lancé : on ne libère plus le créneau en fermant le modal. */
    const paymentStartedRef = useRef(false);
    /** Le client vient de se connecter : reprendre la réservation dès que `user` arrive. */
    const [resumeAfterLogin, setResumeAfterLogin] = useState(false);

    const country = getCountry(countryCode);
    const userTimezone = timezone || detectBrowserTimezone();
    const serviceTimezone = service ? getServiceTimezone(service) : "UTC";
    // Le coach vient de l'offre : la plateforme accueille plusieurs formateurs.
    const coach = service ? getServiceCoach(service) : null;
    const coachName = coach?.name || "kòch la";
    const sessionMinutes = service ? getSessionMinutes(service) : 60;

    // ── Réinitialisation à l'ouverture ────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setStep(0);
        setError(null);
        setSlotsError(null);
        setNow(new Date());
        setBookingId(null);
        setHoldExpiresAt(null);
        paymentStartedRef.current = false;
    }, [isOpen]);

    // ── Pré-remplissage : compte, puis téléphone, puis fuseau du navigateur ────
    useEffect(() => {
        if (!isOpen) return;

        const rawPhone = (userData?.phone || userData?.phoneNumber || "")
            .replace("whatsapp:", "")
            .replace(/["']/g, "")
            .trim();

        const detected =
            detectCountryFromPhone(rawPhone) || detectCountryFromTimezone(detectBrowserTimezone());

        setName((prev) => prev || userData?.fullName || userData?.displayName || user?.displayName || "");
        setEmail((prev) => prev || userData?.email || user?.email || "");

        setCountryCode((prev) => prev || detected?.code || "");
        setTimezone((prev) => prev || detectBrowserTimezone());

        if (rawPhone && detected) {
            // On retire l'indicatif pour ne garder que le numéro national dans le champ.
            const digits = rawPhone.replace(/\D/g, "");
            const dial = detected.dialCode.replace("+", "");
            setNationalPhone((prev) => prev || (digits.startsWith(dial) ? digits.slice(dial.length) : digits));
        }
    }, [isOpen, user, userData]);

    // ── Fenêtre de réservation (créneaux théoriques du service) ───────────────
    const bookingWindow = useMemo(() => {
        if (!service?.id) return null;
        return getBookingWindow(service, userTimezone, now);
    }, [service, userTimezone, now]);

    // ── Occupation réelle, en direct depuis Firestore ─────────────────────────
    useEffect(() => {
        if (!isOpen || !service?.id || !bookingWindow) return;

        const first = bookingWindow.slots[0];
        const last = bookingWindow.slots[bookingWindow.slots.length - 1];
        if (!first || !last) {
            setOccupied(new Map());
            setSlotsLoading(false);
            return;
        }

        setSlotsLoading(true);
        const unsubscribe = subscribeToOccupiedSlots(
            service.id,
            first.startUtc,
            last.startUtc,
            (next) => {
                setOccupied(next);
                setSlotsLoading(false);
                setSlotsError(null);
            },
            (err) => {
                console.error("Erreur de lecture des créneaux:", err);
                setSlotsLoading(false);
                setSlotsError("Nou pa ka verifye lè ki lib yo kounye a. Tanpri rechaje paj la.");
            }
        );

        return unsubscribe;
    }, [isOpen, service?.id, bookingWindow]);

    /** Un créneau est libre s'il n'est ni payé ni bloqué par quelqu'un d'autre. */
    const isSlotFree = useCallback((slot: Slot) => !occupied.has(slot.slotId), [occupied]);

    const availableDates = useMemo(() => {
        const dates = new Set<string>();
        if (!bookingWindow) return dates;
        for (const [date, slots] of bookingWindow.slotsByDate) {
            if (slots.some(isSlotFree)) dates.add(date);
        }
        return dates;
    }, [bookingWindow, isSlotFree]);

    const daySlots = useMemo(
        () => (selectedDate && bookingWindow ? bookingWindow.slotsByDate.get(selectedDate) ?? [] : []),
        [selectedDate, bookingWindow]
    );

    const selectedSlot = useMemo(
        () => daySlots.find((s) => s.slotId === selectedSlotId) ?? null,
        [daySlots, selectedSlotId]
    );

    /** Prochain créneau libre, mis en avant pour raccourcir le parcours. */
    const nextFreeSlot = useMemo(
        () => bookingWindow?.slots.find(isSlotFree) ?? null,
        [bookingWindow, isSlotFree]
    );

    // Changer de fuseau change les dates locales : la sélection précédente n'a plus de sens.
    useEffect(() => {
        setSelectedDate("");
        setSelectedSlotId(null);
    }, [userTimezone, service?.id]);

    // ── Validation du téléphone (métadonnées chargées à la demande) ───────────
    useEffect(() => {
        if (!country || !nationalPhone.trim()) {
            setPhoneError(null);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            const e164 = `${country.dialCode}${nationalPhone.replace(/\D/g, "")}`;
            try {
                // Import dynamique : les métadonnées téléphoniques pèsent lourd et ne
                // servent qu'ici, inutile de les mettre dans le bundle initial.
                const { isValidPhoneNumber } = await import("react-phone-number-input");
                if (cancelled) return;
                setPhoneError(isValidPhoneNumber(e164) ? null : "Nimewo sa a pa sanble valab pou peyi sa a.");
            } catch {
                if (cancelled) return;
                // Repli si les métadonnées ne se chargent pas : contrôle de longueur E.164.
                const digits = e164.replace(/\D/g, "");
                setPhoneError(digits.length >= 8 && digits.length <= 15 ? null : "Nimewo telefòn nan pa konplè.");
            }
        }, 350);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [country, nationalPhone]);

    const fullPhone = country ? `${country.dialCode} ${nationalPhone.trim()}` : nationalPhone.trim();

    // ── Compte à rebours du créneau bloqué ───────────────────────────────────
    const [holdRemaining, setHoldRemaining] = useState<number | null>(null);
    useEffect(() => {
        if (!holdExpiresAt) { setHoldRemaining(null); return; }
        const tick = () => setHoldRemaining(Math.max(0, holdExpiresAt - Date.now()));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [holdExpiresAt]);

    // ── Libération du créneau si le client abandonne ─────────────────────────
    const handleClose = useCallback(() => {
        if (bookingId && !paymentStartedRef.current) {
            // Rendre la place tout de suite plutôt que d'attendre les 30 minutes d'expiration.
            releaseBookingHold(bookingId).catch((err) =>
                console.error("Impossible de libérer le créneau:", err)
            );
        }
        onClose();
    }, [bookingId, onClose]);

    const goNext = () => { setError(null); setStep((s) => Math.min(s + 1, LAST_STEP)); };
    const goBack = () => { setError(null); setStep((s) => Math.max(s - 1, 0)); };

    const stepIsValid = (() => {
        switch (step) {
            case 1: return name.trim().length >= 2 && !!country && !!nationalPhone.trim() && !phoneError;
            case 2: return !!timezone && !!category;
            case 3: return !!selectedDate;
            case 4: return !!selectedSlot;
            case 5: return subject.trim().length >= 10;
            default: return true;
        }
    })();

    // ── Blocage du créneau puis paiement ─────────────────────────────────────
    const handleConfirm = async () => {
        if (!service?.id || !selectedSlot) return;

        // Les règles Firestore exigent un compte : sans connexion, impossible d'enregistrer.
        if (!user) { setResumeAfterLogin(true); setIsLoginOpen(true); return; }

        setIsHolding(true);
        setError(null);
        try {
            const priceUSD = parseFloat(String(service.price ?? "0").replace(/[^0-9.]/g, "")) || 0;

            const result = await createBookingHold({
                serviceId: service.id,
                serviceName: service.title || "Konsiltasyon",
                coachId: service.coachId,
                coachName: service.coachName,
                slotId: selectedSlot.slotId,
                startUtc: selectedSlot.startUtc,
                endUtc: selectedSlot.endUtc,
                durationMinutes: selectedSlot.durationMinutes,

                userId: user.uid,
                userName: name.trim(),
                userPhone: fullPhone,
                userEmail: email.trim() || user.email || "",

                bookingDate: selectedSlot.baseDate,
                bookingTime: selectedSlot.baseTime,
                serviceTimezone,

                customerDate: selectedSlot.localDate,
                customerTime: selectedSlot.localTime,
                customerTimezone: userTimezone,
                customerCountry: country?.code || "",

                category,
                subject: subject.trim(),
                amount: priceUSD,
                currency: "USD",
            });

            setBookingId(result.bookingId);
            setHoldExpiresAt(result.holdExpiresAtMs);
            setIsCheckoutOpen(true);
        } catch (err) {
            if (err instanceof SlotUnavailableError) {
                // Quelqu'un a pris le créneau entre-temps : on renvoie au choix de l'heure,
                // la date reste valable.
                setError(err.message);
                setSelectedSlotId(null);
                setStep(4);
            } else {
                console.error("Erreur de réservation:", err);
                setError("Nou pa ka anrejistre rezèvasyon w la kounye a. Tanpri re-eseye.");
            }
        } finally {
            setIsHolding(false);
        }
    };

    // La connexion est asynchrone : `user` n'est peuplé qu'au rendu suivant, on ne peut
    // donc pas relancer la réservation directement depuis le callback de succès.
    useEffect(() => {
        if (!resumeAfterLogin || isLoginOpen || !user) return;
        setResumeAfterLogin(false);
        void handleConfirm();
        // `handleConfirm` est recréé à chaque rendu ; le vrai déclencheur est l'arrivée de `user`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resumeAfterLogin, isLoginOpen, user]);

    // ── Rendu ────────────────────────────────────────────────────────────────

    const labelClass = "text-[10px] font-black tracking-widest uppercase text-white/50";
    const inputClass =
        "w-full text-sm rounded-xl px-4 py-3 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary placeholder:text-white/20";
    const primaryButton =
        "flex-1 h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
    const backButton =
        "w-14 h-14 shrink-0 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-colors";

    const renderNav = (nextLabel = "Kontinye") => (
        <div className="pt-4 flex gap-3">
            <button type="button" onClick={goBack} className={backButton} aria-label="Tounen">
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <button type="button" onClick={goNext} disabled={!stepIsValid} className={primaryButton}>
                {nextLabel}
            </button>
        </div>
    );

    const renderOverview = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 pt-2">
            <h3 className="text-2xl font-black uppercase tracking-tight mb-2 text-white">
                {service?.title || "Konsiltasyon Prive"}
            </h3>
            {/* Description limitée à 3 lignes : le détail complet est sur la carte de l'offre,
                cet écran doit tenir sans défilement. */}
            <p className="text-sm text-white/60 leading-relaxed mb-4 line-clamp-3">
                {service?.description ||
                    "Ou vle pale avè m dirèkteman pou nou ranje biznis ou, kreye yon plan pou kontni w oswa ede w avanse ?"}
            </p>

            {/* Grille 2 colonnes : quatre lignes empilées débordaient sur les petits écrans. */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                    {
                        icon: "timer",
                        text: `${sessionMinutes} minit`,
                    },
                    {
                        icon: "video_camera_front",
                        text: "Apèl / Videyo",
                    },
                    {
                        icon: "monetization_on",
                        text: `$${service?.price || "..."}${service?.priceHTG ? ` / ${service.priceHTG.toLocaleString("fr-HT")} HTG` : ""}`,
                    },
                    {
                        icon: "public",
                        text: `Lè ${getTimezoneLabel(userTimezone)}`,
                    },
                ].map((item) => (
                    <div key={item.icon} className="flex items-center gap-2 bg-white/5 px-3 py-3 rounded-xl border border-white/5 min-w-0">
                        <span className="material-symbols-outlined text-emerald-400 text-[18px] shrink-0">{item.icon}</span>
                        <span className="text-xs font-bold text-white truncate">{item.text}</span>
                    </div>
                ))}
            </div>

            {nextFreeSlot && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">
                        Pwochen plas ki lib
                    </p>
                    <p className="text-sm font-bold text-white">
                        {formatLongDate(nextFreeSlot.localDate)} — {to12h(nextFreeSlot.localTime)}
                    </p>
                </div>
            )}

            <button
                type="button"
                onClick={goNext}
                className="w-full h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
                Rezève kounya
            </button>
        </div>
    );

    const renderIdentity = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-3 pt-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Enfòmasyon pèsonèl</h3>

            <div className="flex flex-col gap-2">
                <label htmlFor="booking-name" className={labelClass}>Non ak siyati *</label>
                <input
                    id="booking-name" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Non konplè w" className={inputClass} autoComplete="name"
                />
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="booking-email" className={labelClass}>Imel *</label>
                <input
                    id="booking-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="ou@imel.com" className={inputClass} autoComplete="email"
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className={labelClass}>Peyi w *</label>
                <CountrySelect
                    value={countryCode}
                    onChange={(c: CountryInfo) => {
                        setCountryCode(c.code);
                        // Le fuseau suit le pays, sauf si le pays en compte plusieurs :
                        // dans ce cas l'étape suivante laisse le client préciser.
                        setTimezone(getDefaultTimezone(c.code));
                    }}
                />
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="booking-phone" className={labelClass}>Nimewo telefòn / WhatsApp *</label>
                <div className="flex gap-2">
                    <span className="shrink-0 flex items-center gap-2 px-4 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-white">
                        <span className="text-base leading-none">{country?.flag || "🌍"}</span>
                        {country?.dialCode || "+"}
                    </span>
                    <input
                        id="booking-phone" type="tel" inputMode="tel" autoComplete="tel-national"
                        value={nationalPhone} onChange={(e) => setNationalPhone(e.target.value)}
                        placeholder={country?.phoneExample || "123 456 789"}
                        className={inputClass}
                        aria-invalid={!!phoneError}
                    />
                </div>
                {phoneError && (
                    <p className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        {phoneError}
                    </p>
                )}
            </div>

            {renderNav()}
        </div>
    );

    const renderTimezoneAndNeed = () => {
        const zones = country?.timezones ?? [];
        const localNow = formatInTimeZone(
            now, userTimezone,
            { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: true },
            "fr-FR"
        );

        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5 pt-2">
                <h3 className="text-xl font-black uppercase tracking-tight text-white">Zòn lè ak bezwen</h3>

                {zones.length > 1 ? (
                    <div className="flex flex-col gap-2">
                        <label htmlFor="booking-tz" className={labelClass}>Zòn lè w ({country?.name}) *</label>
                        <div className="relative">
                            <select
                                id="booking-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}
                                className={`${inputClass} appearance-none pr-10`}
                            >
                                {zones.map((tz) => (
                                    <option key={tz.id} value={tz.id} className="text-black">
                                        {tz.label}
                                    </option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                                expand_more
                            </span>
                        </div>
                    </div>
                ) : null}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5">schedule</span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                            Lè kote w kounye a
                        </p>
                        <p className="text-sm font-bold text-white">
                            {localNow} · {formatUtcOffset(userTimezone)}
                        </p>
                        <p className="text-[11px] text-white/40 mt-1">
                            Tout lè nou pral montre w yo ap nan zòn lè sa a.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="booking-category" className={labelClass}>Kategori / Rezon *</label>
                    <div className="relative">
                        <select
                            id="booking-category" value={category} onChange={(e) => setCategory(e.target.value)}
                            className={`${inputClass} appearance-none pr-10`}
                        >
                            <option value="" className="text-black">— Chwazi —</option>
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c} className="text-black">{c}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                            expand_more
                        </span>
                    </div>
                </div>

                {renderNav()}
            </div>
        );
    };

    /** Étape 4 : le calendrier occupe l'écran à lui seul. */
    const renderDate = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4 pt-2">
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-black uppercase tracking-tight text-white">Chwazi yon dat</h3>
                <span className="shrink-0 text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                    {formatUtcOffset(userTimezone)}
                </span>
            </div>

            {slotsError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                    {slotsError}
                </div>
            )}

            {bookingWindow && (
                <BookingCalendar
                    value={selectedDate}
                    onChange={(d) => { setSelectedDate(d); setSelectedSlotId(null); }}
                    availableDates={availableDates}
                    minDate={bookingWindow.minDate}
                    maxDate={bookingWindow.maxDate}
                    loading={slotsLoading}
                />
            )}

            {renderNav("Chwazi lè a")}
        </div>
    );

    /** Étape 5 : la grille horaire seule, avec la date choisie rappelée en tête. */
    const renderTime = () => {
        const minNotice = service ? getMinNoticeHours(service) : 24;

        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4 pt-2">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Chwazi yon lè</h3>
                    <span className="shrink-0 text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                        {formatUtcOffset(userTimezone)}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={goBack}
                    className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-primary text-[18px]">event</span>
                    <span className="flex-1 min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-white/40">Dat chwazi a</span>
                        <span className="block text-xs font-bold text-white truncate">{formatLongDate(selectedDate)}</span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0">Chanje</span>
                </button>

                <div className="flex flex-col gap-2">
                    <div className={`${labelClass} flex items-center justify-between`}>
                        <span>Lè konsiltasyon *</span>
                        {slotsLoading && (
                            <span className="text-[9px] font-semibold text-primary/80 normal-case flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 border border-primary border-t-transparent rounded-full animate-spin" />
                                n ap verifye plas yo...
                            </span>
                        )}
                    </div>

                    {daySlots.length === 0 ? (
                        <div className="p-5 rounded-xl text-center text-xs font-medium border border-dashed border-white/15 bg-white/[0.02] text-white/40">
                            Pa gen plas pou dat sa a. Tounen chwazi yon lòt jou.
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {daySlots.map((slot) => {
                                const state = occupied.get(slot.slotId);
                                const isTaken = !!state;
                                const isSelected = selectedSlotId === slot.slotId;

                                return (
                                    <button
                                        key={slot.slotId}
                                        type="button"
                                        disabled={isTaken}
                                        onClick={() => setSelectedSlotId(slot.slotId)}
                                        aria-pressed={isSelected}
                                        title={
                                            state === "booked" ? "Deja rezève"
                                                : state === "held" ? "Yon moun ap peye pou li kounye a"
                                                    : `Lè ${coachName}: ${to12h(slot.baseTime)}`
                                        }
                                        className={`py-3 px-1 text-xs font-bold rounded-xl transition-all border ${
                                            isTaken
                                                ? "bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed line-through"
                                                : isSelected
                                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                                                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20"
                                        }`}
                                    >
                                        {to12h(slot.localTime)}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {selectedSlot && (
                        <p className="text-[11px] text-white/40 leading-relaxed px-1">
                            Sa koresponn ak <span className="font-bold text-white/70">{to12h(selectedSlot.baseTime)}</span>{" "}
                            nan zòn lè {coachName} ({getTimezoneLabel(serviceTimezone)}) · omwen {minNotice}h alavans.
                        </p>
                    )}
                </div>

                {renderNav()}
            </div>
        );
    };

    const renderSubject = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5 pt-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Sijè konsiltasyon an</h3>

            <div className="flex flex-col gap-2">
                <label htmlFor="booking-subject" className={labelClass}>Sijè an detay *</label>
                <textarea
                    id="booking-subject" rows={6} value={subject} onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ekri yon ti esplikasyon sou pwoblèm ou vle ranje a..."
                    className={`${inputClass} resize-none`}
                />
                <p className="text-[11px] text-white/30">
                    {subject.trim().length < 10
                        ? `Ekri omwen 10 karaktè (${subject.trim().length}/10).`
                        : "Pi plis detay ou bay, pi byen konsiltasyon an pral prepare."}
                </p>
            </div>

            {renderNav()}
        </div>
    );

    /** Ligne de récapitulatif ; `onEdit` renvoie à l'étape qui produit la valeur. */
    const summaryRow = (
        icon: string,
        label: string,
        value: React.ReactNode,
        onEdit?: () => void
    ) => (
        <li key={label} className="flex items-start gap-3">
            <div className="mt-0.5 size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px] text-white/70">{icon}</span>
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-0.5">{label}</p>
                <div className="text-xs font-bold text-white leading-snug break-words">{value || "—"}</div>
            </div>
            {onEdit && (
                <button
                    type="button" onClick={onEdit}
                    className="shrink-0 text-[9px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors px-1 py-0.5"
                >
                    Chanje
                </button>
            )}
        </li>
    );

    /** Étape 6 : uniquement l'identité, chaque ligne renvoyant à son étape d'origine. */
    const renderReviewIdentity = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4 pt-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Verifye enfòmasyon w yo</h3>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <ul className="flex flex-col gap-3">
                    {summaryRow("person", "Non ak siyati", name, () => setStep(1))}
                    {summaryRow("mail", "Imel", email, () => setStep(1))}
                    {summaryRow("call", "Telefòn", fullPhone, () => setStep(1))}
                    {summaryRow("public", "Peyi", country ? `${country.flag} ${country.name}` : "", () => setStep(1))}
                </ul>
            </div>

            {renderNav("Kontinye")}
        </div>
    );

    /** Étape 7 : le rendez-vous, le prix et le paiement — rien d'autre. */
    const renderConfirm = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-3 pt-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Konfime epi peye</h3>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <ul className="flex flex-col gap-3">
                    {summaryRow(
                        "event",
                        "Randevou",
                        selectedSlot ? (
                            <>
                                {formatLongDate(selectedSlot.localDate)}
                                <span className="block font-normal text-white/50 mt-0.5">
                                    {to12h(selectedSlot.localTime)} ({formatUtcOffset(userTimezone)}) · {selectedSlot.durationMinutes} min
                                </span>
                            </>
                        ) : null,
                        () => setStep(3)
                    )}
                    {summaryRow("label", "Kategori", category, () => setStep(2))}
                    {summaryRow("subject", "Sijè", subject, () => setStep(5))}
                </ul>
            </div>

            <div className="rounded-2xl px-4 py-2.5 bg-primary/10 border border-primary/20 flex items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Total</p>
                    <p className="text-[11px] text-white/50">Peman sekirize</p>
                </div>
                <div className="text-xl font-black text-white text-right leading-tight">
                    ${service?.price}
                    {service?.priceHTG ? (
                        <span className="block text-[11px] font-bold text-white/50">
                            {service.priceHTG.toLocaleString("fr-HT")} HTG
                        </span>
                    ) : null}
                </div>
            </div>

            {!user && (
                <p className="text-[11px] font-semibold text-amber-300/90 flex items-start gap-2 px-1">
                    <span className="material-symbols-outlined text-[14px] mt-px">lock</span>
                    <span>Ou dwe konekte pou nou ka kenbe plas ou a.</span>
                </p>
            )}

            <div className="flex gap-3">
                <button type="button" onClick={goBack} className={backButton} aria-label="Tounen">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button
                    type="button" onClick={handleConfirm} disabled={isHolding || !selectedSlot}
                    className="flex-1 h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest hover:bg-primary/90 disabled:opacity-40 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-colors"
                >
                    {isHolding ? (
                        <>
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            N ap kenbe plas ou a...
                        </>
                    ) : (
                        "Konfime epi Peye"
                    )}
                </button>
            </div>
        </div>
    );

    const steps = [
        renderOverview,
        renderIdentity,
        renderTimezoneAndNeed,
        renderDate,
        renderTime,
        renderSubject,
        renderReviewIdentity,
        renderConfirm,
    ];

    return (
        <>
            <ActionModal
                isOpen={isOpen && !isCheckoutOpen && !isLoginOpen}
                onClose={handleClose}
                title="Rezèvasyon"
                subtitle={`${coachName} · Etap ${step + 1}/${LAST_STEP + 1}`}
                iconEmoji="📅"
            >
                <div className="flex gap-2 mb-8" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={LAST_STEP + 1}>
                    {STEP_TITLES.map((title, idx) => (
                        <div
                            key={title}
                            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                                idx <= step ? "bg-primary" : "bg-white/10"
                            }`}
                        />
                    ))}
                </div>

                {/* Affiché au niveau du modal : un créneau perdu renvoie à l'étape de l'heure,
                    l'erreur doit rester visible après ce saut d'étape. */}
                {error && (
                    <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-400">
                        {error}
                    </div>
                )}

                {holdRemaining !== null && holdRemaining > 0 && (
                    <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">lock_clock</span>
                        Plas ou a kenbe pou {Math.floor(holdRemaining / 60000)}:
                        {String(Math.floor((holdRemaining % 60000) / 1000)).padStart(2, "0")}
                    </div>
                )}

                {steps[step]()}
            </ActionModal>

            {isLoginOpen && (
                <LoginModal
                    isOpen={isLoginOpen}
                    onClose={() => { setIsLoginOpen(false); setResumeAfterLogin(false); }}
                    onSuccess={() => setIsLoginOpen(false)}
                    productName={service?.title || "Konsiltasyon"}
                />
            )}

            {isCheckoutOpen && (
                <CheckoutModal
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                    bookingId={bookingId ?? undefined}
                    onBeforePaymentRedirect={async () => {
                        // Au-delà de ce point, le créneau reste bloqué : le client part payer.
                        paymentStartedRef.current = true;
                    }}
                    product={{
                        id: service?.id || "",
                        title: service?.title || "Konsiltasyon",
                        priceHTG:
                            typeof service?.priceHTG === "number"
                                ? service.priceHTG
                                : parseFloat(String(service?.priceHTG || "0")) || 0,
                        price:
                            typeof service?.price === "number"
                                ? service.price
                                : parseFloat(String(service?.price || "0").replace(/[^0-9.]/g, "")) || 0,
                        currency: "$",
                        type: "service",
                        image: service?.imageUrl || "",
                        headline: selectedSlot
                            ? `${formatLongDate(selectedSlot.localDate)} · ${to12h(selectedSlot.localTime)}`
                            : "Rezèvasyon lè konsiltasyon w la",
                    }}
                />
            )}
        </>
    );
}

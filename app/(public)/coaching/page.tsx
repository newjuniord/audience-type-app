"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardHeader from "@/components/buyer/DashboardHeader";
import DashboardFooter from "@/components/buyer/DashboardFooter";
import ConsultationBookingModal from "@/components/shared/ConsultationBookingModal";
import { Service } from "@/lib/types";
import { getServices } from "@/lib/services";
import { getOccupiedSlotsForServices, SlotOccupancy } from "@/lib/booking-applications";
import { groupServicesByCoach, Coach } from "@/lib/coaches";
import { getBookingWindow, getServiceTimezone, getSessionMinutes, Slot } from "@/lib/slots";
import {
    detectBrowserTimezone,
    detectCountryFromTimezone,
    formatInTimeZone,
    formatUtcOffset,
    getTimezoneLabel,
} from "@/lib/timezones";

const HOW_IT_WORKS = [
    { icon: "public", title: "Nou detekte peyi w", desc: "Zòn lè w la chwazi otomatikman. Ou wè chak lè nan lè pa w — pa gen kalkil pou w fè." },
    { icon: "event_available", title: "Chwazi yon plas ki lib", desc: "Kalandriye a montre sèlman jou ak lè ki toujou disponib, an tan reyèl." },
    { icon: "lock_clock", title: "Nou kenbe plas ou a", desc: "Depi w konfime, plas la bloke pou 30 minit pandan w ap peye. Pèsonn pa ka pran l." },
    { icon: "check_circle", title: "Konfimasyon", desc: "Apre peman an, rezèvasyon w la konfime epi li parèt nan tablodbò w." },
];

function to12h(time24: string): string {
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDayLabel(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    return formatInTimeZone(
        new Date(Date.UTC(y, m - 1, d, 12)),
        "UTC",
        { weekday: "long", day: "numeric", month: "long" },
        "fr-FR"
    );
}

/**
 * Horloge du visiteur + horloge de chaque coach.
 *
 * C'est la garantie visuelle contre le rendez-vous raté : le visiteur voit d'un coup
 * d'œil qu'il est 9h chez lui et 22h chez le coach, avant même d'ouvrir le calendrier.
 */
function TimezoneBanner({ userTimezone, coaches }: { userTimezone: string; coaches: Coach[] }) {
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        // L'horloge ne démarre qu'après le montage : l'heure diffère entre le rendu
        // serveur et le navigateur et provoquerait une erreur d'hydratation.
        const update = () => setNow(new Date());
        const first = setTimeout(update, 0);
        const interval = setInterval(update, 30_000);
        return () => { clearTimeout(first); clearInterval(interval); };
    }, []);

    const country = detectCountryFromTimezone(userTimezone);
    const clockOptions: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: true };

    // Pour un fuseau à offset fixe, le libellé EST déjà le décalage : ne pas le répéter.
    const zoneName = (tz: string) => {
        const label = getTimezoneLabel(tz);
        const offset = formatUtcOffset(tz);
        return label === offset ? offset : `${label} · ${offset}`;
    };

    return (
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-xl">
                    {country?.flag || "\u{1F30D}"}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Lè kote w</p>
                    <p className="text-sm font-black text-white truncate">
                        {now ? formatInTimeZone(now, userTimezone, clockOptions, "fr-FR") : "--:--"}
                        <span className="text-white/40 font-bold ml-2 text-xs">{zoneName(userTimezone)}</span>
                    </p>
                </div>
            </div>

            {coaches.map((coach) => (
                <div key={coach.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    {coach.photoUrl ? (
                        <img src={coach.photoUrl} alt={coach.name} className="size-11 rounded-xl object-cover shrink-0" />
                    ) : (
                        <div className="size-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-white/60">record_voice_over</span>
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 truncate">
                            Lè {coach.name}
                        </p>
                        <p className="text-sm font-black text-white truncate">
                            {now ? formatInTimeZone(now, coach.timezone, clockOptions, "fr-FR") : "--:--"}
                            <span className="text-white/40 font-bold ml-2 text-xs">{zoneName(coach.timezone)}</span>
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function CoachingPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [heroImageSrc] = useState("/coaching_hero.png");

    const [services, setServices] = useState<Service[]>([]);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [occupied, setOccupied] = useState<Map<string, SlotOccupancy>>(new Map());
    const [userTimezone, setUserTimezone] = useState("UTC");

    // Le fuseau ne se lit que côté navigateur : le résoudre au rendu serveur
    // afficherait l'heure du datacenter.
    useEffect(() => setUserTimezone(detectBrowserTimezone()), []);

    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const fetched = await getServices();
            setServices(fetched.filter((s) => s.active));
        } catch (e) {
            console.error("Erreur lors du chargement des services:", e);
            setLoadError("Nou pa ka chaje òf yo kounye a. Tanpri rechaje paj la.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadServices(); }, [loadServices]);

    // Créneaux théoriques de chaque offre, dans le fuseau du visiteur.
    const windowsByService = useMemo(() => {
        const map = new Map<string, ReturnType<typeof getBookingWindow>>();
        for (const service of services) {
            if (service.id) map.set(service.id, getBookingWindow(service, userTimezone));
        }
        return map;
    }, [services, userTimezone]);

    // Occupation réelle, pour ne pas annoncer un créneau déjà pris.
    useEffect(() => {
        const ids = services.map((s) => s.id).filter((id): id is string => !!id);
        if (ids.length === 0) return;

        let cancelled = false;
        const from = new Date();
        const to = new Date(from.getTime() + 60 * 86400_000);

        getOccupiedSlotsForServices(ids, from, to)
            .then((result) => { if (!cancelled) setOccupied(result); })
            .catch((err) => console.error("Erreur de lecture des créneaux:", err));

        return () => { cancelled = true; };
    }, [services]);

    const nextSlotByService = useMemo(() => {
        const map = new Map<string, Slot | null>();
        for (const [serviceId, window] of windowsByService) {
            map.set(serviceId, window.slots.find((slot) => !occupied.has(slot.slotId)) ?? null);
        }
        return map;
    }, [windowsByService, occupied]);

    // Côté public, une offre sans coach assigné s'affiche sous un nom générique :
    // « Pa asiyen » est un signal d'administration, pas quelque chose à montrer au client.
    const coaches = useMemo(
        () => groupServicesByCoach(services).map((c) =>
            c.id === "__unassigned__" ? { ...c, name: "Kòch DJR" } : c
        ),
        [services]
    );

    const handleOpenModal = (service?: Service) => {
        const target = service ?? services[0];
        if (!target) return;
        setSelectedService(target);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-background-dark text-white font-display flex flex-col">
            <DashboardHeader />

            <main className="flex-1">
                {/* HERO */}
                <section className="relative px-6 pt-32 pb-24 overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(242,140,40,0.15),transparent_50%)]" />
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.02),transparent_50%)]" />

                    <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
                        <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
                                <span className="material-symbols-outlined text-[14px] text-primary">psychology</span>
                                <span className="text-primary text-[10px] font-black uppercase tracking-widest">Coaching &amp; Konsiltasyon Prive</span>
                            </div>

                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-white mb-6">
                                Coaching <span className="text-primary">Prive</span>
                            </h1>

                            <p className="text-lg text-white/70 leading-relaxed mb-6 font-medium">
                                Yon pwogram pèsonalize pou <strong className="text-white">pastè, pè, paran, lidè, politisyen, vandè, CEO ak enfliyansè</strong> ki vle aprann pale ak plis klète, otorite, emosyon ak konviksyon, pou yo ka enfliyanse, konvenk, dirije epi touche moun yo ap adrese yo.
                            </p>

                            <p className="text-sm text-white/40 mb-10 flex items-center gap-2 font-bold">
                                <span className="material-symbols-outlined text-[18px] text-primary">language</span>
                                Disponib depi tout peyi — nou konvèti lè yo nan zòn lè pa w
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                <button
                                    onClick={() => handleOpenModal()}
                                    disabled={loading || services.length === 0}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-full font-black uppercase tracking-wide text-sm hover:bg-primary/90 hover:scale-105 transition-all active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-xl shadow-primary/30"
                                >
                                    <span className="material-symbols-outlined">rocket_launch</span>
                                    {loading ? "N ap chaje..." : services.length === 0 ? "Pa gen òf kounye a" : "Kòmanse Kounye A"}
                                </button>
                            </div>
                        </div>

                        <div className="w-full relative group">
                            <div className="w-full rounded-[2.5rem] p-2.5 bg-gradient-to-br from-white/15 via-white/5 to-primary/10 border border-white/15 shadow-2xl shadow-primary/20 relative overflow-hidden backdrop-blur-xl">
                                <img
                                    src={heroImageSrc}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1200&auto=format&fit=crop";
                                    }}
                                    alt="DJR Akademi Elite Coaching Visual"
                                    className="w-full h-auto rounded-[2rem] object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-background-dark/60 via-transparent to-transparent pointer-events-none rounded-[2rem]" />
                            </div>

                            <div className="flex items-center justify-center gap-6 mt-6">
                                <div className="flex items-center gap-2 text-white/40">
                                    <span className="material-symbols-outlined text-[16px]">verified</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Sètifye</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/40">
                                    <span className="material-symbols-outlined text-[16px]">lock</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Konfidansyèl</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/40">
                                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Tan reyèl</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HORLOGES */}
                <section className="py-8 px-6 border-b border-white/5">
                    <TimezoneBanner userTimezone={userTimezone} coaches={coaches} />
                </section>

                {/* OFFRES */}
                <section className="py-20 px-6 border-b border-white/5 bg-white/[0.01]">
                    <div className="max-w-[1200px] mx-auto">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="size-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
                                <span className="text-xl">📅</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white leading-tight">Òf Coaching Nou Yo</h2>
                                <p className="text-sm text-white/40">
                                    {coaches.length > 1 ? `${coaches.length} kòch · ` : ""}Chwazi fòmil ki bon pou ou
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 h-[420px] animate-pulse" />
                                ))}
                            </div>
                        ) : loadError ? (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-10 text-center">
                                <span className="material-symbols-outlined text-4xl text-red-400/60 mb-4 block">error</span>
                                <p className="text-white/60 font-medium mb-6">{loadError}</p>
                                <button
                                    onClick={loadServices}
                                    className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest transition-colors"
                                >
                                    Re-eseye
                                </button>
                            </div>
                        ) : services.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-center">
                                <span className="material-symbols-outlined text-4xl text-white/30 mb-4 block">event_busy</span>
                                <p className="text-white/50 font-medium">Aucune offre de coaching n&apos;est disponible pour le moment.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {services.map((service) => {
                                    const nextSlot = service.id ? nextSlotByService.get(service.id) : null;
                                    const duration = getSessionMinutes(service);

                                    return (
                                        <div
                                            key={service.id}
                                            className="bg-white/[0.02] border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col h-full hover:bg-white/[0.04] transition-all group"
                                        >
                                            {/* Coach qui anime : la plateforme accueille plusieurs formateurs. */}
                                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                                                {service.coachPhotoUrl ? (
                                                    <img src={service.coachPhotoUrl} alt={service.coachName || "Kòch"} className="size-10 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[20px]">person</span>
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-white truncate">{service.coachName || "Kòch DJR"}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 truncate">
                                                        {service.coachTitle || getTimezoneLabel(getServiceTimezone(service))}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <h3 className="text-xl font-black uppercase tracking-tight text-white">{service.title}</h3>
                                                <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                                                    <span className="text-2xl font-bold text-primary">${service.price} USD</span>
                                                    {service.priceHTG ? (
                                                        <span className="text-xs text-white/40 font-medium">
                                                            ({service.priceHTG.toLocaleString("fr-HT")} HTG)
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {service.imageUrl && (
                                                <div className="w-full h-48 rounded-2xl overflow-hidden mb-5 relative border border-white/5">
                                                    <img
                                                        src={service.imageUrl}
                                                        alt={service.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                                </div>
                                            )}

                                            {/* Durée + prochaine disponibilité : les deux infos qui décident d'un achat. */}
                                            <div className="flex flex-wrap gap-2 mb-5">
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/60 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg">
                                                    <span className="material-symbols-outlined text-[13px]">timer</span>
                                                    {duration} min
                                                </span>
                                                {nextSlot ? (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                                                        <span className="material-symbols-outlined text-[13px]">event_available</span>
                                                        {formatDayLabel(nextSlot.localDate)} · {to12h(nextSlot.localTime)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg">
                                                        <span className="material-symbols-outlined text-[13px]">event_busy</span>
                                                        Pa gen plas kounye a
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-white/60 leading-relaxed mb-6 flex-grow">{service.description}</p>

                                            {service.includedItems && service.includedItems.length > 0 && (
                                                <div className="space-y-3 mb-8 bg-white/5 p-4 rounded-2xl border border-white/5">
                                                    {service.includedItems.map((item, i) => (
                                                        <div key={i} className="flex items-start gap-3">
                                                            <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                                                            <span className="text-sm text-white/90 font-medium">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleOpenModal(service)}
                                                disabled={!nextSlot}
                                                className="w-full h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-auto"
                                            >
                                                <span>{nextSlot ? "Rezève kounya" : "Konplè pou kounye a"}</span>
                                                {nextSlot && <span className="material-symbols-outlined text-base">arrow_forward</span>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* COMMENT ÇA MARCHE */}
                <section className="py-24 px-5 border-b border-white/5">
                    <div className="max-w-[1200px] mx-auto">
                        <div className="text-center mb-16 max-w-[700px] mx-auto">
                            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-4">Kijan sa mache</p>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-white">
                                Kat etap, kèlkeswa peyi w
                            </h2>
                        </div>

                        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {HOW_IT_WORKS.map((item, i) => (
                                <li key={item.title} className="relative bg-white/[0.02] border border-white/10 p-7 rounded-3xl">
                                    <span className="absolute top-6 right-6 text-4xl font-black text-white/5 leading-none">{i + 1}</span>
                                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                                        <span className="material-symbols-outlined text-primary text-2xl">{item.icon}</span>
                                    </div>
                                    <h3 className="text-base font-black uppercase tracking-tight text-white mb-2">{item.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed font-medium">{item.desc}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* BÉNÉFICES */}
                <section className="py-24 px-5 border-b border-white/5 bg-white/[0.02]">
                    <div className="max-w-[1200px] mx-auto">
                        <div className="text-center mb-16 max-w-[700px] mx-auto">
                            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-4">Poukisa w dwe patisipe?</p>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-white">Devlope Otorite W Ak Paròl Ou</h2>
                            <p className="text-white/50 text-sm leading-relaxed">
                                Aprann metriz kominikasyon ki se zouti prensipal tout gwo lidè. Metòd sa a fèt pou bay rezilta rapid ak pratik nan lavi pwofesyonèl ou.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { title: "Kominikasyon Klè", desc: "Aprann fòmile lide w yo avèk presizyon pou pèsonn pa mal konprann vizyon w. Chak mo ap gen enpak li.", icon: "record_voice_over" },
                                { title: "Otorite natirèl", desc: "Pran lapawòl ak yon asirans ki fè tout moun anvi tande sa w gen pou di a. Enpoze respè san fòse.", icon: "verified_user" },
                                { title: "Koneksyon emosyonèl", desc: "Touche kè moun w ap pale yo, kreye senpati epi bati konfyans rapidman avèk odyans ou.", icon: "favorite" },
                                { title: "Enfliyans ak enpak", desc: "Konvenk odyans ou, dirije ekip ou ak enspire foul moun natirèlman.", icon: "moving" },
                                { title: "Metriz Estrès", desc: "Jere lakrentif ak trak pou w rete poze epi klè, kèlkeswa gwosè odyans ou ap afwonte a.", icon: "self_improvement" },
                                { title: "Personal Branding", desc: "Bati yon repitasyon solid ki reflete konpetans ou kòm yon vrè lidè ak vizyonè.", icon: "star" },
                            ].map((feature) => (
                                <div key={feature.title} className="bg-background-dark border border-white/5 p-8 rounded-3xl hover:bg-white/5 hover:border-primary/30 transition-all duration-300 group shadow-lg">
                                    <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary transition-all">
                                        <span className="material-symbols-outlined text-primary group-hover:text-white text-3xl">{feature.icon}</span>
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white mb-3">{feature.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed font-medium">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <DashboardFooter />

            {selectedService && (
                <ConsultationBookingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    service={selectedService}
                />
            )}
        </div>
    );
}

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getServices, addService, updateService, deleteService } from "@/lib/services";
import { Service } from "@/lib/types";
import OfferingDrawer from "@/components/admin/OfferingDrawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { groupServicesByCoach } from "@/lib/coaches";
import { getBookingWindow, getServiceTimezone, getSessionMinutes } from "@/lib/slots";
import {
    listTimezoneOptions,
    formatInTimeZone,
    formatUtcOffset,
    getTimezoneLabel,
    detectBrowserTimezone,
} from "@/lib/timezones";

const TIMEZONE_OPTIONS = listTimezoneOptions();

const DAY_TRANSLATIONS: Record<string, string> = {
    monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi",
    friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche",
    lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi",
    vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche",
};

/** Fuseaux affichés par défaut dans le comparateur : les marchés principaux. */
const DEFAULT_COMPARE_ZONES = [
    "America/Port-au-Prince",
    "America/New_York",
    "Europe/Paris",
    "America/Los_Angeles",
];

function initials(name: string) {
    return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function BookingsPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [coachFilter, setCoachFilter] = useState<string>("all");
    /** Offre dont on inspecte les créneaux dans le comparateur. */
    const [compareServiceId, setCompareServiceId] = useState<string>("");
    const [compareZones, setCompareZones] = useState<string[]>(DEFAULT_COMPARE_ZONES);
    const [zoneSearch, setZoneSearch] = useState("");
    const [showZoneDropdown, setShowZoneDropdown] = useState(false);

    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setServices(await getServices());
        } catch (err) {
            console.error("Failed to load services", err);
            setError(err instanceof Error ? err.message : "Chargement impossible.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadServices(); }, [loadServices]);

    const coaches = useMemo(() => groupServicesByCoach(services), [services]);

    const visibleServices = useMemo(
        () => (coachFilter === "all" ? services : services.filter((s) => (s.coachId || "__unassigned__") === coachFilter)),
        [services, coachFilter]
    );

    // L'offre inspectée par défaut est la première visible.
    const compareService = useMemo(
        () => visibleServices.find((s) => s.id === compareServiceId) ?? visibleServices[0] ?? null,
        [visibleServices, compareServiceId]
    );

    /**
     * Créneaux réels de l'offre inspectée, pris sur le premier jour ouvert.
     * On affiche des instants issus du même moteur que la réservation cliente :
     * ce qui est montré ici est exactement ce que le client verra.
     */
    const compareRows = useMemo(() => {
        if (!compareService?.id) return [];
        const window = getBookingWindow(compareService, getServiceTimezone(compareService));
        const firstDate = window.slots[0]?.baseDate;
        if (!firstDate) return [];
        return window.slots.filter((s) => s.baseDate === firstDate).slice(0, 12);
    }, [compareService]);

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteService(deleteId);
            setServices((prev) => prev.filter((s) => s.id !== deleteId));
            setDeleteId(null);
        } catch (err) {
            console.error("Failed to delete service", err);
            setError("Suppression impossible.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async (data: Omit<Service, "id" | "createdAt" | "updatedAt">) => {
        if (editingService?.id) await updateService(editingService.id, data);
        else await addService(data);
        await loadServices();
    };

    const openCreate = () => { setEditingService(null); setIsDrawerOpen(true); };
    const openEdit = (service: Service) => { setEditingService(service); setIsDrawerOpen(true); };

    const cardClass = "bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl";

    return (
        <div className="animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-primary dark:text-white text-4xl font-black leading-tight tracking-tighter mb-2">
                        Offres de coaching
                    </h1>
                    <p className="text-black/50 dark:text-white/50 text-sm font-medium">
                        {services.length} offre{services.length > 1 ? "s" : ""} ·{" "}
                        {coaches.filter((c) => c.id !== "__unassigned__").length} coach
                        {coaches.filter((c) => c.id !== "__unassigned__").length > 1 ? "s" : ""}
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-primary hover:opacity-90 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 flex items-center gap-2 shrink-0"
                >
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    Nouvelle offre
                </button>
            </div>

            {/* Filtre par coach */}
            {coaches.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-8">
                    <button
                        onClick={() => setCoachFilter("all")}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-colors ${
                            coachFilter === "all"
                                ? "bg-primary text-white"
                                : "bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10"
                        }`}
                    >
                        Tous ({services.length})
                    </button>
                    {coaches.map((coach) => (
                        <button
                            key={coach.id}
                            onClick={() => setCoachFilter(coach.id)}
                            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${
                                coachFilter === coach.id
                                    ? "bg-primary text-white"
                                    : "bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10"
                            }`}
                        >
                            {coach.name} ({coach.services.length})
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[0, 1].map((i) => <div key={i} className={`${cardClass} h-72 animate-pulse`} />)}
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <p className="text-red-500 font-bold mb-6">{error}</p>
                    <button onClick={loadServices} className="px-6 py-3 rounded-full bg-black/5 dark:bg-white/10 text-xs font-black uppercase tracking-widest">
                        Réessayer
                    </button>
                </div>
            ) : visibleServices.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl">
                    <span className="material-symbols-outlined text-6xl text-black/20 dark:text-white/20 mb-4 block">event_busy</span>
                    <h3 className="text-xl font-black mb-2">Aucune offre</h3>
                    <p className="text-sm text-black/50 dark:text-white/50 max-w-sm mx-auto mb-6">
                        Créez une offre et assignez-lui un coach pour ouvrir les réservations.
                    </p>
                    <button onClick={openCreate} className="bg-primary text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
                        Créer une offre
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                        {visibleServices.map((service) => {
                            const tz = getServiceTimezone(service);
                            const openDays = Object.entries(service.availability || {}).filter(([, a]) => a?.enabled);

                            return (
                                <div key={service.id} className={`${cardClass} p-6 flex flex-col`}>
                                    {/* Coach */}
                                    <div className="flex items-center gap-3 mb-5 pb-5 border-b border-black/5 dark:border-white/5">
                                        {service.coachPhotoUrl ? (
                                            <img src={service.coachPhotoUrl} alt={service.coachName || "Coach"} className="size-11 rounded-full object-cover shrink-0" />
                                        ) : (
                                            <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                                                {initials(service.coachName || "")}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-sm truncate">
                                                {service.coachName || <span className="text-amber-500">Coach non assigné</span>}
                                            </p>
                                            <p className="text-[11px] text-black/40 dark:text-white/40 truncate">
                                                {service.coachTitle || getTimezoneLabel(tz)} · {formatUtcOffset(tz)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => openEdit(service)}
                                                className="size-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-primary hover:text-white flex items-center justify-center transition-all"
                                                title="Modifier"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => service.id && setDeleteId(service.id)}
                                                className="size-10 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                                title="Supprimer"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h2 className="text-xl font-black leading-tight">{service.title}</h2>
                                        <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            service.status === "published" ? "bg-green-500/10 text-green-600"
                                                : service.status === "draft" ? "bg-amber-500/10 text-amber-600"
                                                    : "bg-black/5 dark:bg-white/10 text-black/40 dark:text-white/40"
                                        }`}>
                                            {service.status === "published" ? "Publié" : service.status === "draft" ? "Brouillon" : "Archivé"}
                                        </span>
                                    </div>

                                    <p className="text-sm text-black/60 dark:text-white/60 mb-5 line-clamp-2">{service.description}</p>

                                    <div className="grid grid-cols-3 gap-4 mb-5">
                                        <div>
                                            <p className="text-[10px] text-black/40 dark:text-white/40 font-black uppercase tracking-widest mb-1">Prix</p>
                                            <p className="text-base font-black">${service.price}</p>
                                            {service.priceHTG ? <p className="text-[11px] text-black/40">{service.priceHTG} HTG</p> : null}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-black/40 dark:text-white/40 font-black uppercase tracking-widest mb-1">Durée</p>
                                            <p className="text-base font-black">{getSessionMinutes(service)} min</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-black/40 dark:text-white/40 font-black uppercase tracking-widest mb-1">Jours</p>
                                            <p className="text-base font-black">{openDays.length}/7</p>
                                        </div>
                                    </div>

                                    <div className="bg-black/[0.03] dark:bg-white/5 rounded-2xl p-4 mt-auto">
                                        <p className="text-[10px] text-black/40 dark:text-white/40 font-black uppercase tracking-widest mb-3">
                                            Disponibilités ({getTimezoneLabel(tz)})
                                        </p>
                                        {openDays.length === 0 ? (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                                                Aucun jour activé — cette offre est invisible côté client.
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {openDays.map(([day, avail]) => (
                                                    <div key={day} className="flex items-center justify-between text-xs">
                                                        <span className="font-medium">{DAY_TRANSLATIONS[day.toLowerCase()] || day}</span>
                                                        <span className="text-black/50 dark:text-white/50 font-mono text-[11px] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
                                                            {avail.startTime} – {avail.endTime}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Comparateur de fuseaux — basé sur les vrais créneaux de l'offre */}
                    <div className={`${cardClass} p-8`}>
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
                            <div>
                                <h3 className="text-xl font-black mb-1">Vérification des horaires</h3>
                                <p className="text-sm text-black/60 dark:text-white/60 max-w-xl">
                                    Les créneaux réels de l&apos;offre, convertis pays par pays. Les conversions
                                    tiennent compte de l&apos;heure d&apos;été : ce tableau montre exactement ce que
                                    voit le client.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                <select
                                    value={compareService?.id || ""}
                                    onChange={(e) => setCompareServiceId(e.target.value)}
                                    aria-label="Offre à vérifier"
                                    className="h-11 px-4 bg-black/[0.03] dark:bg-white/[0.03] border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {visibleServices.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.coachName ? `${s.coachName} — ` : ""}{s.title}
                                        </option>
                                    ))}
                                </select>

                                <div className="relative w-full sm:w-60">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-[18px]">search</span>
                                    <input
                                        type="text"
                                        placeholder="Ajouter un pays..."
                                        value={zoneSearch}
                                        onChange={(e) => { setZoneSearch(e.target.value); setShowZoneDropdown(true); }}
                                        onFocus={() => setShowZoneDropdown(true)}
                                        className="w-full h-11 pl-10 pr-3 bg-black/[0.03] dark:bg-white/[0.03] border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    {showZoneDropdown && zoneSearch && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                            {TIMEZONE_OPTIONS
                                                .filter((z) =>
                                                    !compareZones.includes(z.timezoneId) &&
                                                    (`${z.countryName} ${z.timezoneLabel}`.toLowerCase().includes(zoneSearch.toLowerCase()))
                                                )
                                                .slice(0, 20)
                                                .map((zone) => (
                                                    <button
                                                        key={zone.timezoneId}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between gap-2"
                                                        onClick={() => {
                                                            setCompareZones((prev) => [...prev, zone.timezoneId]);
                                                            setZoneSearch("");
                                                            setShowZoneDropdown(false);
                                                        }}
                                                    >
                                                        <span className="truncate">{zone.flag} {zone.countryName} — {zone.timezoneLabel}</span>
                                                        <span className="text-[10px] text-black/40 shrink-0">{formatUtcOffset(zone.timezoneId)}</span>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {!compareService ? (
                            <p className="text-sm text-black/40 py-8 text-center">Sélectionnez une offre.</p>
                        ) : compareRows.length === 0 ? (
                            <p className="text-sm text-amber-600 dark:text-amber-400 py-8 text-center font-semibold">
                                Aucun créneau ouvert pour cette offre — activez au moins un jour de disponibilité.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[640px]">
                                    <thead>
                                        <tr className="border-b border-black/5 dark:border-white/5">
                                            <th className="py-4 pr-6 text-xs font-black uppercase tracking-widest text-primary align-top">
                                                {compareService.coachName || "Coach"}
                                                <span className="block text-[10px] font-bold text-black/40 dark:text-white/40 normal-case mt-0.5">
                                                    {getTimezoneLabel(getServiceTimezone(compareService))} ({formatUtcOffset(getServiceTimezone(compareService))})
                                                </span>
                                            </th>
                                            {compareZones.map((zoneId) => (
                                                <th key={zoneId} className="py-4 px-4 text-xs font-black uppercase tracking-widest text-black/40 dark:text-white/40 group relative align-top">
                                                    {getTimezoneLabel(zoneId)}
                                                    <span className="block text-[10px] font-bold normal-case mt-0.5">{formatUtcOffset(zoneId)}</span>
                                                    <button
                                                        onClick={() => setCompareZones((prev) => prev.filter((z) => z !== zoneId))}
                                                        className="absolute top-3 right-1 size-5 rounded-full bg-black/5 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Retirer"
                                                    >
                                                        <span className="material-symbols-outlined text-[10px]">close</span>
                                                    </button>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {compareRows.map((slot) => (
                                            <tr key={slot.slotId} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                                                <td className="py-3 pr-6 font-bold text-primary whitespace-nowrap">
                                                    {formatInTimeZone(slot.startUtc, getServiceTimezone(compareService), { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                                                </td>
                                                {compareZones.map((zoneId) => (
                                                    <td key={zoneId} className="py-3 px-4 text-sm font-medium whitespace-nowrap">
                                                        {formatInTimeZone(slot.startUtc, zoneId, { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <p className="text-[11px] text-black/40 dark:text-white/40 mt-4">
                            Heure locale de cet écran : {formatUtcOffset(detectBrowserTimezone())} ({getTimezoneLabel(detectBrowserTimezone())})
                        </p>
                    </div>
                </>
            )}

            <OfferingDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                initialData={editingService}
                onSave={handleSave}
            />

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => !isDeleting && setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Supprimer cette offre ?"
                message="Cette action est irréversible. Les réservations déjà payées ne sont pas supprimées."
                confirmText="Supprimer"
                isDanger
                isLoading={isDeleting}
            />
        </div>
    );
}

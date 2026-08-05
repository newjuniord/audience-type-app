/**
 * Génération des créneaux de réservation.
 *
 * Les disponibilités sont saisies par l'admin dans SON fuseau (ex: Séoul), puis
 * converties vers le fuseau du client. Toute la logique passe par des instants UTC :
 * c'est le seul repère commun entre un coach en Corée et un client à Miami.
 */

import { Service } from "./types";
import { getZonedParts, zonedTimeToUtc, formatInTimeZone } from "./timezones";

/** Durée d'une session si le service n'en définit pas. */
export const DEFAULT_SESSION_MINUTES = 60;
/** Délai minimum entre maintenant et le début d'un rendez-vous. */
export const DEFAULT_MIN_NOTICE_HOURS = 24;
/** Profondeur du calendrier ouvert à la réservation. */
export const DEFAULT_BOOKING_WINDOW_DAYS = 60;

/** Clés de `Service.availability`, indexées comme Date.getDay() (0 = dimanche). */
const WEEKDAY_KEYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface Slot {
    /** Identifiant déterministe et partagé par tous les fuseaux. */
    slotId: string;
    /** Début du rendez-vous. */
    startUtc: Date;
    /** Fin du rendez-vous. */
    endUtc: Date;
    durationMinutes: number;
    /** "HH:MM" dans le fuseau du client. */
    localTime: string;
    /** "YYYY-MM-DD" dans le fuseau du client. */
    localDate: string;
    /** "HH:MM" dans le fuseau du coach — utile pour l'admin. */
    baseTime: string;
    /** "YYYY-MM-DD" dans le fuseau du coach. */
    baseDate: string;
}

/**
 * Fuseau de référence du service.
 *
 * `availabilityTimezone` (IANA) est la source de vérité. À défaut, on retombe sur
 * l'ancien `availabilityTimezoneOffset` numérique, traduit en zone à offset fixe.
 * Attention : les zones `Etc/GMT±N` ont un signe inversé par convention POSIX.
 */
export function getServiceTimezone(service: Pick<Service, "availabilityTimezone" | "availabilityTimezoneOffset">): string {
    if (service.availabilityTimezone) return service.availabilityTimezone;
    const offset = service.availabilityTimezoneOffset ?? 9;
    return offset === 0 ? "UTC" : `Etc/GMT${offset > 0 ? "-" : "+"}${Math.abs(offset)}`;
}

export function getSessionMinutes(service: Pick<Service, "sessionDurationMinutes">): number {
    const value = Number(service.sessionDurationMinutes);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_SESSION_MINUTES;
}

export function getMinNoticeHours(service: Pick<Service, "minNoticeHours">): number {
    const value = Number(service.minNoticeHours);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_MIN_NOTICE_HOURS;
}

export function getBookingWindowDays(service: Pick<Service, "bookingWindowDays">): number {
    const value = Number(service.bookingWindowDays);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_BOOKING_WINDOW_DAYS;
}

/** Identifiant de créneau : service + instant UTC, donc identique pour deux clients de pays différents. */
export function buildSlotId(serviceId: string, startUtc: Date): string {
    const iso = startUtc.toISOString(); // 2026-08-12T05:30:00.000Z
    return `${serviceId}__${iso.slice(0, 16).replace(/[:]/g, "")}Z`;
}

function addDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function minutesOf(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + (m || 0);
}

/**
 * Tous les créneaux d'une journée du calendrier du coach, exprimés en UTC.
 * `baseDateStr` est une date dans le fuseau du service.
 */
function generateSlotsForBaseDate(service: Service, baseDateStr: string): Slot[] {
    const baseTz = getServiceTimezone(service);
    const duration = getSessionMinutes(service);
    const serviceId = service.id || "";

    // Le jour de la semaine se lit à midi pour ne pas basculer sur un bord de journée.
    const noon = zonedTimeToUtc(baseDateStr, "12:00", baseTz);
    const weekday = getZonedParts(noon, baseTz).weekday;

    const availability = service.availability || {};
    const dayKey = WEEKDAY_KEYS[weekday];
    // L'admin a pu enregistrer les clés en minuscules selon la version du formulaire.
    const dayAvail = availability[dayKey] || availability[dayKey.toLowerCase()];
    if (!dayAvail?.enabled) return [];

    const start = minutesOf(dayAvail.startTime || "09:00");
    const end = minutesOf(dayAvail.endTime || "17:00");
    if (!(end > start)) return [];

    const slots: Slot[] = [];
    // Le dernier créneau doit se terminer avant la fin de plage : `+ duration <= end`.
    for (let m = start; m + duration <= end; m += duration) {
        const baseTime = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        const startUtc = zonedTimeToUtc(baseDateStr, baseTime, baseTz);
        slots.push({
            slotId: buildSlotId(serviceId, startUtc),
            startUtc,
            endUtc: new Date(startUtc.getTime() + duration * 60000),
            durationMinutes: duration,
            localTime: baseTime,
            localDate: baseDateStr,
            baseTime,
            baseDate: baseDateStr,
        });
    }
    return slots;
}

/**
 * Créneaux proposables au client pour SA date locale.
 *
 * On balaie trois journées du calendrier du coach : à ±14h de décalage, un créneau
 * du 12 août à Miami peut tomber le 11 ou le 13 à Séoul.
 */
export function getSlotsForUserDate(
    service: Service,
    userDateStr: string,
    userTimeZone: string,
    now: Date = new Date()
): Slot[] {
    if (!service?.id || !userDateStr || !userTimeZone) return [];

    const minNoticeMs = getMinNoticeHours(service) * 3600_000;
    const earliest = now.getTime() + minNoticeMs;
    const maxTime = now.getTime() + getBookingWindowDays(service) * 86400_000;

    const candidates = [-1, 0, 1].flatMap((offset) =>
        generateSlotsForBaseDate(service, addDays(userDateStr, offset))
    );

    return candidates
        .map((slot) => {
            const parts = getZonedParts(slot.startUtc, userTimeZone);
            return { ...slot, localDate: parts.dateStr, localTime: parts.timeStr };
        })
        .filter((slot) => slot.localDate === userDateStr)
        .filter((slot) => slot.startUtc.getTime() >= earliest && slot.startUtc.getTime() <= maxTime)
        .sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
}

export interface BookingWindow {
    /** Tous les créneaux ouverts, triés chronologiquement. */
    slots: Slot[];
    /** Créneaux regroupés par date locale du client ("YYYY-MM-DD"). */
    slotsByDate: Map<string, Slot[]>;
    /** Première date réservable, dans le fuseau du client. */
    minDate: string;
    /** Dernière date réservable, dans le fuseau du client. */
    maxDate: string;
}

/**
 * Calcule d'un coup toute la fenêtre de réservation.
 *
 * Un seul balayage sert à la fois au calendrier (quels jours proposer) et à la grille
 * horaire (quels créneaux pour le jour choisi) : refaire le calcul à chaque clic
 * relancerait des milliers de conversions de fuseau pour rien.
 */
export function getBookingWindow(
    service: Service,
    userTimeZone: string,
    now: Date = new Date()
): BookingWindow {
    const minNoticeMs = getMinNoticeHours(service) * 3600_000;
    const earliest = now.getTime() + minNoticeMs;
    const latest = now.getTime() + getBookingWindowDays(service) * 86400_000;

    const minDate = getZonedParts(new Date(earliest), userTimeZone).dateStr;
    const maxDate = getZonedParts(new Date(latest), userTimeZone).dateStr;

    const slotsByDate = new Map<string, Slot[]>();
    const slots: Slot[] = [];

    if (!service?.id) return { slots, slotsByDate, minDate, maxDate };

    // On élargit d'un jour de chaque côté : le calendrier du coach et celui du client
    // ne changent pas de date au même instant.
    let cursor = addDays(minDate, -1);
    const stop = addDays(maxDate, 1);

    while (cursor <= stop) {
        for (const slot of generateSlotsForBaseDate(service, cursor)) {
            const time = slot.startUtc.getTime();
            if (time < earliest || time > latest) continue;

            const parts = getZonedParts(slot.startUtc, userTimeZone);
            if (parts.dateStr < minDate || parts.dateStr > maxDate) continue;

            const localised: Slot = { ...slot, localDate: parts.dateStr, localTime: parts.timeStr };
            slots.push(localised);

            const bucket = slotsByDate.get(parts.dateStr);
            if (bucket) bucket.push(localised);
            else slotsByDate.set(parts.dateStr, [localised]);
        }
        cursor = addDays(cursor, 1);
    }

    slots.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
    for (const bucket of slotsByDate.values()) {
        bucket.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
    }

    return { slots, slotsByDate, minDate, maxDate };
}

/** Libellé lisible d'un créneau dans un fuseau donné, ex: "mar. 12 août, 14:30 – 15:30". */
export function formatSlotRange(slot: Slot, timeZone: string, locale = "fr-FR"): string {
    const day = formatInTimeZone(slot.startUtc, timeZone, { weekday: "short", day: "numeric", month: "long" }, locale);
    const start = formatInTimeZone(slot.startUtc, timeZone, { hour: "2-digit", minute: "2-digit", hour12: false }, locale);
    const end = formatInTimeZone(slot.endUtc, timeZone, { hour: "2-digit", minute: "2-digit", hour12: false }, locale);
    return `${day}, ${start} – ${end}`;
}

import { Timestamp } from "firebase/firestore";
import { FirestoreInstant } from "./types";

/**
 * Normalise un instant venant de Firestore.
 *
 * Les documents récents portent un `Timestamp` natif ; ceux écrits avant la migration
 * contiennent une chaîne ISO. Toute lecture d'une date passe par ici, pour qu'aucun
 * appelant n'ait à connaître le format de stockage.
 *
 * Retourne `null` plutôt que d'inventer une date : un rendez-vous sans horaire doit
 * s'afficher comme tel, pas être silencieusement daté d'aujourd'hui.
 */
export function toDate(value: FirestoreInstant | null | undefined): Date | null {
    if (!value) return null;

    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

    // Objet brut { seconds, nanoseconds } : cas d'un Timestamp sérialisé (SSR, cache).
    if (typeof value === "object" && "seconds" in value) {
        const seconds = (value as { seconds: number }).seconds;
        return Number.isFinite(seconds) ? new Date(seconds * 1000) : null;
    }

    const parsed = new Date(value as string);
    return isNaN(parsed.getTime()) ? null : parsed;
}

/** Millisecondes epoch d'un instant Firestore, ou `null`. */
export function toMillis(value: FirestoreInstant | null | undefined): number | null {
    return toDate(value)?.getTime() ?? null;
}

/** Convertit une date JS en Timestamp Firestore, prêt à être écrit. */
export function toTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date);
}

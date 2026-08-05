/**
 * Catalogue pays / fuseaux horaires et utilitaires de conversion.
 *
 * Tout le système de réservation raisonne en **fuseau IANA** (ex: "America/Port-au-Prince")
 * et non en offset fixe : un offset codé en dur (-5 pour Haïti, +1 pour la France...) devient
 * faux dès que l'heure d'été s'applique, et décale les rendez-vous d'une heure une partie
 * de l'année.
 */

export interface CountryTimezone {
    /** Identifiant IANA, ex: "America/New_York" */
    id: string;
    /** Libellé affiché quand un pays a plusieurs fuseaux */
    label: string;
}

export interface CountryInfo {
    /** ISO 3166-1 alpha-2 */
    code: string;
    name: string;
    flag: string;
    dialCode: string;
    /** Exemple de numéro national, utilisé comme placeholder */
    phoneExample: string;
    timezones: CountryTimezone[];
}

/**
 * Pays supportés par le système de réservation, ordonnés par pertinence pour
 * l'audience DJR Akademi (Haïti + diaspora), puis par région.
 */
export const COUNTRIES: CountryInfo[] = [
    { code: "HT", name: "Ayiti", flag: "🇭🇹", dialCode: "+509", phoneExample: "48 48 02 29", timezones: [{ id: "America/Port-au-Prince", label: "Pòtoprens" }] },
    {
        code: "US", name: "Etazini", flag: "🇺🇸", dialCode: "+1", phoneExample: "212 123 4567", timezones: [
            { id: "America/New_York", label: "Eastern — New York, Miami, Atlanta, Boston" },
            { id: "America/Chicago", label: "Central — Chicago, Houston, Dallas" },
            { id: "America/Denver", label: "Mountain — Denver, Salt Lake City" },
            { id: "America/Phoenix", label: "Arizona — Phoenix (san chanjman lè)" },
            { id: "America/Los_Angeles", label: "Pacific — Los Angeles, Seattle, San Francisco" },
            { id: "America/Anchorage", label: "Alaska — Anchorage" },
            { id: "Pacific/Honolulu", label: "Hawaii — Honolulu" },
        ]
    },
    {
        code: "CA", name: "Kanada", flag: "🇨🇦", dialCode: "+1", phoneExample: "514 123 4567", timezones: [
            { id: "America/Toronto", label: "Eastern — Toronto, Montréal, Ottawa" },
            { id: "America/Winnipeg", label: "Central — Winnipeg" },
            { id: "America/Edmonton", label: "Mountain — Calgary, Edmonton" },
            { id: "America/Vancouver", label: "Pacific — Vancouver" },
            { id: "America/Halifax", label: "Atlantic — Halifax" },
        ]
    },
    { code: "DO", name: "Repiblik Dominikèn", flag: "🇩🇴", dialCode: "+1", phoneExample: "809 123 4567", timezones: [{ id: "America/Santo_Domingo", label: "Sen Domeng" }] },
    { code: "FR", name: "Lafrans", flag: "🇫🇷", dialCode: "+33", phoneExample: "6 12 34 56 78", timezones: [{ id: "Europe/Paris", label: "Pari" }] },
    { code: "GP", name: "Gwadloup", flag: "🇬🇵", dialCode: "+590", phoneExample: "690 12 34 56", timezones: [{ id: "America/Guadeloupe", label: "Pwentapit" }] },
    { code: "MQ", name: "Matinik", flag: "🇲🇶", dialCode: "+596", phoneExample: "696 12 34 56", timezones: [{ id: "America/Martinique", label: "Fòdfrans" }] },
    { code: "GF", name: "Giyàn Fransèz", flag: "🇬🇫", dialCode: "+594", phoneExample: "694 12 34 56", timezones: [{ id: "America/Cayenne", label: "Kayèn" }] },
    { code: "BS", name: "Bahamas", flag: "🇧🇸", dialCode: "+1", phoneExample: "242 123 4567", timezones: [{ id: "America/Nassau", label: "Nassau" }] },
    { code: "JM", name: "Jamayik", flag: "🇯🇲", dialCode: "+1", phoneExample: "876 123 4567", timezones: [{ id: "America/Jamaica", label: "Kingston" }] },
    { code: "CU", name: "Kiba", flag: "🇨🇺", dialCode: "+53", phoneExample: "5 123 4567", timezones: [{ id: "America/Havana", label: "Lavàn" }] },
    { code: "PR", name: "Pòtoriko", flag: "🇵🇷", dialCode: "+1", phoneExample: "787 123 4567", timezones: [{ id: "America/Puerto_Rico", label: "San Juan" }] },
    { code: "MX", name: "Meksik", flag: "🇲🇽", dialCode: "+52", phoneExample: "55 1234 5678", timezones: [
        { id: "America/Mexico_City", label: "Sant — Mexico" },
        { id: "America/Tijuana", label: "Pacific — Tijuana" },
        { id: "America/Cancun", label: "Eastern — Cancún" },
    ] },
    { code: "BR", name: "Brezil", flag: "🇧🇷", dialCode: "+55", phoneExample: "11 91234 5678", timezones: [
        { id: "America/Sao_Paulo", label: "São Paulo, Rio" },
        { id: "America/Manaus", label: "Manaus" },
    ] },
    { code: "CL", name: "Chili", flag: "🇨🇱", dialCode: "+56", phoneExample: "9 1234 5678", timezones: [{ id: "America/Santiago", label: "Santiago" }] },
    { code: "AR", name: "Ajantin", flag: "🇦🇷", dialCode: "+54", phoneExample: "11 1234 5678", timezones: [{ id: "America/Argentina/Buenos_Aires", label: "Buenos Aires" }] },
    { code: "CO", name: "Kolonbi", flag: "🇨🇴", dialCode: "+57", phoneExample: "301 1234567", timezones: [{ id: "America/Bogota", label: "Bogotá" }] },
    { code: "PE", name: "Perou", flag: "🇵🇪", dialCode: "+51", phoneExample: "912 345 678", timezones: [{ id: "America/Lima", label: "Lima" }] },
    { code: "PA", name: "Panama", flag: "🇵🇦", dialCode: "+507", phoneExample: "6123 4567", timezones: [{ id: "America/Panama", label: "Panama" }] },
    { code: "GB", name: "Wayòm Ini", flag: "🇬🇧", dialCode: "+44", phoneExample: "7400 123456", timezones: [{ id: "Europe/London", label: "Lond" }] },
    { code: "BE", name: "Bèljik", flag: "🇧🇪", dialCode: "+32", phoneExample: "470 12 34 56", timezones: [{ id: "Europe/Brussels", label: "Briksèl" }] },
    { code: "CH", name: "Swis", flag: "🇨🇭", dialCode: "+41", phoneExample: "78 123 45 67", timezones: [{ id: "Europe/Zurich", label: "Zirich" }] },
    { code: "ES", name: "Espay", flag: "🇪🇸", dialCode: "+34", phoneExample: "612 34 56 78", timezones: [{ id: "Europe/Madrid", label: "Madrid" }] },
    { code: "IT", name: "Itali", flag: "🇮🇹", dialCode: "+39", phoneExample: "312 345 6789", timezones: [{ id: "Europe/Rome", label: "Wòm" }] },
    { code: "DE", name: "Almay", flag: "🇩🇪", dialCode: "+49", phoneExample: "1512 3456789", timezones: [{ id: "Europe/Berlin", label: "Bèlen" }] },
    { code: "NL", name: "Peyiba", flag: "🇳🇱", dialCode: "+31", phoneExample: "6 12345678", timezones: [{ id: "Europe/Amsterdam", label: "Amstèdam" }] },
    { code: "PT", name: "Pòtigal", flag: "🇵🇹", dialCode: "+351", phoneExample: "912 345 678", timezones: [{ id: "Europe/Lisbon", label: "Lisbòn" }] },
    { code: "SN", name: "Senegal", flag: "🇸🇳", dialCode: "+221", phoneExample: "70 123 45 67", timezones: [{ id: "Africa/Dakar", label: "Dakar" }] },
    { code: "CI", name: "Kòt Divwa", flag: "🇨🇮", dialCode: "+225", phoneExample: "01 23 45 67 89", timezones: [{ id: "Africa/Abidjan", label: "Abidjan" }] },
    { code: "CM", name: "Kamewoun", flag: "🇨🇲", dialCode: "+237", phoneExample: "6 71 23 45 67", timezones: [{ id: "Africa/Douala", label: "Douala" }] },
    { code: "CD", name: "Kongo (RDC)", flag: "🇨🇩", dialCode: "+243", phoneExample: "991 234 567", timezones: [{ id: "Africa/Kinshasa", label: "Kinshasa" }] },
    { code: "BJ", name: "Benen", flag: "🇧🇯", dialCode: "+229", phoneExample: "90 12 34 56", timezones: [{ id: "Africa/Porto-Novo", label: "Pòto-Novo" }] },
    { code: "TG", name: "Togo", flag: "🇹🇬", dialCode: "+228", phoneExample: "90 12 34 56", timezones: [{ id: "Africa/Lome", label: "Lomé" }] },
    { code: "MA", name: "Mawòk", flag: "🇲🇦", dialCode: "+212", phoneExample: "612 345678", timezones: [{ id: "Africa/Casablanca", label: "Kazablanka" }] },
    { code: "NG", name: "Nijerya", flag: "🇳🇬", dialCode: "+234", phoneExample: "802 123 4567", timezones: [{ id: "Africa/Lagos", label: "Lagos" }] },
    { code: "ZA", name: "Afrik di Sid", flag: "🇿🇦", dialCode: "+27", phoneExample: "71 123 4567", timezones: [{ id: "Africa/Johannesburg", label: "Johannesburg" }] },
    { code: "AE", name: "Emira Arab Ini", flag: "🇦🇪", dialCode: "+971", phoneExample: "50 123 4567", timezones: [{ id: "Asia/Dubai", label: "Dubai" }] },
    { code: "KR", name: "Kore di Sid", flag: "🇰🇷", dialCode: "+82", phoneExample: "10 1234 5678", timezones: [{ id: "Asia/Seoul", label: "Seoul" }] },
    { code: "JP", name: "Japon", flag: "🇯🇵", dialCode: "+81", phoneExample: "90 1234 5678", timezones: [{ id: "Asia/Tokyo", label: "Tokyo" }] },
    { code: "CN", name: "Chin", flag: "🇨🇳", dialCode: "+86", phoneExample: "131 2345 6789", timezones: [{ id: "Asia/Shanghai", label: "Shanghai" }] },
    { code: "IN", name: "End", flag: "🇮🇳", dialCode: "+91", phoneExample: "81234 56789", timezones: [{ id: "Asia/Kolkata", label: "Kolkata" }] },
    { code: "AU", name: "Ostrali", flag: "🇦🇺", dialCode: "+61", phoneExample: "412 345 678", timezones: [
        { id: "Australia/Sydney", label: "Sydney, Melbourne" },
        { id: "Australia/Perth", label: "Perth" },
    ] },
];

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** Index inverse fuseau IANA -> pays, pour la détection automatique. */
const COUNTRY_BY_TIMEZONE = new Map<string, CountryInfo>();
for (const country of COUNTRIES) {
    for (const tz of country.timezones) {
        if (!COUNTRY_BY_TIMEZONE.has(tz.id)) COUNTRY_BY_TIMEZONE.set(tz.id, country);
    }
}

export function getCountry(code: string | undefined | null): CountryInfo | undefined {
    return code ? COUNTRY_BY_CODE.get(code.toUpperCase()) : undefined;
}

/** Fuseau par défaut d'un pays (le premier de la liste). */
export function getDefaultTimezone(countryCode: string): string {
    return getCountry(countryCode)?.timezones[0]?.id ?? "UTC";
}

/**
 * Construire un Intl.DateTimeFormat coûte cher et la génération des créneaux en fait
 * plusieurs milliers (60 jours × créneaux × 2 fuseaux). On les réutilise par fuseau.
 */
const offsetFormatters = new Map<string, Intl.DateTimeFormat>();
const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
    let formatter = offsetFormatters.get(timeZone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        offsetFormatters.set(timeZone, formatter);
    }
    return formatter;
}

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
    let formatter = partsFormatters.get(timeZone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hour12: false,
            weekday: "short",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
        partsFormatters.set(timeZone, formatter);
    }
    return formatter;
}

/**
 * Décalage réel (en minutes) d'un fuseau à un instant donné, heure d'été incluse.
 * Positif à l'est de Greenwich.
 */
export function getTimezoneOffsetMinutes(timeZone: string, date: Date = new Date()): number {
    try {
        const parts = getOffsetFormatter(timeZone).formatToParts(date);

        const map: Record<string, string> = {};
        for (const part of parts) {
            if (part.type !== "literal") map[part.type] = part.value;
        }

        // Intl rend parfois "24" pour minuit selon le moteur.
        const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);
        const asUtc = Date.UTC(
            Number(map.year),
            Number(map.month) - 1,
            Number(map.day),
            hour,
            Number(map.minute),
            Number(map.second)
        );

        // On tronque à la seconde des deux côtés pour éviter un reliquat de millisecondes.
        return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
    } catch {
        return 0;
    }
}

/**
 * Nom lisible d'un fuseau, ex: "Port-au-Prince", "New York".
 *
 * Les zones à offset fixe `Etc/GMT±N` sont volontairement écartées : leur signe est
 * inversé par convention POSIX, donc afficher "GMT+4" pour un fuseau qui est en réalité
 * UTC-4 induit l'utilisateur en erreur. On renvoie le décalage réel à la place.
 */
export function getTimezoneLabel(timeZone: string, date: Date = new Date()): string {
    if (!timeZone || timeZone === "UTC" || timeZone.startsWith("Etc/")) {
        return formatUtcOffset(timeZone || "UTC", date);
    }
    return timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
}

/** Libellé court du décalage, ex: "UTC-5" ou "UTC+5:30". */
export function formatUtcOffset(timeZone: string, date: Date = new Date()): string {
    const minutes = getTimezoneOffsetMinutes(timeZone, date);
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/**
 * Convertit une heure murale ("2026-08-12" + "14:30") exprimée dans `timeZone`
 * vers l'instant UTC correspondant.
 *
 * Deux passes : la première estime l'offset, la seconde le corrige quand la date
 * naïve tombe de l'autre côté d'un changement d'heure.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const naiveUtc = Date.UTC(y, m - 1, d, hh, mm, 0, 0);

    let ts = naiveUtc - getTimezoneOffsetMinutes(timeZone, new Date(naiveUtc)) * 60000;
    ts = naiveUtc - getTimezoneOffsetMinutes(timeZone, new Date(ts)) * 60000;
    return new Date(ts);
}

export interface ZonedParts {
    year: number;
    month: number; // 1-12
    day: number;
    hour: number;
    minute: number;
    /** 0 = dimanche, conforme à Date.getDay() */
    weekday: number;
    /** "YYYY-MM-DD" dans le fuseau demandé */
    dateStr: string;
    /** "HH:MM" dans le fuseau demandé */
    timeStr: string;
}

const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Décompose un instant UTC en composantes murales dans `timeZone`. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
    const parts = getPartsFormatter(timeZone).formatToParts(date);

    const map: Record<string, string> = {};
    for (const part of parts) {
        if (part.type !== "literal") map[part.type] = part.value;
    }

    const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);
    const year = Number(map.year);
    const month = Number(map.month);
    const day = Number(map.day);
    const minute = Number(map.minute);

    return {
        year,
        month,
        day,
        hour,
        minute,
        weekday: WEEKDAY_INDEX[map.weekday] ?? 0,
        dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        timeStr: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
}

/** Formate un instant dans un fuseau donné (wrapper autour d'Intl). */
export function formatInTimeZone(
    date: Date,
    timeZone: string,
    options: Intl.DateTimeFormatOptions,
    locale = "fr-FR"
): string {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}

/** Fuseau du navigateur, avec repli sur UTC côté serveur. */
export function detectBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
}

/** Devine le pays à partir du fuseau du navigateur. */
export function detectCountryFromTimezone(timeZone?: string): CountryInfo | undefined {
    return COUNTRY_BY_TIMEZONE.get(timeZone ?? detectBrowserTimezone());
}

/** Devine le pays à partir d'un numéro de téléphone international. */
export function detectCountryFromPhone(rawPhone: string): CountryInfo | undefined {
    const digits = (rawPhone || "").replace(/\D/g, "");
    if (!digits) return undefined;

    // Les indicatifs +1 partagés (Amérique du Nord + Caraïbes) se distinguent par l'indicatif régional.
    if (digits.startsWith("1")) {
        const areaCode = digits.slice(1, 4);
        if (["809", "829", "849"].includes(areaCode)) return getCountry("DO");
        if (["242"].includes(areaCode)) return getCountry("BS");
        if (["876", "658"].includes(areaCode)) return getCountry("JM");
        if (["787", "939"].includes(areaCode)) return getCountry("PR");
        // Indicatifs canadiens les plus courants ; sinon on retombe sur les États-Unis.
        if (["204", "236", "249", "250", "289", "306", "343", "365", "403", "416", "418", "431", "437", "438", "450", "506", "514", "519", "579", "581", "587", "604", "613", "639", "647", "672", "705", "709", "778", "780", "782", "807", "819", "825", "867", "873", "902", "905"].includes(areaCode)) {
            return getCountry("CA");
        }
        return getCountry("US");
    }

    // Sinon : plus long indicatif qui correspond (les indicatifs vont de 1 à 4 chiffres).
    let best: CountryInfo | undefined;
    let bestLength = 0;
    for (const country of COUNTRIES) {
        const dial = country.dialCode.replace("+", "");
        if (dial !== "1" && digits.startsWith(dial) && dial.length > bestLength) {
            best = country;
            bestLength = dial.length;
        }
    }
    return best;
}

/** Liste plate pays + fuseau, pratique pour un sélecteur avec recherche. */
export interface TimezoneOption {
    countryCode: string;
    countryName: string;
    flag: string;
    timezoneId: string;
    timezoneLabel: string;
}

export function listTimezoneOptions(): TimezoneOption[] {
    return COUNTRIES.flatMap((country) =>
        country.timezones.map((tz) => ({
            countryCode: country.code,
            countryName: country.name,
            flag: country.flag,
            timezoneId: tz.id,
            timezoneLabel: tz.label,
        }))
    );
}

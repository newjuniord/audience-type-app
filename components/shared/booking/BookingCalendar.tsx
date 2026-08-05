"use client";

import React, { useMemo, useState } from "react";

const MONTHS_HT = [
    "Janvye", "Fevriye", "Mas", "Avril", "Me", "Jen",
    "Jiyè", "Out", "Septanm", "Oktòb", "Novanm", "Desanm",
];
/** Semaine commençant le lundi. */
const DAYS_HT = ["Len", "Mad", "Mèk", "Jèd", "Van", "Sam", "Dim"];

export interface BookingCalendarProps {
    /** "YYYY-MM-DD" dans le fuseau du client. */
    value: string;
    onChange: (dateStr: string) => void;
    /** Dates qui comportent au moins un créneau libre. */
    availableDates: Set<string>;
    /** Bornes du calendrier, "YYYY-MM-DD". */
    minDate: string;
    maxDate: string;
    loading?: boolean;
}

function toDateStr(y: number, monthIndex: number, d: number) {
    return `${y}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Calendrier de réservation.
 *
 * Il ne manipule que des chaînes "YYYY-MM-DD" déjà exprimées dans le fuseau du client :
 * aucune conversion ici, pour éviter qu'un objet Date local ne décale la sélection d'un jour.
 */
export default function BookingCalendar({
    value,
    onChange,
    availableDates,
    minDate,
    maxDate,
    loading = false,
}: BookingCalendarProps) {
    const [minY, minM] = minDate.split("-").map(Number);
    const [maxY, maxM] = maxDate.split("-").map(Number);

    const [viewYear, setViewYear] = useState(() => (value ? Number(value.split("-")[0]) : minY));
    const [viewMonth, setViewMonth] = useState(() => (value ? Number(value.split("-")[1]) - 1 : minM - 1));

    const cells = useMemo(() => {
        const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
        // getUTCDay() renvoie 0 pour dimanche ; on décale pour une semaine qui démarre lundi.
        const firstDayOfWeek = (new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay() + 6) % 7;
        const result: (number | null)[] = Array(firstDayOfWeek).fill(null);
        for (let d = 1; d <= daysInMonth; d++) result.push(d);
        return result;
    }, [viewYear, viewMonth]);

    const isPrevDisabled = viewYear < minY || (viewYear === minY && viewMonth <= minM - 1);
    const isNextDisabled = viewYear > maxY || (viewYear === maxY && viewMonth >= maxM - 1);

    const goPrev = () => {
        if (isPrevDisabled) return;
        if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
        else setViewMonth((m) => m - 1);
    };

    const goNext = () => {
        if (isNextDisabled) return;
        if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
        else setViewMonth((m) => m + 1);
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
            <div className="flex items-center justify-between mb-2">
                <button
                    type="button" onClick={goPrev} disabled={isPrevDisabled}
                    aria-label="Mwa anvan"
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-white"
                >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white uppercase tracking-tight">
                        {MONTHS_HT[viewMonth]} {viewYear}
                    </span>
                    {loading && (
                        <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                </div>

                <button
                    type="button" onClick={goNext} disabled={isNextDisabled}
                    aria-label="Mwa apre"
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-white"
                >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_HT.map((d) => (
                    <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-white/30 py-0.5">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} className="h-8" />;

                    const dateStr = toDateStr(viewYear, viewMonth, day);
                    const inRange = dateStr >= minDate && dateStr <= maxDate;
                    const isAvailable = inRange && availableDates.has(dateStr);
                    const isSelected = value === dateStr;

                    return (
                        <button
                            key={dateStr}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => onChange(dateStr)}
                            aria-label={`${day} ${MONTHS_HT[viewMonth]} ${viewYear}`}
                            aria-pressed={isSelected}
                            className={`h-8 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                                isSelected
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : isAvailable
                                        ? "text-white hover:bg-white/10"
                                        : "text-white/15 cursor-not-allowed"
                            }`}
                        >
                            {day}
                            {/* Pastille de disponibilité : lisible d'un coup d'œil sans lire les chiffres. */}
                            <span
                                className={`w-1 h-1 rounded-full ${
                                    isSelected ? "bg-white" : isAvailable ? "bg-emerald-400" : "bg-transparent"
                                }`}
                            />
                        </button>
                    );
                })}
            </div>

            {/* Légende masquée sur les écrans courts (hauteur, pas largeur) : la pastille verte
                se comprend d'elle-même et cet espace fait basculer le calendrier en défilement. */}
            <div className="mt-3 pt-2 border-t border-white/5 hidden [@media(min-height:720px)]:flex items-center gap-4 text-[10px] font-bold text-white/40">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Disponib
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/15" /> Pa disponib
                </span>
            </div>
        </div>
    );
}

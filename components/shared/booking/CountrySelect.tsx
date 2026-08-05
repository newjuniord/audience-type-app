"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, CountryInfo } from "@/lib/timezones";

export interface CountrySelectProps {
    value: string; // code ISO
    onChange: (country: CountryInfo) => void;
    placeholder?: string;
}

/**
 * Sélecteur de pays avec recherche.
 *
 * Un `<select>` natif devient inutilisable au-delà d'une trentaine de pays sur mobile :
 * la recherche permet de taper "hai", "509" ou "usa" pour arriver directement au bon pays.
 */
export default function CountrySelect({ value, onChange, placeholder = "Chèche peyi w..." }: CountrySelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = COUNTRIES.find((c) => c.code === value);

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);

    const results = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return COUNTRIES;
        return COUNTRIES.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                c.dialCode.includes(q.replace("+", ""))
        );
    }, [search]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setSearch(""); }}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`w-full flex items-center justify-between gap-3 text-sm rounded-xl px-4 py-3.5 outline-none transition-colors border text-left ${
                    open ? "bg-white/10 border-primary text-white" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                }`}
            >
                {selected ? (
                    <span className="flex items-center gap-3 min-w-0">
                        <span className="text-lg leading-none">{selected.flag}</span>
                        <span className="font-bold truncate">{selected.name}</span>
                        <span className="text-white/40 text-xs shrink-0">{selected.dialCode}</span>
                    </span>
                ) : (
                    <span className="text-white/30">— Chwazi peyi w —</span>
                )}
                <span className="material-symbols-outlined text-lg opacity-50 shrink-0">expand_more</span>
            </button>

            {open && (
                <div className="absolute z-[70] left-0 right-0 mt-2 rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3 border-b border-white/5">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-[18px]">search</span>
                            <input
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={placeholder}
                                className="w-full text-sm rounded-xl pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-white/25 outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
                        {results.length === 0 && (
                            <li className="px-4 py-6 text-center text-xs text-white/30">Okenn peyi jwenn.</li>
                        )}
                        {results.map((country) => (
                            <li key={country.code}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={country.code === value}
                                    onClick={() => { onChange(country); setOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                        country.code === value ? "bg-primary/20 text-white" : "text-white/80 hover:bg-white/5"
                                    }`}
                                >
                                    <span className="text-lg leading-none">{country.flag}</span>
                                    <span className="font-medium flex-1 truncate">{country.name}</span>
                                    <span className="text-white/30 text-xs">{country.dialCode}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

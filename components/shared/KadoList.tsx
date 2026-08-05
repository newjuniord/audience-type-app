"use client";

import { useState } from "react";
import Link from "next/link";
import { FreeItem } from "@/components/buyer/KadoClaimModal";
import KadoClaimModal from "@/components/buyer/KadoClaimModal";

export default function KadoList({ freeItems }: { freeItems: FreeItem[] }) {
    const [selectedKado, setSelectedKado] = useState<FreeItem | null>(null);

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeItems.map((item) => (
                    <KadoCard
                        key={item.id + (item.kadoId || "")}
                        item={item}
                        onClickKado={(kadoItem) => setSelectedKado(kadoItem)}
                    />
                ))}
            </div>

            {selectedKado && (
                <KadoClaimModal
                    item={selectedKado}
                    onClose={() => setSelectedKado(null)}
                />
            )}
        </>
    );
}

function KadoCard({ item, onClickKado }: { item: FreeItem, onClickKado: (item: FreeItem) => void }) {
    const isKado = item.isKado;
    const isExpired = item.isExpired;

    const href = isExpired ? "#" : item.type === "Ebook"
        ? `/course/${item.id}?type=ebook`
        : `/course/${item.id}`;

    // Si c'est un Kado non expiré, on utilise un bouton au lieu d'un lien
    // Sinon on utilise le Link classique (pour Ebooks / Cours normaux gratuits)
    const content = (
        <>
            {/* Image */}
            <div className={`relative aspect-[4/3] overflow-hidden bg-white/5 ${isExpired ? "grayscale" : ""}`}>
                <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                        GRATIS
                    </span>
                    <span className="px-3 py-1 bg-black/60 backdrop-blur text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/10">
                        {item.type}
                    </span>
                    {isKado && !isExpired && (
                        <span className="px-3 py-1 bg-orange-500/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg">
                            <span className="material-symbols-outlined text-[10px]">redeem</span>
                            Kado Spécial
                        </span>
                    )}
                    {isExpired && (
                        <span className="px-3 py-1 bg-red-500/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg">
                            <span className="material-symbols-outlined text-[10px]">timer_off</span>
                            Ekspire
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-6 gap-4">
                <div className="flex-1 space-y-2">
                    <h3 className="font-black text-white text-lg leading-snug tracking-tight group-hover:text-primary transition-colors text-left">
                        {item.title}
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed line-clamp-2 text-left">
                        {item.description}
                    </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-primary">$0</span>
                        <span className="text-xs text-white/30 font-medium">100% gratis</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${isExpired ? "text-red-500" : "text-white/40 group-hover:text-primary"} transition-colors text-xs font-bold uppercase tracking-wider`}>
                        <span>{isExpired ? "Ekspire" : "Jwenn li"}</span>
                        {!isExpired && (
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    const commonClasses = `group relative flex flex-col overflow-hidden rounded-3xl border ${
        isExpired ? "border-red-500/20 bg-red-500/5 opacity-80 cursor-not-allowed" : "border-white/10 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.04] hover:-translate-y-1"
    } transition-all duration-300 w-full text-left`;

    if (isKado && !isExpired) {
        return (
            <button onClick={() => onClickKado(item)} className={commonClasses}>
                {content}
            </button>
        );
    }

    return (
        <Link href={href} className={commonClasses}>
            {content}
        </Link>
    );
}

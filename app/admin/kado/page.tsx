"use client";

import { useState, useEffect } from "react";
import { getGifts, deleteGift, updateGift } from "@/lib/gifts";
import { Gift } from "@/lib/types";
import Link from "next/link";

export default function AdminKadoPage() {
    const [gifts, setGifts] = useState<Gift[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setLoading(true);
            const data = await getGifts();
            data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setGifts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer ce Kado ? Cette action est irréversible.")) return;
        try {
            await deleteGift(id);
            setGifts(prev => prev.filter(g => g.id !== id));
        } catch (e) {
            alert("Erreur lors de la suppression.");
        }
    };

    const handleToggle = async (gift: Gift) => {
        try {
            await updateGift(gift.id!, { isActive: !gift.isActive });
            setGifts(prev => prev.map(g => g.id === gift.id ? { ...g, isActive: !g.isActive } : g));
        } catch (e) {
            alert("Erreur lors de la mise à jour.");
        }
    };

    const typeColors: Record<string, string> = {
        course: "bg-blue-100 text-blue-700",
        ebook: "bg-purple-100 text-purple-700",
        consultation: "bg-emerald-100 text-emerald-700",
    };

    const typeIcons: Record<string, string> = {
        course: "school",
        ebook: "menu_book",
        consultation: "calendar_month",
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
                            <span className="material-symbols-outlined text-white text-xl">redeem</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">Kado</h1>
                    </div>
                    <p className="text-sm text-black/50">Gérez les cadeaux et bonus offerts automatiquement à vos clients.</p>
                </div>
                <Link
                    href="/admin/kado/new"
                    className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Créer un Kado
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total", value: gifts.length, icon: "redeem", color: "text-orange-500" },
                    { label: "Actifs", value: gifts.filter(g => g.isActive).length, icon: "check_circle", color: "text-emerald-500" },
                    { label: "Utilisations", value: gifts.reduce((s, g) => s + (g.currentUsesCount || 0), 0), icon: "people", color: "text-blue-500" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white border border-black/5 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`material-symbols-outlined text-base ${stat.color}`}>{stat.icon}</span>
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{stat.label}</p>
                        </div>
                        <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Liste */}
            {gifts.length === 0 ? (
                <div className="bg-white border border-black/5 rounded-2xl p-16 text-center">
                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl text-orange-400">redeem</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2">Aucun Kado créé</h3>
                    <p className="text-sm text-black/40 mb-6 max-w-sm mx-auto">
                        Créez votre premier cadeau pour récompenser automatiquement vos clients après un achat.
                    </p>
                    <Link href="/admin/kado/new" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-all">
                        Créer mon premier Kado
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {gifts.map(gift => (
                        <div key={gift.id} className="bg-white border border-black/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all group flex flex-col">
                            {/* Image */}
                            <div className="relative h-40 bg-black/5 overflow-hidden">
                                {gift.photoLink ? (
                                    <img src={gift.photoLink} alt={gift.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-black/20">redeem</span>
                                    </div>
                                )}
                                {/* Badge type */}
                                <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${typeColors[gift.type] || "bg-gray-100 text-gray-600"}`}>
                                    <span className="material-symbols-outlined text-[10px] mr-1">{typeIcons[gift.type]}</span>
                                    {gift.type}
                                </span>
                                {/* Status dot */}
                                <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full border-2 border-white ${gift.isActive ? "bg-emerald-500" : "bg-red-400"}`} title={gift.isActive ? "Actif" : "Inactif"} />
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="font-black text-base mb-1 line-clamp-1">{gift.title}</h3>
                                <p className="text-xs text-black/40 line-clamp-2 mb-3">{gift.description}</p>

                                {/* Meta */}
                                <div className="space-y-1.5 mb-4 mt-auto">
                                    <div className="flex items-center gap-2 text-xs text-black/50">
                                        <span className="material-symbols-outlined text-[13px]">inventory_2</span>
                                        <span className="font-medium">Cadeau :</span>
                                        <span className="truncate">{gift.giftProductTitle}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-black/50">
                                        <span className="material-symbols-outlined text-[13px]">people</span>
                                        <span>{gift.currentUsesCount || 0} utilisation{(gift.currentUsesCount || 0) > 1 ? "s" : ""}</span>
                                        {gift.maxUses !== null && (
                                            <span className="text-black/30">/ {gift.maxUses} max</span>
                                        )}
                                    </div>
                                    {gift.expirationDate && (
                                        <div className="flex items-center gap-2 text-xs text-orange-500">
                                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                                            <span>Expire le {gift.expirationDate.toDate().toLocaleDateString("fr-FR")}</span>
                                        </div>
                                    )}
                                    {gift.requiresInvitation && (
                                        <div className="flex items-center gap-2 text-xs text-purple-600">
                                            <span className="material-symbols-outlined text-[13px]">key</span>
                                            <span>Code requis</span>
                                        </div>
                                    )}
                                </div>

                                {/* Progress bar maxUses */}
                                {gift.maxUses !== null && gift.maxUses > 0 && (
                                    <div className="mb-3">
                                        <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full transition-all"
                                                style={{ width: `${Math.min(100, (gift.currentUsesCount / gift.maxUses) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-black/30 mt-1">{Math.round((gift.currentUsesCount / gift.maxUses) * 100)}% utilisé</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="border-t border-black/5 p-3 flex items-center justify-between bg-black/[0.01]">
                                <button
                                    onClick={() => handleToggle(gift)}
                                    className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all ${
                                        gift.isActive
                                            ? "bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-600"
                                            : "bg-black/5 text-black/40 hover:bg-emerald-50 hover:text-emerald-600"
                                    }`}
                                >
                                    {gift.isActive ? "✓ Actif" : "Inactif"}
                                </button>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/admin/kado/${gift.id}`}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 text-black/50 hover:text-primary hover:bg-primary/10 transition-all"
                                        title="Modifier"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(gift.id!)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                        title="Supprimer"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

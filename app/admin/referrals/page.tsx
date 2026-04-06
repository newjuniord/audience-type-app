"use client";

import { useState, useEffect } from "react";
import { getReferrals, updateReferralStatus, deleteReferral } from "@/lib/referrals";
import { Referral } from "@/lib/types";
import { getDoc } from "firebase/firestore";

interface ExtendedReferral extends Referral {
    referrerName?: string;
    referrerEmail?: string;
    refereeName?: string;
    refereeEmail?: string;
}

export default function AdminReferralsPage() {
    const [referrals, setReferrals] = useState<ExtendedReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const loadReferrals = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getReferrals();
            
            // Résolution des noms et emails (parrallélisé pour la performance)
            const extendedData = await Promise.all(data.map(async (ref) => {
                try {
                    const [referrerSnap, refereeSnap] = await Promise.all([
                        getDoc(ref.referrerId),
                        getDoc(ref.refereeId)
                    ]);
                    
                    const referrerData: any = referrerSnap.exists() ? referrerSnap.data() : {};
                    const refereeData: any = refereeSnap.exists() ? refereeSnap.data() : {};
                    
                    return {
                        ...ref,
                        referrerName: referrerData.fullName || referrerData.displayName || "Inconnu",
                        referrerEmail: referrerData.email || "N/A",
                        refereeName: refereeData.fullName || refereeData.displayName || "Inconnu",
                        refereeEmail: refereeData.email || "N/A"
                    };
                } catch (e) {
                    console.error("Error resolving referral refs:", e);
                    return {
                        ...ref,
                        referrerName: "Erreur chargement",
                        refereeName: "Erreur chargement"
                    };
                }
            }));

            setReferrals(extendedData);
        } catch (err: any) {
            console.error("Failed to load referrals:", err);
            setError(err.message || "Impossible de charger les parrainages.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReferrals();
    }, []);

    const handleStatusChange = async (id: string, newStatus: 'pending' | 'rewarded') => {
        setUpdatingId(id);
        try {
            await updateReferralStatus(id, newStatus);
            setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (err) {
            alert("Erreur lors de la mise à jour du statut.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cet enregistrement de parrainage ?")) return;
        try {
            await deleteReferral(id);
            setReferrals(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            alert("Erreur lors de la suppression.");
        }
    };

    const formatDate = (dateValue: any) => {
        if (!dateValue) return "N/A";
        if (dateValue.toDate) return dateValue.toDate().toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        return new Date(dateValue).toLocaleDateString('fr-FR');
    };

    const filteredReferrals = referrals.filter(ref => 
        ref.referenceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.referrerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.refereeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.productTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.referrerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.refereeEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
                <div>
                    <h1 className="text-primary dark:text-white text-4xl font-black leading-tight tracking-tighter mb-2">Parrainages</h1>
                    <p className="text-black/50 dark:text-white/50 text-sm font-medium">Gérez les utilisations de codes de référence et les récompenses.</p>
                </div>
                <div className="bg-primary/5 dark:bg-primary/10 px-6 py-4 rounded-[2rem] border border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Total Parrainages</p>
                    <p className="text-2xl font-black text-primary">{referrals.length}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30">search</span>
                    <input
                        type="text"
                        placeholder="Rechercher par code, parrain, client ou produit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-14 pr-6 rounded-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium placeholder:text-black/30 dark:placeholder:text-white/30"
                    />
                </div>
                <button
                    onClick={loadReferrals}
                    className="h-14 px-8 rounded-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-sm"
                >
                    <span className="material-symbols-outlined">refresh</span>
                    Actualiser
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-black/10 border border-black/5 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm shadow-black/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Date & Code</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Parrain (Referrer)</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Client (Referee)</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Produit & Montant</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Statut</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-8 py-10 text-center text-black/40 italic">Chargement des parrainages...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={6} className="px-8 py-10 text-center text-red-500 font-bold">Erreur: {error}</td></tr>
                            ) : filteredReferrals.length === 0 ? (
                                <tr><td colSpan={6} className="px-8 py-10 text-center text-black/40">Aucun parrainage trouvé.</td></tr>
                            ) : (
                                filteredReferrals.map((ref) => (
                                    <tr key={ref.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-black/40 dark:text-white/40 mb-1">{formatDate(ref.createdAt)}</span>
                                                <span className="font-black text-primary tracking-widest uppercase">{ref.referenceCode}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-black dark:text-white">{ref.referrerName}</span>
                                                <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">{ref.referrerEmail}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-black dark:text-white">{ref.refereeName}</span>
                                                <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">{ref.refereeEmail}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-black dark:text-white">{ref.productTitle}</span>
                                                <span className="font-black text-[10px] uppercase text-primary mt-1">${ref.amount}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select
                                                value={ref.status}
                                                disabled={updatingId === ref.id}
                                                onChange={(e) => handleStatusChange(ref.id!, e.target.value as any)}
                                                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full outline-none cursor-pointer transition-all ${
                                                    ref.status === 'rewarded' 
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-500/20' 
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20'
                                                }`}
                                            >
                                                <option value="pending">En attente</option>
                                                <option value="rewarded">Récompensé</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => handleDelete(ref.id!)}
                                                className="size-10 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                                title="Supprimer l'enregistrement"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

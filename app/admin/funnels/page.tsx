"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FunnelData } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminFunnelsPage() {
    const [funnels, setFunnels] = useState<FunnelData[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchFunnels = async () => {
            try {
                const q = query(collection(db, "funnels"));
                // On n'utilise pas orderBy("createdAt", "desc") au début pour éviter des erreurs d'index si non existant
                const querySnapshot = await getDocs(q);
                const fetchedFunnels = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                })) as FunnelData[];
                
                // Tri manuel si createdAt existe
                fetchedFunnels.sort((a, b) => {
                    const timeA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.toMillis()) : 0;
                    const timeB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.toMillis()) : 0;
                    return timeB - timeA;
                });
                
                setFunnels(fetchedFunnels);
            } catch (error) {
                console.error("Erreur de récupération des funnels:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFunnels();
    }, []);

    const handleDelete = async (id: string | undefined) => {
        if (!id) return;
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette page de vente ? Cette action est irréversible.")) return;

        try {
            await deleteDoc(doc(db, "funnels", id));
            setFunnels(funnels.filter(f => f.id !== id));
        } catch (error) {
            console.error("Erreur lors de la suppression:", error);
            alert("Erreur lors de la suppression.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">Pages de Vente (Funnels)</h1>
                    <p className="text-sm text-black/50 dark:text-white/50">Gérez les landing pages dynamiques pour vos produits.</p>
                </div>
                <Link
                    href="/admin/funnels/new"
                    className="bg-primary text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Créer une Page
                </Link>
            </div>

            {funnels.length === 0 ? (
                <div className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-2xl text-black/40 dark:text-white/40">filter_alt</span>
                    </div>
                    <h3 className="text-lg font-bold text-black dark:text-white mb-1">Aucune page de vente</h3>
                    <p className="text-sm text-black/50 dark:text-white/50 mb-6 max-w-md mx-auto">
                        Vous n'avez pas encore créé de page de vente. Créez-en une pour commencer à vendre vos ebooks ou formations avec une landing page dédiée.
                    </p>
                    <Link
                        href="/admin/funnels/new"
                        className="bg-primary text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all inline-flex items-center gap-2"
                    >
                        Créer ma première page
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {funnels.map((funnel) => (
                        <div key={funnel.id} className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col">
                            <div className="p-5 flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 px-2 py-1 rounded-md">
                                        {funnel.linkedProductType || 'Produit personnalisé'}
                                    </span>
                                    <span className={`w-2 h-2 rounded-full ${funnel.isActive ? 'bg-green-500' : 'bg-red-500'}`} title={funnel.isActive ? "Actif" : "Inactif"}></span>
                                </div>
                                <h3 className="font-bold text-lg text-black dark:text-white mb-1 line-clamp-1" title={funnel.headline}>
                                    {funnel.headline || 'Sans titre'}
                                </h3>
                                <p className="text-sm text-black/50 dark:text-white/50 font-mono mb-4">
                                    /start/{funnel.id}
                                </p>
                                <div className="flex items-center gap-4 text-xs font-bold text-black/60 dark:text-white/60">
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">sell</span>
                                        {funnel.currency}{funnel.currentPrice}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">group</span>
                                        {funnel.spotsLeft} places
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-black/5 dark:border-white/10 p-3 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
                                <Link
                                    href={`/start/${funnel.id}`}
                                    target="_blank"
                                    className="text-xs font-bold text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
                                    title="Voir la page publique"
                                >
                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                    Voir
                                </Link>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/admin/funnels/${funnel.id}`)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 hover:text-primary transition-colors"
                                        title="Modifier"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(funnel.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                        title="Supprimer"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
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

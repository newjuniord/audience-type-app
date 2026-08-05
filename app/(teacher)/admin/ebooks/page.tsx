"use client";

import { useState, useEffect } from "react";
import EbookDrawer from "@/components/admin/EbookDrawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { getEbooks, addEbook, updateEbook, deleteEbook } from "@/lib/ebooks";
import { Ebook } from "@/lib/types";

export default function EbooksManagementPage() {
    const [ebooks, setEbooks] = useState<Ebook[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch Ebooks
    useEffect(() => {
        loadEbooks();
    }, []);

    const loadEbooks = async () => {
        try {
            setLoading(true);
            const data = await getEbooks();
            setEbooks(data);
        } catch (error) {
            console.error("Error loading ebooks:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleOpenCreate = () => {
        setSelectedEbook(null);
        setIsDrawerOpen(true);
    };

    const handleOpenEdit = (ebook: Ebook) => {
        setSelectedEbook(ebook);
        setIsDrawerOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteEbook(deleteId);
            setEbooks(prev => prev.filter(e => e.id !== deleteId));
            setDeleteId(null);
        } catch (error) {
            console.error("Error deleting ebook:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveEbook = async (data: Partial<Ebook>) => {
        try {
            if (selectedEbook && selectedEbook.id) {
                // Update
                await updateEbook(selectedEbook.id, data);
            } else {
                // Create
                // Ensure default values for required fields that might be optional in Partial
                await addEbook(data as any);
            }
            loadEbooks();
        } catch (error) {
            console.error("Error saving:", error);
            throw error;
        }
    };

    return (
        <main className="max-w-6xl mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Ebooks</h2>
                    <p className="text-black/50 dark:text-white/50 text-sm">Gérez vos publications numériques et ebooks.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-primary text-white dark:bg-white dark:text-primary px-8 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Ajouter un Ebook
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {[
                    { label: "Total Ebooks", value: ebooks.length.toString(), icon: "book" },
                    { label: "Ventes Totales", value: ebooks.reduce((acc, curr) => acc + (curr.sales || 0), 0).toString(), icon: "shopping_cart" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 p-6 rounded-3xl group hover:border-black/20 dark:hover:border-white/20 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined opacity-40">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">{stat.label}</p>
                                <p className="text-2xl font-black">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ebook Grid */}
            {loading ? (
                <div className="text-center py-20 opacity-50">Chargement...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {ebooks.map((ebook) => (
                        <div key={ebook.id} className="group cursor-pointer">
                            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 mb-6 shadow-sm group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-500">
                                {ebook.coverImage ? (
                                    <img src={ebook.coverImage} alt={ebook.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
                                        <span className="material-symbols-outlined text-4xl opacity-20">book</span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(ebook); }}
                                        className="size-12 rounded-full bg-white text-primary flex items-center justify-center hover:scale-110 transition-transform"
                                        title="Modifier"
                                    >
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); ebook.id && setDeleteId(ebook.id); }}
                                        className="size-12 rounded-full bg-white text-red-500 flex items-center justify-center hover:scale-110 transition-transform"
                                        title="Supprimer"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    ebook.status === 'published' 
                                        ? 'bg-green-500 text-white' 
                                        : ebook.status === 'archived'
                                            ? 'bg-red-500 text-white'
                                            : 'bg-black/40 text-white backdrop-blur-md'
                                    }`}>
                                    {ebook.status === 'published' 
                                        ? 'Publié' 
                                        : ebook.status === 'archived'
                                            ? 'Archivé'
                                            : 'Brouillon'}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight mb-1 group-hover:text-primary dark:group-hover:text-white transition-colors">{ebook.title}</h3>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-black/40 dark:text-white/40">${ebook.price}{ebook.priceHTG ? ` / ${ebook.priceHTG.toLocaleString()} HTG` : ''}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-black/20 dark:text-white/20">{ebook.sales || 0} Ventes</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Create New Card */}
                    <div
                        onClick={handleOpenCreate}
                        className="aspect-[3/4] rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-center p-8 group hover:border-black/30 dark:hover:border-white/30 cursor-pointer transition-all"
                    >
                        <div className="size-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined opacity-40">add</span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-black/40 dark:text-white/40">Ajouter un Ebook</h3>
                    </div>
                </div>
            )}

            <EbookDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                initialData={selectedEbook}
                onSave={handleSaveEbook}
            />

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => !isDeleting && setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Supprimer l'Ebook ?"
                message="Êtes-vous sûr de vouloir supprimer cet ebook ? Cette action est irréversible."
                confirmText="Supprimer"
                isDanger={true}
                isLoading={isDeleting}
            />
        </main>
    );
}

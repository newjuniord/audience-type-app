"use client";

import { useState, useEffect } from "react";
import { Course } from "@/lib/types";

interface CourseDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Course | null;
    onSave: (data: Partial<Course>) => Promise<void>;
}

export default function CourseDrawer({ isOpen, onClose, initialData, onSave }: CourseDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [price, setPrice] = useState("");
    const [dodoProductId, setDodoProductId] = useState(""); // Add State
    const [status, setStatus] = useState("draft"); // Default to draft
    const [description, setDescription] = useState("");
    const [thumbnail, setThumbnail] = useState("");
    const [includedItems, setIncludedItems] = useState<string[]>([""]);
    const [isInvitationOnly, setIsInvitationOnly] = useState(false);
    const [invitationCode, setInvitationCode] = useState("");

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';

            // Populate form if editing
            if (initialData) {
                setTitle(initialData.title || "");
                setPrice(initialData.price?.toString() || "");
                setDodoProductId(initialData.dodoProductId || ""); // Load existing ID
                setStatus(initialData.statut || "draft");
                setDescription(initialData.description || "");
                setThumbnail(initialData.thumbnail || "");
                setIncludedItems(initialData.includedItems?.length ? initialData.includedItems : [""]);
                setIsInvitationOnly(initialData.isInvitationOnly || false);
                setInvitationCode(initialData.invitationCode || "");
            } else {
                // Reset for new course
                setTitle("");
                setPrice("");
                setDodoProductId(""); // Reset
                setStatus("draft");
                setDescription("");
                setThumbnail("");
                setIncludedItems([""]);
                setIsInvitationOnly(false);
                setInvitationCode("");
            }
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialData]);

    if (!isVisible && !isOpen) return null;

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await onSave({
                title,
                price: parseFloat(price) || 0,
                dodoProductId, // Save ID
                statut: status,
                description,
                thumbnail,
                includedItems: includedItems.filter(i => i.trim() !== ""),
                isInvitationOnly,
                invitationCode: isInvitationOnly ? invitationCode : ""
            });
            onClose();
        } catch (error) {
            console.error("Error saving course:", error);
            alert("Erreur lors de l'enregistrement.");
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setIncludedItems([...includedItems, ""]);
    };

    const removeItem = (index: number) => {
        setIncludedItems(includedItems.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, value: string) => {
        const newItems = [...includedItems];
        newItems[index] = value;
        setIncludedItems(newItems);
    };

    return (
        <div className={`fixed inset-0 z-[100] transition-all duration-700 overflow-hidden ${isOpen ? 'visible' : 'invisible delay-700'}`}>
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[2px] transition-opacity duration-700 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`absolute top-0 right-0 h-full w-full max-w-[500px] bg-white dark:bg-background-dark shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-none flex flex-col transform transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-8 py-8 border-b border-black/5 dark:border-white/5 transition-all duration-700 delay-100 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">{initialData ? "Modifier le cours" : "Créer un nouveau cours"}</h2>
                        <p className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mt-1">Publiez votre contenu éducatif</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group"
                    >
                        <span className="material-symbols-outlined text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white">close</span>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar">
                    {/* Thumbnail Upload */}
                    <section className={`transition-all duration-700 delay-200 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-4">Miniature du cours (URL)</label>
                        <div className="relative group">
                            <div className="w-full aspect-video rounded-3xl border-2 border-dashed border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 dark:hover:border-white/30 transition-all overflow-hidden shadow-inner">
                                {thumbnail ? (
                                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${thumbnail}')` }}>
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setThumbnail(""); }}
                                            className="absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 group-hover:scale-110 transition-transform duration-500">
                                        <span className="material-symbols-outlined text-3xl text-black/20 dark:text-white/20">link</span>
                                        <input
                                            type="text"
                                            placeholder="Collez l'URL de l'image ici"
                                            className="bg-transparent border-none text-center text-xs focus:ring-0 placeholder:text-black/20"
                                            value={thumbnail}
                                            onChange={(e) => setThumbnail(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-black/40 dark:text-white/40 mt-2 text-center">Astuce: Utilisez la page Storage pour uploader et obtenir une URL.</p>
                        </div>
                    </section>

                    {/* Basic Details */}
                    <section className={`space-y-6 transition-all duration-700 delay-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-2">Titre du cours</label>
                            <input
                                className="w-full px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all text-sm font-medium"
                                placeholder="ex: Masterclass de Typographie"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-2">Prix ($)</label>
                                <input
                                    className="w-full px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all text-sm font-medium"
                                    placeholder="199"
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-2">ID Dodo (Paiement)</label>
                                <input
                                    className="w-full px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all text-sm font-medium"
                                    placeholder="pdt_..."
                                    type="text"
                                    value={dodoProductId}
                                    onChange={(e) => setDodoProductId(e.target.value)}
                                />
                                <p className="text-[10px] text-black/30 dark:text-white/30 mt-1 ml-2">ID du produit dans le tableau de bord Dodo Payments</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-2">Statut</label>
                                <div className="flex bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-1 h-[56px]">
                                    <button
                                        onClick={() => setStatus('published')}
                                        className={`flex-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${status === 'published' ? 'bg-primary text-white shadow-md' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        Publié
                                    </button>
                                    <button
                                        onClick={() => setStatus('draft')}
                                        className={`flex-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${status === 'draft' ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        Brouillon
                                    </button>
                                    <button
                                        onClick={() => setStatus('archived')}
                                        className={`flex-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${status === 'archived' ? 'bg-red-500/10 text-red-500' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        Archivé
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-2">Description</label>
                            <textarea
                                className="w-full px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all text-sm font-medium resize-none shadow-sm"
                                placeholder="Décrivez ce que les étudiants vont apprendre..."
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl">
                                <div>
                                    <p className="text-sm font-bold">Sur invitation uniquement</p>
                                    <p className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-widest mt-1">Nécessite un code pour l'accès</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={isInvitationOnly}
                                        onChange={(e) => setIsInvitationOnly(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-black/10 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            {isInvitationOnly && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">Code d'invitation</label>
                                    <input
                                        value={invitationCode}
                                        onChange={(e) => setInvitationCode(e.target.value)}
                                        className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                        placeholder="ex: VIP2024"
                                        type="text"
                                    />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* What's Included */}
                    <section className={`transition-all duration-700 delay-[400ms] ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">Ce qui est inclus</label>
                            <button
                                onClick={addItem}
                                className="text-[10px] font-black uppercase text-primary dark:text-white flex items-center gap-1 hover:opacity-70 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Add Item
                            </button>
                        </div>
                        <div className="space-y-3">
                            {includedItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-3 bg-black/[0.03] dark:bg-white/[0.03] p-4 rounded-2xl group transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border border-transparent hover:border-black/5 dark:hover:border-white/5">
                                    <span className="material-symbols-outlined text-green-500 text-xl font-bold">check_circle</span>
                                    <input
                                        className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                                        type="text"
                                        value={item}
                                        onChange={(e) => updateItem(index, e.target.value)}
                                        placeholder="Ajouter un élément descriptif..."
                                    />
                                    <button
                                        onClick={() => removeItem(index)}
                                        className="text-black/20 dark:text-white/20 hover:text-red-500 dark:hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <span className="material-symbols-outlined text-xl">remove_circle</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className={`px-8 py-8 border-t border-black/5 dark:border-white/5 bg-white dark:bg-background-dark space-y-3 transition-all duration-700 delay-500 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-5 bg-primary dark:bg-white text-white dark:text-primary rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/10 dark:shadow-white/5 disabled:opacity-50"
                    >
                        {loading ? "Enregistrement..." : "Enregistrer le cours"}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-5 bg-transparent text-black/40 dark:text-white/40 font-black text-xs uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
}

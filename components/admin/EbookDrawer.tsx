"use client";

import { useState, useEffect, useRef } from "react";
import { Ebook } from "@/lib/types";
import { uploadFile } from "@/lib/storage";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface EbookDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Ebook | null;
    onSave: (data: Partial<Ebook>) => Promise<void>;
}

export default function EbookDrawer({ isOpen, onClose, initialData, onSave }: EbookDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const { user, userData } = useAuth();
    const { showToast } = useToast();
    
    // Author State
    const [authorName, setAuthorName] = useState("");
    const [authorImage, setAuthorImage] = useState("");
    const [isUploadingAuthor, setIsUploadingAuthor] = useState(false);
    const authorInputRef = useRef<HTMLInputElement>(null);

    // Form States
    const [title, setTitle] = useState("");
    const [price, setPrice] = useState("");
    const [priceHTG, setPriceHTG] = useState("");
    const [lemonSqueezyProductId, setLemonSqueezyProductId] = useState("");
    const [description, setDescription] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [status, setStatus] = useState("draft");
    const [includedItems, setIncludedItems] = useState<string[]>([]);
    const [fileUrl, setFileUrl] = useState("");


    // Reset or Populate form when drawer opens/closes or data changes
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';

            if (initialData) {
                // Edit Mode
                setTitle(initialData.title);
                setPrice(initialData.price.toString());
                setPriceHTG(initialData.priceHTG?.toString() || "");
                setLemonSqueezyProductId(initialData.lemonSqueezyProductId || "");
                setDescription(initialData.description);
                setCoverImage(initialData.coverImage);
                setStatus(initialData.status);
                setIncludedItems(initialData.includedItems || []);
                setFileUrl(initialData.fileUrl);
                setAuthorName(initialData.authorName || "");
                setAuthorImage(initialData.authorImage || "");
            } else {
                // Create Mode (Reset)
                setTitle("");
                setPrice("");
                setPriceHTG("");
                setLemonSqueezyProductId("");
                setDescription("");
                setCoverImage("");
                setStatus("draft");
                setIncludedItems(["Digital PDF"]);
                setFileUrl("");
                setAuthorName("");
                setAuthorImage("");
            }
        } else {
            const timer = setTimeout(() => setIsVisible(false), 700);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialData]);

    if (!isVisible && !isOpen) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSave({
                title,
                price: parseFloat(price) || 0,
                priceHTG: parseFloat(priceHTG) || 0,
                lemonSqueezyProductId,
                description,
                coverImage,
                status,
                includedItems,
                fileUrl,
                sales: initialData ? initialData.sales : 0, // Preserve sales if editing
                authorName: authorName.trim() || userData?.displayName || userData?.name || user?.displayName || "Admin User",
                authorImage: authorImage.trim() || user?.photoURL || "",
                authorId: initialData?.authorId || user?.uid || ""
            });
            showToast(initialData ? "Ebook modifié avec succès !" : "Ebook créé avec succès !", "success");
            onClose();
        } catch (error) {
            console.error("Error saving ebook:", error);
            showToast("Erreur lors de la sauvegarde.", "error");
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
                    <h2 className="text-xl font-black tracking-tight uppercase">
                        {initialData ? "Modifier l'Ebook" : "Créer un nouvel Ebook"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="size-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all group"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">
                    {/* Ebook Cover Upload */}
                    <section className={`transition-all duration-700 delay-200 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-4">Couverture (URL ou Fichier)</label>
                        <div className="flex flex-col gap-4">
                            <input 
                                type="file" 
                                hidden 
                                ref={coverInputRef} 
                                accept="image/*"
                                onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        try {
                                            setIsUploadingCover(true);
                                            const file = await uploadFile(e.target.files[0]);
                                            setCoverImage(file.url);
                                        } catch (error) {
                                            console.error("Upload failed", error);
                                            showToast("L'upload a échoué.", "error");
                                        } finally {
                                            setIsUploadingCover(false);
                                            if (coverInputRef.current) coverInputRef.current.value = "";
                                        }
                                    }
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    className="flex-1 h-10 px-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border-none text-sm"
                                    placeholder="https://..."
                                    type="text"
                                    value={coverImage}
                                    onChange={(e) => setCoverImage(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => coverInputRef.current?.click()}
                                    disabled={isUploadingCover}
                                    className="h-10 px-4 bg-primary text-white rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-50"
                                >
                                    {isUploadingCover ? "Upload..." : "Uploader"}
                                </button>
                            </div>
                            {coverImage && (
                                <div className="aspect-[3/4] w-32 rounded-lg overflow-hidden border border-black/10 relative group">
                                    <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setCoverImage("")}
                                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <span className="material-symbols-outlined text-xs">delete</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Basic Details */}
                    <section className={`space-y-6 transition-all duration-700 delay-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">Titre de l'Ebook</label>
                            <input
                                className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                placeholder="ex: Systèmes de Design Minimalistes"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">Prix ($)</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 font-bold">$</span>
                                    <input
                                        className="w-full h-14 pl-10 pr-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                        placeholder="29"
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">Prix (HTG)</label>
                                <div className="relative">
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 font-bold text-[10px]">HTG</span>
                                    <input
                                        className="w-full h-14 pl-6 pr-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                        placeholder="2500"
                                        type="number"
                                        value={priceHTG}
                                        onChange={(e) => setPriceHTG(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>



                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">ID Lemon Squeezy</label>
                            <input
                                className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                placeholder="Variant ID..."
                                type="text"
                                value={lemonSqueezyProductId}
                                onChange={(e) => setLemonSqueezyProductId(e.target.value)}
                            />
                            <p className="text-[10px] text-black/30 dark:text-white/30 ml-1">ID de la variante (Lemon Squeezy)</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">Statut</label>
                            <div className="flex bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-1 h-14">
                                <button
                                    onClick={() => {
                                        if (status !== 'published') {
                                            setShowPublishConfirm(true);
                                        }
                                    }}
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

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">Description</label>
                            <textarea
                                className="w-full min-h-[140px] p-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium resize-none shadow-inner"
                                placeholder="Décrivez votre ebook..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            ></textarea>
                        </div>
                    </section>

                    {/* Author Details */}
                    <section className={`space-y-6 transition-all duration-700 delay-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <h3 className="text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/60">Informations de l'Auteur</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-2">Nom de l'auteur</label>
                                <input
                                    className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all text-sm font-medium"
                                    placeholder="ex: Jean Ronald Dumervil"
                                    type="text"
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-2">Photo de l'auteur (URL ou Fichier)</label>
                                <div className="flex flex-col gap-4">
                                    <input 
                                        type="file" 
                                        hidden 
                                        ref={authorInputRef} 
                                        accept="image/*"
                                        onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                try {
                                                    setIsUploadingAuthor(true);
                                                    const file = await uploadFile(e.target.files[0]);
                                                    setAuthorImage(file.url);
                                                } catch (error) {
                                                    console.error("Upload failed", error);
                                                    showToast("L'upload a échoué.", "error");
                                                } finally {
                                                    setIsUploadingAuthor(false);
                                                    if (authorInputRef.current) authorInputRef.current.value = "";
                                                }
                                            }
                                        }}
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            className="flex-1 h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none text-sm font-medium focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none"
                                            placeholder="https://..."
                                            type="text"
                                            value={authorImage}
                                            onChange={(e) => setAuthorImage(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => authorInputRef.current?.click()}
                                            disabled={isUploadingAuthor}
                                            className="h-14 px-6 bg-primary text-white rounded-2xl text-xs font-bold whitespace-nowrap disabled:opacity-50 hover:bg-primary/90 transition-all shadow-md"
                                        >
                                            {isUploadingAuthor ? "Upload..." : "Uploader"}
                                        </button>
                                    </div>
                                    {authorImage && (
                                        <div className="flex items-center gap-4 p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/5 dark:border-white/5">
                                            <img src={authorImage} alt="Author Preview" className="size-12 rounded-full object-cover border border-primary/20" />
                                            <div className="flex-1 text-xs text-black/40 dark:text-white/40">Aperçu de la photo de l'auteur</div>
                                            <button
                                                onClick={() => setAuthorImage("")}
                                                className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-2">Lien du Fichier (facultatif)</label>
                            <input 
                                type="file" 
                                hidden 
                                ref={fileInputRef} 
                                accept=".pdf,.doc,.docx,.zip,.rar"
                                onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        try {
                                            setIsUploadingFile(true);
                                            const file = await uploadFile(e.target.files[0]);
                                            setFileUrl(file.url);
                                        } catch (error) {
                                            console.error("Upload failed", error);
                                            showToast("L'upload a échoué.", "error");
                                        } finally {
                                            setIsUploadingFile(false);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }
                                    }
                                }}
                            />
                            <div className="flex items-center">
                                <input
                                    className="w-full h-14 px-6 rounded-l-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                    placeholder="URL du fichier..."
                                    type="text"
                                    value={fileUrl}
                                    onChange={(e) => setFileUrl(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingFile}
                                    className="px-4 h-14 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 whitespace-nowrap border-l border-white/10"
                                >
                                    {isUploadingFile ? "Upload..." : "Uploader"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileUrl && window.open(fileUrl, '_blank')}
                                    disabled={!fileUrl}
                                    className="px-4 h-14 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-primary dark:text-white rounded-r-2xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Tester
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* What's Included */}
                    <section className={`space-y-4 transition-all duration-700 delay-[400ms] ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">Ce qui est inclus</label>
                            <button
                                onClick={addItem}
                                className="text-[10px] font-black uppercase text-primary dark:text-white flex items-center gap-1 hover:opacity-70 transition-opacity"
                                type="button"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Ajouter un élément
                            </button>
                        </div>
                        <div className="space-y-3">
                            {includedItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-3 p-4 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl group transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border border-transparent hover:border-black/5 dark:hover:border-white/5 shadow-inner">
                                    <span className="material-symbols-outlined text-green-500 text-xl font-bold">check_circle</span>
                                    <input
                                        className="bg-transparent border-none focus:ring-0 p-0 flex-1 text-sm font-medium"
                                        type="text"
                                        value={item}
                                        onChange={(e) => updateItem(index, e.target.value)}
                                        placeholder="Ajouter un élément descriptif..."
                                    />
                                    <button
                                        onClick={() => removeItem(index)}
                                        className="opacity-0 group-hover:opacity-100 text-black/20 dark:text-white/20 hover:text-red-500 transition-all"
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className={`px-8 py-8 border-t border-black/5 dark:border-white/5 bg-white dark:bg-background-dark grid grid-cols-2 gap-4 transition-all duration-700 delay-500 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <button
                        onClick={onClose}
                        className="w-full h-14 bg-transparent border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 rounded-full font-black text-xs uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full h-14 bg-primary dark:bg-white text-white dark:text-primary rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/10 dark:shadow-white/5 disabled:opacity-50"
                    >
                        {loading ? "Sauvegarde..." : "Enregistrer"}
                    </button>
                </div>
            </div >

            <ConfirmModal
                isOpen={showPublishConfirm}
                onClose={() => setShowPublishConfirm(false)}
                onConfirm={() => {
                    setStatus('published');
                    setShowPublishConfirm(false);
                }}
                title="Confirmer la publication"
                message="Êtes-vous sûr de vouloir publier cet ebook ? Il sera disponible à l'achat."
                confirmText="Publier"
                cancelText="Annuler"
            />
        </div >
    );
}

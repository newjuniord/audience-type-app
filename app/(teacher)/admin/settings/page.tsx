"use client";

import { useState, useEffect } from "react";
import VideoPlayer from "@/components/shared/VideoPlayer";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function SettingsPage() {
    const [videoUrl, setVideoUrl] = useState("");
    const [videoVisible, setVideoVisible] = useState(false);
    const [chatAccessRule, setChatAccessRule] = useState<"all" | "enrolled_only" | "closed">("enrolled_only");
    const [chatMessageLimit, setChatMessageLimit] = useState<number>(0);
    const [chatLimitTarget, setChatLimitTarget] = useState<"all" | "non_enrolled">("non_enrolled");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [messageModal, setMessageModal] = useState({ isOpen: false, title: "", message: "", type: "alert" as "alert" | "confirm" });

    const handleSave = async () => {
        setIsSaving(true);
        try {
            setMessageModal({
                isOpen: true,
                title: "Succès",
                message: "Paramètres sauvegardés avec succès !",
                type: "alert"
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            setMessageModal({
                isOpen: true,
                title: "Erreur",
                message: "Erreur lors de la sauvegarde.",
                type: "alert"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase">Paramètres</h1>
                <p className="text-black/60 dark:text-white/60 font-medium mt-2">
                    Personnalisez le contenu de présentation de l'application
                </p>
            </div>

            <div className="bg-white dark:bg-background-dark border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-black/5">
                <div className="p-8 border-b border-black/5 dark:border-white/10">
                    <h2 className="text-xl font-bold">Vidéo de la Page d'Accueil</h2>
                    <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                        Cette vidéo est affichée directement sous le bouton central de la page d'accueil pour attirer l'attention des utilisateurs.
                    </p>
                </div>

                <div className="p-8 space-y-8">
                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm">Afficher la vidéo</h3>
                            <p className="text-xs text-black/40 dark:text-white/40">Active ou désactive la vidéo pour tous les visiteurs ouverts</p>
                        </div>
                        <button
                            onClick={() => setVideoVisible(!videoVisible)}
                            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${
                                videoVisible ? "bg-emerald-500" : "bg-black/10 dark:bg-white/10"
                            }`}
                        >
                            <div
                                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${
                                    videoVisible ? "translate-x-6" : "translate-x-0"
                                }`}
                            />
                        </button>
                    </div>

                    {/* URL Input */}
                    <div className={`transition-opacity duration-300 ${!videoVisible ? 'opacity-50' : 'opacity-100'}`}>
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-3">
                            URL de la Vidéo (Vimeo, YouTube, HTML5, Bunny.net)
                        </label>
                        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <span className="material-symbols-outlined text-black/20 dark:text-white/20">link</span>
                            <input
                                className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                                placeholder="https://vimeo.com/..."
                                type="text"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Video Preview */}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">
                            Aperçu
                        </label>
                        <div className="max-w-2xl bg-black/[0.03] p-4 rounded-3xl border border-black/5 dark:border-white/10 shadow-inner">
                            <VideoPlayer url={videoUrl} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-background-dark border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-black/5 mt-8">
                <div className="p-8 border-b border-black/5 dark:border-white/10">
                    <h2 className="text-xl font-bold">Accès au Support Chat</h2>
                    <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                        Définissez qui peut utiliser le chat pour contacter le support.
                    </p>
                </div>
                <div className="p-8 space-y-4">
                    <label className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-colors ${chatAccessRule === "enrolled_only" ? "border-primary bg-primary/5" : "border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"}`}>
                        <input 
                            type="radio" 
                            name="chatAccess" 
                            checked={chatAccessRule === "enrolled_only"} 
                            onChange={() => setChatAccessRule("enrolled_only")}
                            className="mt-1"
                        />
                        <div>
                            <span className="font-bold block">Réservé aux inscrits</span>
                            <span className="text-xs text-black/60 dark:text-white/60">Seuls les utilisateurs ayant acheté un produit ou pris un rendez-vous y ont accès.</span>
                        </div>
                    </label>
                    <label className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-colors ${chatAccessRule === "all" ? "border-primary bg-primary/5" : "border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"}`}>
                        <input 
                            type="radio" 
                            name="chatAccess" 
                            checked={chatAccessRule === "all"} 
                            onChange={() => setChatAccessRule("all")}
                            className="mt-1"
                        />
                        <div>
                            <span className="font-bold block">Ouvert à tous</span>
                            <span className="text-xs text-black/60 dark:text-white/60">N'importe quel utilisateur connecté peut vous envoyer un message.</span>
                        </div>
                    </label>
                    <label className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-colors ${chatAccessRule === "closed" ? "border-red-500 bg-red-500/5 dark:bg-red-500/10" : "border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"}`}>
                        <input 
                            type="radio" 
                            name="chatAccess" 
                            checked={chatAccessRule === "closed"} 
                            onChange={() => setChatAccessRule("closed")}
                            className="mt-1"
                        />
                        <div>
                            <span className="font-bold block text-red-500">Fermer temporairement</span>
                            <span className="text-xs text-black/60 dark:text-white/60">Désactive complètement le chat de support pour tous les utilisateurs.</span>
                        </div>
                    </label>

                    {chatAccessRule !== "closed" && (
                        <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/10 space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="font-bold text-sm">Limiter le nombre de messages</h3>
                                <p className="text-xs text-black/40 dark:text-white/40 mt-1">
                                    Définissez si les utilisateurs ont une limite du nombre de messages qu'ils peuvent envoyer.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">
                                        Nombre maximal de messages par utilisateur
                                    </label>
                                    <select
                                        value={chatMessageLimit}
                                        onChange={(e) => setChatMessageLimit(Number(e.target.value))}
                                        className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 outline-none text-sm font-medium dark:text-white dark:bg-background-dark"
                                    >
                                        <option value={0}>Illimité</option>
                                        <option value={2}>2 messages</option>
                                        <option value={3}>3 messages</option>
                                        <option value={5}>5 messages</option>
                                        <option value={8}>8 messages</option>
                                        <option value={10}>10 messages</option>
                                        <option value={15}>15 messages</option>
                                    </select>
                                </div>

                                {chatMessageLimit > 0 && (
                                    <div className="space-y-3 animate-in fade-in duration-300">
                                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest">
                                            À qui s'applique cette limite ?
                                        </label>
                                        <div className="flex gap-4">
                                            <label className={`flex-1 flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors ${chatLimitTarget === "all" ? "border-primary bg-primary/5" : "border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"}`}>
                                                <input 
                                                    type="radio" 
                                                    name="chatLimitTarget" 
                                                    checked={chatLimitTarget === "all"} 
                                                    onChange={() => setChatLimitTarget("all")}
                                                    className="accent-primary"
                                                />
                                                <span className="text-xs font-bold">Tous les utilisateurs</span>
                                            </label>
                                            <label className={`flex-1 flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors ${chatLimitTarget === "non_enrolled" ? "border-primary bg-primary/5" : "border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"}`}>
                                                <input 
                                                    type="radio" 
                                                    name="chatLimitTarget" 
                                                    checked={chatLimitTarget === "non_enrolled"} 
                                                    onChange={() => setChatLimitTarget("non_enrolled")}
                                                    className="accent-primary"
                                                />
                                                <span className="text-xs font-bold">Uniquement non-inscrits</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-4 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <span className="material-symbols-outlined animate-spin font-light">refresh</span>
                            Sauvegarde...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-sm font-bold">save</span>
                            Enregistrer
                        </>
                    )}
                </button>
            </div>

            <ConfirmModal
                isOpen={messageModal.isOpen}
                onClose={() => setMessageModal({ ...messageModal, isOpen: false })}
                title={messageModal.title}
                message={messageModal.message}
                type={messageModal.type}
                confirmText="Fermer"
            />
        </div>
    );
}

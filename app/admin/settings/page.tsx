"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VideoPlayer from "@/components/VideoPlayer";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function SettingsPage() {
    const [videoUrl, setVideoUrl] = useState("");
    const [videoVisible, setVideoVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [messageModal, setMessageModal] = useState({ isOpen: false, title: "", message: "", type: "alert" as "alert" | "confirm" });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "homepage");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setVideoUrl(data.videoUrl || "");
                    setVideoVisible(!!data.videoVisible);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docRef = doc(db, "settings", "homepage");
            await setDoc(docRef, {
                videoUrl,
                videoVisible
            }, { merge: true });
            
            // Show success toast
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
        <div className="max-w-4xl space-y-8 animate-fade-in pb-20">
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

                {/* Footer Actions */}
                <div className="px-8 py-6 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/10 flex justify-end">
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

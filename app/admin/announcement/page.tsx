"use client";

import { useState, useEffect } from "react";
import { getAnnouncementSettings, updateAnnouncementSettings, AnnouncementBarSettings, defaultSettings } from "@/lib/announcement";

export default function AnnouncementAdminPage() {
    const [settings, setSettings] = useState<AnnouncementBarSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await getAnnouncementSettings();
                setSettings(data);
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ text: "", type: "" });

        try {
            await updateAnnouncementSettings(settings);
            setMessage({ text: "Paramètres enregistrés avec succès !", type: "success" });
        } catch (error) {
            console.error("Failed to save settings:", error);
            setMessage({ text: "Erreur lors de l'enregistrement.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-700 max-w-4xl mx-auto pb-20">
            <div className="mb-12">
                <h2 className="text-4xl font-black tracking-tight mb-2">Barre d'annonce</h2>
                <p className="text-black/50 dark:text-white/50 text-sm">Configurez la barre d'annonce globale pour vos utilisateurs.</p>
            </div>

            {/* Preview Section */}
            <div className="mb-12">
                <p className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-4">Aperçu</p>
                <div 
                    className="w-full py-3 px-6 text-center text-sm font-bold rounded-xl overflow-hidden border border-black/5 dark:border-white/10"
                    style={{ 
                        backgroundColor: settings.backgroundColor, 
                        color: settings.textColor,
                        opacity: settings.isActive ? 1 : 0.5
                    }}
                >
                    {settings.text || "Texte de l'annonce..."}
                    {!settings.isActive && (
                        <span className="ml-2 text-[10px] uppercase tracking-tighter opacity-70">(Désactivé)</span>
                    )}
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8 bg-white dark:bg-black/20 p-8 border border-black/5 dark:border-white/10 rounded-[1.5rem]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* General Settings */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3">Statut</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={settings.isActive}
                                    onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-black/10 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                <span className="ms-3 text-sm font-medium">{settings.isActive ? 'Activé' : 'Désactivé'}</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3">Texte de l'annonce</label>
                            <textarea 
                                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                rows={3}
                                value={settings.text}
                                onChange={(e) => setSettings({ ...settings, text: e.target.value })}
                                placeholder="Entrez le texte de l'annonce ici..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3">Lien (optionnel)</label>
                            <input 
                                type="text"
                                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={settings.link}
                                onChange={(e) => setSettings({ ...settings, link: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    {/* Styling & Visibility */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3">Fond (Couleur)</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="color"
                                        className="size-10 rounded-full border-none cursor-pointer"
                                        value={settings.backgroundColor}
                                        onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                                    />
                                    <input 
                                        type="text"
                                        className="flex-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full px-4 py-2 text-xs font-mono outline-none"
                                        value={settings.backgroundColor}
                                        onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3">Texte (Couleur)</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="color"
                                        className="size-10 rounded-full border-none cursor-pointer"
                                        value={settings.textColor}
                                        onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                                    />
                                    <input 
                                        type="text"
                                        className="flex-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full px-4 py-2 text-xs font-mono outline-none"
                                        value={settings.textColor}
                                        onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3">Afficher pour</label>
                            <select 
                                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                value={settings.displayFor}
                                onChange={(e) => setSettings({ ...settings, displayFor: e.target.value as any })}
                            >
                                <option value="all">Tout le monde</option>
                                <option value="logged-in">Utilisateurs connectés uniquement</option>
                                <option value="guest">Utilisateurs non-connectés uniquement</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3">Filtre de produits</label>
                            <select 
                                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                value={settings.productFilter}
                                onChange={(e) => setSettings({ ...settings, productFilter: e.target.value as any })}
                            >
                                <option value="all">Tous les utilisateurs</option>
                                <option value="has-product">Seulement ceux qui ont déjà acheté</option>
                                <option value="no-product">Seulement ceux qui n'ont rien acheté</option>
                            </select>
                        </div>
                    </div>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-2xl text-sm font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                        {message.text}
                    </div>
                )}

                <div className="flex justify-end border-t border-black/5 dark:border-white/10 pt-8">
                    <button 
                        type="submit"
                        disabled={isSaving}
                        className="px-10 py-4 bg-primary text-white font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                </div>
            </form>
        </div>
    );
}

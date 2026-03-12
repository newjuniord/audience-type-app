"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateUser } from "@/lib/users";

export default function WhatsAppPromptModal() {
    const { user, userData, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

    useEffect(() => {
        // Check if user is logged in, not loading, has no phone number, and hasn't dismissed the modal
        if (!loading && user && userData && !userData.phoneNumber && !hasBeenDismissed) {
             // Only show after a short delay for better UX
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 2000);
            return () => clearTimeout(timer);
        } else {
            setIsOpen(false);
        }
    }, [user, userData, loading, hasBeenDismissed]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !phoneNumber.trim()) return;

        setIsSubmitting(true);
        try {
            await updateUser(user.uid, { phoneNumber: phoneNumber.trim() });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update WhatsApp number", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDismiss = () => {
        setIsOpen(false);
        setHasBeenDismissed(true);
        // We could also store this in localStorage to not show it again for a while
        localStorage.setItem(`dismiss_whatsapp_prompt_${user?.uid}`, Date.now().toString());
    };

    // Check localStorage on mount
    useEffect(() => {
        if (user) {
            const lastDismiss = localStorage.getItem(`dismiss_whatsapp_prompt_${user.uid}`);
            if (lastDismiss) {
                const dismissDate = parseInt(lastDismiss);
                const now = Date.now();
                // If dismissed less than 1 day ago, don't show
                if (now - dismissDate < 24 * 60 * 60 * 1000) {
                    setHasBeenDismissed(true);
                }
            }
        }
    }, [user]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="relative p-8">
                    {/* Close button */}
                    <button 
                        onClick={handleDismiss}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-black/40 dark:text-white/40">close</span>
                    </button>

                    <div className="flex flex-col items-center text-center">
                        {/* Icon */}
                        <div className="size-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <svg className="size-10 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.895-5.335 11.898-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </div>

                        <h2 className="text-2xl font-black tracking-tight mb-3">Ajoutez votre WhatsApp</h2>
                        <p className="text-black/50 dark:text-white/50 text-sm mb-8 leading-relaxed">
                            Afin de mieux vous accompagner et vous tenir informé de l'évolution de vos cours, veuillez ajouter votre numéro WhatsApp.
                        </p>

                        <form onSubmit={handleSubmit} className="w-full space-y-4">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30">call</span>
                                <input 
                                    type="tel"
                                    placeholder="Votre numéro (ex: +221 77...)"
                                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none transition-all placeholder:opacity-50"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !phoneNumber.trim()}
                                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">save</span>
                                        Enregistrer
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="w-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-black/40 dark:text-white/40 font-bold py-3 rounded-2xl transition-all text-sm"
                            >
                                Plus tard
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

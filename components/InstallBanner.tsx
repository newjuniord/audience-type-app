"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function InstallBanner() {
    const { user } = useAuth();
    const pathname = usePathname();

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showIosInstructions, setShowIosInstructions] = useState(false);

    useEffect(() => {
        // 1. Détecter si déjà installé en mode standalone
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true;

        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // 2. Vérifier si l'utilisateur a refusé récemment (7 jours)
        const dismissed = localStorage.getItem("pwa_install_dismissed");
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - dismissedAt < sevenDays) return;
        }

        // 3. Détecter iOS (Safari)
        const isIosDevice =
            /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        if (isIosDevice && isSafari) {
            setIsIos(true);
            // Afficher après 3s sur iOS
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => clearTimeout(timer);
        }

        // 4. Android/Chrome — écouter beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Afficher après 5s
            setTimeout(() => setShowBanner(true), 5000);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (isIos) {
            setShowIosInstructions(true);
            return;
        }
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setShowBanner(false);
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem("pwa_install_dismissed", Date.now().toString());
        setShowBanner(false);
        setShowIosInstructions(false);
    };

    if (isInstalled || !showBanner) return null;

    const hasBottomNav = !!(user && 
        pathname &&
        !pathname.startsWith("/admin") && 
        !pathname.startsWith("/course/") && 
        !pathname.startsWith("/login"));

    return (
        <>
            {/* Bannière principale */}
            <div className={`fixed left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500 ${
                hasBottomNav ? "bottom-[76px] md:bottom-0" : "bottom-0"
            }`}>
                <div className="max-w-md mx-auto bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                    {/* Barre décorative orange */}
                    <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            {/* Icône app */}
                            <div className="size-12 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 border border-white/10">
                                <img
                                    src="/icons/icon-192.png"
                                    alt="DJR Akademi"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-black text-sm">Enstale DJR Akademi</p>
                                <p className="text-white/50 text-xs font-medium mt-0.5">
                                    Aksè rapid, san navigatè
                                </p>
                            </div>
                        </div>

                        {!showIosInstructions ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleInstall}
                                    className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
                                >
                                    {isIos ? "Gade kijan pou w enstale l" : "Enstale"}
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="px-4 h-11 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 rounded-xl font-bold text-xs transition-all"
                                >
                                    Pita
                                </button>
                            </div>
                        ) : (
                            /* Instructions iOS */
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                                <p className="text-white/80 text-xs font-bold uppercase tracking-wider">
                                    📱 Enstriksyon pou iOS (Safari)
                                </p>
                                <div className="space-y-1.5 text-xs text-white/60">
                                    <div className="flex items-center gap-2">
                                        <span className="size-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-black flex-shrink-0">1</span>
                                        <span>Peze sou bouton <strong className="text-white">Pataje a</strong> <span className="text-orange-400">⬆️</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="size-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-black flex-shrink-0">2</span>
                                        <span>Desann epi peze sou <strong className="text-white">"Ajoute sou ekran akey"</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="size-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-black flex-shrink-0">3</span>
                                        <span>Peze sou <strong className="text-white">"Ajoute"</strong> anlè a dwat</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="w-full h-9 mt-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all"
                                >
                                    Mwen konprann
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

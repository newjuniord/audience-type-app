"use client";

import { useEffect, useState } from "react";

export default function SplashTransition() {
    const [visible, setVisible] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        // Uniquement en mode standalone (PWA installée)
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true;

        if (!isStandalone) return;

        // Vérifier si le splash a déjà été montré dans cette session
        const shownThisSession = sessionStorage.getItem("splash_shown");
        if (shownThisSession) return;

        setVisible(true);
        sessionStorage.setItem("splash_shown", "1");

        // Commencer à disparaître après 5.5s (un peu plus de 5s)
        const fadeTimer = setTimeout(() => setFadeOut(true), 5500);
        // Masquer complètement après la transition
        const hideTimer = setTimeout(() => setVisible(false), 6000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(hideTimer);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{
                backgroundColor: "#0a0a0a",
                opacity: fadeOut ? 0 : 1,
                transition: "opacity 0.5s ease-out",
                pointerEvents: fadeOut ? "none" : "all",
            }}
        >
            {/* Logo animé */}
            <div
                className="flex flex-col items-center gap-4"
                style={{
                    transform: fadeOut ? "scale(1.05)" : "scale(1)",
                    transition: "transform 0.5s ease-out",
                }}
            >
                <div
                    className="size-24 rounded-3xl overflow-hidden shadow-2xl"
                    style={{
                        animation: "splashPulse 2s ease-in-out infinite",
                        boxShadow: "0 0 60px rgba(249, 115, 22, 0.3)",
                    }}
                >
                    <img
                        src="/icons/icon-512.png"
                        alt="DJR Akademi"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="text-center">
                    <p className="text-white font-black text-xl tracking-tight uppercase">DJR Akademi</p>
                    <p className="text-white/30 text-xs font-medium tracking-widest uppercase mt-1">
                        Chargement...
                    </p>
                </div>
                {/* Barre de chargement orange */}
                <div className="w-16 h-0.5 bg-white/10 rounded-full overflow-hidden mt-2">
                    <div
                        className="h-full w-full bg-orange-500 rounded-full"
                        style={{
                            animation: "splashBar 5.5s ease-out forwards",
                            transformOrigin: "left",
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes splashPulse {
                    0% { opacity: 0; transform: scale(0.85); }
                    60% { opacity: 1; transform: scale(1.02); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes splashBar {
                    0% { transform: scaleX(0); }
                    100% { transform: scaleX(1); }
                }
            `}</style>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";

export default function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Initial check
        setIsOnline(navigator.onLine);
        if (!navigator.onLine) setShowBanner(true);

        const handleOnline = () => {
            setIsOnline(true);
            // Hide banner after 3 seconds when back online
            setTimeout(() => setShowBanner(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!showBanner) return null;

    return (
        <div
            className={`fixed top-0 left-0 w-full z-[9999] px-4 py-2 text-center font-bold text-sm shadow-md transition-all duration-300 transform ${isOnline ? "bg-green-500 translate-y-[-100%]" : "bg-red-500 translate-y-0"
                } ${showBanner && isOnline ? "!translate-y-0" : ""}`}
            style={{ color: 'white' }}
        >
            <span>{isOnline ? "Koneksyon an retabli" : "Koneksyon entènèt la pa stab"}</span>
        </div>
    );
}

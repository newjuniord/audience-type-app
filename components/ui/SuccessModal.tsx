"use client";

import { useEffect, useState } from "react";

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
}

export default function SuccessModal({ isOpen, onClose, title = "Succès !", message }: SuccessModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';

            // Auto close after 3 seconds (optional, but good for UX)
            // const timer = setTimeout(onClose, 3000);
            // return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen && !isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className={`relative bg-white dark:bg-[#111] rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all duration-500 ${isOpen ? "scale-100 translate-y-0" : "scale-90 translate-y-4"}`}>

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600 rounded-t-3xl"></div>

                <div className="flex flex-col items-center text-center">
                    {/* Animated Icon Container */}
                    <div className="mb-6 relative">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-300 delay-150">
                            <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400 animate-in spin-in-12 duration-500">check_circle</span>
                        </div>
                        {/* Ripple Effect */}
                        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping duration-1000 delay-300"></div>
                    </div>

                    <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white animate-in slide-in-from-bottom-2 duration-500 delay-100">
                        {title}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 mb-8 animate-in slide-in-from-bottom-2 duration-500 delay-200">
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-xl font-bold text-white bg-slate-900 dark:bg-white dark:text-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg animate-in slide-in-from-bottom-2 duration-500 delay-300"
                    >
                        Continuer
                    </button>
                </div>
            </div>
        </div>
    );
}

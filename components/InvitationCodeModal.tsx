"use client";

import { useState, useEffect } from "react";

interface InvitationCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    correctCode: string;
    onSuccess: () => void;
    productName: string;
}

export default function InvitationCodeModal({ 
    isOpen, 
    onClose, 
    correctCode, 
    onSuccess,
    productName 
}: InvitationCodeModalProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 500);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.trim() === correctCode) {
            onSuccess();
            onClose();
        } else {
            setError(true);
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    };

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-500 ${isOpen ? 'visible' : 'invisible delay-500'}`}>
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className={`relative w-full max-w-md bg-white dark:bg-background-dark rounded-[2.5rem] shadow-[0_32px_96px_-16px_rgba(0,0,0,0.3)] dark:shadow-none overflow-hidden transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'} ${shake ? 'animate-shake' : ''}`}>
                
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-primary/50 to-primary" />

                <div className="p-10 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="size-20 bg-primary/10 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <span className="material-symbols-outlined text-4xl text-primary dark:text-white font-bold">lock_open</span>
                    </div>

                    <h2 className="text-3xl font-black tracking-tight mb-2">Accès Limité</h2>
                    <p className="text-black/40 dark:text-white/40 text-sm font-medium mb-8 max-w-[280px]">
                        <span className="text-black dark:text-white font-bold">{productName}</span> est disponible exclusivement sur invitation.
                    </p>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        <div className="relative group">
                            <input
                                autoFocus
                                type="text"
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value);
                                    setError(false);
                                }}
                                className={`w-full h-16 px-8 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-2 transition-all outline-none text-center text-lg font-black tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:font-medium placeholder:text-black/20 dark:placeholder:text-white/20 ${error ? 'border-red-500/50 text-red-500' : 'border-transparent focus:border-primary/20 dark:focus:border-white/20'}`}
                                placeholder="Entrer le code"
                            />
                            {error && (
                                <p className="absolute -bottom-6 left-0 w-full text-[10px] font-black uppercase text-red-500 tracking-widest animate-in fade-in slide-in-from-top-1">
                                    Code invalide. Veuillez réessayer.
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full h-16 bg-primary dark:bg-white text-white dark:text-primary rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-primary/20 dark:shadow-white/5 mt-4"
                        >
                            Vérifier le code
                        </button>
                    </form>

                    <button 
                        onClick={onClose}
                        className="mt-8 text-[10px] font-black uppercase text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white tracking-widest transition-colors"
                    >
                        Annuler et fermer
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-8px); }
                    40%, 80% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
}

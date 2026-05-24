"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

export interface FreeItem {
    id: string;
    title: string;
    description: string;
    image: string;
    type: "Ebook" | "Kou" | "Bonus";
    fileUrl?: string;
    isKado?: boolean;
    kadoId?: string;
    isExpired?: boolean;
    requiresInvitation?: boolean;
}

interface KadoClaimModalProps {
    item: FreeItem;
    onClose: () => void;
}

export default function KadoClaimModal({ item, onClose }: KadoClaimModalProps) {
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState<"initial" | "code" | "loading" | "success" | "error">(
        "initial"
    );
    const [invitationCode, setInvitationCode] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Drag-to-close state
    const [isClosing, setIsClosing] = useState(false);
    const [dragY, setDragY] = useState(0);
    const dragStartY = useRef(0);
    const isDragging = useRef(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 350);
    };

    const onDragStart = (e: React.TouchEvent | React.PointerEvent) => {
        isDragging.current = true;
        dragStartY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    };
    
    const onDragMove = (e: React.TouchEvent | React.PointerEvent) => {
        if (!isDragging.current) return;
        const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const delta = Math.max(0, currentY - dragStartY.current);
        setDragY(delta);
    };
    
    const onDragEnd = () => {
        isDragging.current = false;
        if (dragY > 80) handleClose();
        else setDragY(0);
    };

    const handleClaim = async () => {
        if (!user) {
            router.push(`/login?redirect=/kado`);
            return;
        }

        if (step === "code" && item.requiresInvitation && !invitationCode.trim()) {
            setErrorMessage("Tanpri antre yon kòd envitasyon.");
            setStep("error");
            return;
        }

        setStep("loading");
        setErrorMessage("");

        try {
            const res = await fetch("/api/gifts/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    giftId: item.kadoId,
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.displayName || "Itilizatè",
                    invitationCode: invitationCode.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Gen yon erè ki pase");
            }

            switch (data.result) {
                case "success":
                    setStep("success");
                    break;
                case "already_enrolled":
                    setErrorMessage("Ou gen pwodui sa a deja.");
                    setStep("error");
                    break;
                case "invalid_code":
                    setErrorMessage("Kòd envitasyon an pa kòrèk.");
                    setStep("error");
                    break;
                case "missing_code":
                    // L'utilisateur n'a pas le produit déclencheur, on demande le code
                    setStep("code");
                    break;
                case "inactive":
                case "expired":
                    setErrorMessage("Kado sa a pa disponib ankò.");
                    setStep("error");
                    break;
                case "max_uses_reached":
                    setErrorMessage("Limit itilizasyon kado sa a rive nan bout li.");
                    setStep("error");
                    break;
                default:
                    setErrorMessage("Erè enkoni.");
                    setStep("error");
            }
        } catch (e: any) {
            setErrorMessage(e.message || "Gen yon erè koneksyon ki pase.");
            setStep("error");
        }
    };

    // Animation de feu d'artifice lors du succès
    useEffect(() => {
        if (step === "success") {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [step]);

    // If no code is required, we can just show the "Claim" button in the initial step
    // Or if they just clicked it, we can auto-claim if user is logged in
    // For better UX, let's show a confirmation step.

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                style={{ opacity: isClosing ? 0 : dragY > 0 ? Math.max(0, 1 - dragY / 300) : 1 }}
                onClick={handleClose}
            />

            <div 
                className="bg-[#121212] border border-white/10 rounded-t-[2rem] md:rounded-3xl w-full md:max-w-md overflow-hidden shadow-2xl relative min-h-[55vh] md:min-h-0 flex flex-col"
                style={{
                    transform: isClosing
                      ? 'translateY(100%)'
                      : dragY > 0
                      ? `translateY(${dragY}px)`
                      : 'translateY(0)',
                    opacity: isClosing ? 0 : dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : 1,
                    transition: isDragging.current ? 'none' : 'transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.35s ease',
                  }}
            >
                {/* Drag handle for mobile */}
                <div 
                    className="absolute top-0 left-0 w-full flex justify-center pt-4 pb-2 z-20 md:hidden cursor-grab active:cursor-grabbing touch-none"
                    onTouchStart={onDragStart}
                    onTouchMove={onDragMove}
                    onTouchEnd={onDragEnd}
                    onPointerDown={onDragStart}
                    onPointerMove={onDragMove}
                    onPointerUp={onDragEnd}
                >
                    <div 
                        className="rounded-full bg-white/25 transition-all duration-150"
                        style={{
                            width: dragY > 20 ? '48px' : '40px',
                            height: '4px',
                            opacity: dragY > 0 ? 0.6 : 1,
                        }}
                    />
                </div>

                {/* Close button - visible only on desktop */}
                <button
                    onClick={handleClose}
                    className="hidden md:flex absolute top-4 right-4 w-8 h-8 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white/70 hover:text-white transition-all z-20"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>

                {/* Header Image */}
                <div className="relative h-56 md:h-48 w-full bg-white/5 shrink-0">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />
                    <div className="absolute bottom-4 left-6 right-6">
                        <span className="inline-block px-3 py-1 bg-orange-500/90 text-white text-[10px] font-black uppercase tracking-wider rounded-full mb-2 shadow-lg">
                            Kado Espesyal
                        </span>
                        <h3 className="font-black text-2xl md:text-2xl text-white leading-tight drop-shadow-md">{item.title}</h3>
                    </div>
                </div>

                <div className="p-6 md:p-8 pb-12 md:pb-8 flex-1 flex flex-col">
                    {/* States */}
                    {step === "initial" && (
                        <div className="space-y-6">
                            <p className="text-white/60 text-sm">
                                Ou pral debloke kontni eksklizif sa a gratis.
                            </p>
                            <button
                                onClick={handleClaim}
                                className="w-full py-3.5 bg-primary text-white font-black rounded-xl uppercase tracking-wider hover:opacity-90 transition-all"
                            >
                                Debloke kounye a
                            </button>
                        </div>
                    )}

                    {step === "code" && (
                        <div className="space-y-5">
                            <p className="text-white/60 text-sm">
                                Kado sa a bezwen yon kòd envitasyon sekrè pou debloke.
                            </p>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Kòd sekrè</label>
                                <input
                                    type="text"
                                    value={invitationCode}
                                    onChange={(e) => setInvitationCode(e.target.value)}
                                    placeholder="Antre kòd la la..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono uppercase"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handleClaim}
                                disabled={!invitationCode.trim()}
                                className="w-full py-3.5 bg-primary text-white font-black rounded-xl uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                Valide kòd la
                            </button>
                        </div>
                    )}

                    {step === "loading" && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
                            <p className="text-white/50 text-sm font-medium animate-pulse">Verifikasyon ap fèt...</p>
                        </div>
                    )}

                    {step === "error" && (
                        <div className="space-y-6 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4">
                                <span className="material-symbols-outlined text-3xl">error</span>
                            </div>
                            <p className="text-white text-base font-bold">{errorMessage}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => item.requiresInvitation ? setStep("code") : setStep("initial")}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                                >
                                    Refè l ankò
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                                >
                                    Fèmen
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="space-y-6 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-4">
                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                            </div>
                            <h4 className="text-white text-xl font-black">Kado debloke !</h4>
                            <p className="text-white/60 text-sm">
                                Kontni an ajoute nan kont ou. Ou gen aksè san limit kounye a.
                            </p>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl uppercase tracking-wider transition-all"
                            >
                                Ale nan tablodbò a
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

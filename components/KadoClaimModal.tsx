"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

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
        item.requiresInvitation ? "code" : "initial"
    );
    const [invitationCode, setInvitationCode] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleClaim = async () => {
        if (!user) {
            router.push(`/login?redirect=/kado`);
            return;
        }

        if (item.requiresInvitation && !invitationCode.trim()) {
            setErrorMessage("Veuillez entrer un code d'invitation.");
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
                    userName: user.displayName || "Utilisateur",
                    invitationCode: invitationCode.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Une erreur s'est produite");
            }

            switch (data.result) {
                case "success":
                    setStep("success");
                    break;
                case "already_enrolled":
                    setErrorMessage("Vous possédez déjà ce produit.");
                    setStep("error");
                    break;
                case "invalid_code":
                    setErrorMessage("Code d'invitation incorrect.");
                    setStep("error");
                    break;
                case "inactive":
                case "expired":
                    setErrorMessage("Ce cadeau n'est plus disponible.");
                    setStep("error");
                    break;
                case "max_uses_reached":
                    setErrorMessage("La limite d'utilisation de ce cadeau a été atteinte.");
                    setStep("error");
                    break;
                default:
                    setErrorMessage("Erreur inconnue.");
                    setStep("error");
            }
        } catch (e: any) {
            setErrorMessage(e.message || "Une erreur de connexion est survenue.");
            setStep("error");
        }
    };

    // If no code is required, we can just show the "Claim" button in the initial step
    // Or if they just clicked it, we can auto-claim if user is logged in
    // For better UX, let's show a confirmation step.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all z-10"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>

                {/* Header Image */}
                <div className="relative h-48 w-full bg-white/5">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />
                    <div className="absolute bottom-4 left-6 right-6">
                        <span className="inline-block px-3 py-1 bg-orange-500/90 text-white text-[10px] font-black uppercase tracking-wider rounded-full mb-2">
                            Kado Spécial
                        </span>
                        <h3 className="font-black text-xl text-white leading-tight">{item.title}</h3>
                    </div>
                </div>

                <div className="p-6">
                    {/* States */}
                    {step === "initial" && (
                        <div className="space-y-6">
                            <p className="text-white/60 text-sm">
                                Vous êtes sur le point de débloquer ce contenu exclusif gratuitement.
                            </p>
                            <button
                                onClick={handleClaim}
                                className="w-full py-3.5 bg-primary text-white font-black rounded-xl uppercase tracking-wider hover:opacity-90 transition-all"
                            >
                                Débloquer maintenant
                            </button>
                        </div>
                    )}

                    {step === "code" && (
                        <div className="space-y-5">
                            <p className="text-white/60 text-sm">
                                Ce cadeau nécessite un code d'invitation secret pour être débloqué.
                            </p>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Code secret</label>
                                <input
                                    type="text"
                                    value={invitationCode}
                                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                                    placeholder="Entrez le code ici..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono uppercase"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handleClaim}
                                disabled={!invitationCode.trim()}
                                className="w-full py-3.5 bg-primary text-white font-black rounded-xl uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                Valider le code
                            </button>
                        </div>
                    )}

                    {step === "loading" && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
                            <p className="text-white/50 text-sm font-medium animate-pulse">Vérification en cours...</p>
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
                                    Réessayer
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="space-y-6 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-4">
                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                            </div>
                            <h4 className="text-white text-xl font-black">Cadeau débloqué !</h4>
                            <p className="text-white/60 text-sm">
                                Le contenu a été ajouté à votre compte. Vous y avez maintenant accès en illimité.
                            </p>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl uppercase tracking-wider transition-all"
                            >
                                Aller au tableau de bord
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

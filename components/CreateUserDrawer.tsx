"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CreateUserDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated: () => void;
}

export default function CreateUserDrawer({ isOpen, onClose, onUserCreated }: CreateUserDrawerProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Le nom est obligatoire.");
            return;
        }

        if (!email.trim() && !phone.trim()) {
            setError("Vous devez fournir un email ou un numéro de téléphone.");
            return;
        }

        setLoading(true);

        try {
            const usersRef = collection(db, "users");

            // Vérifier si l'email existe déjà
            if (email.trim()) {
                const emailQuery = query(usersRef, where("email", "==", email.trim().toLowerCase()));
                const emailSnap = await getDocs(emailQuery);
                if (!emailSnap.empty) {
                    setError("Cette adresse e-mail est déjà associée à un autre compte.");
                    setLoading(false);
                    return;
                }
            }

            // Vérifier si le numéro existe déjà
            if (phone.trim()) {
                const phoneQuery = query(usersRef, where("phone", "==", phone.trim()));
                const phoneSnap = await getDocs(phoneQuery);
                if (!phoneSnap.empty) {
                    setError("Ce numéro de téléphone est déjà associé à un autre compte.");
                    setLoading(false);
                    return;
                }
            }

            // Créer l'utilisateur dans Firestore
            await addDoc(usersRef, {
                fullName: name.trim(),
                displayName: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                role: "customer",
                createdAt: serverTimestamp(),
                enrollmentCount: 0,
            });

            // Réinitialiser le formulaire
            setName("");
            setEmail("");
            setPhone("");
            
            onUserCreated();
            onClose();
        } catch (err: any) {
            console.error("Erreur lors de la création de l'utilisateur:", err);
            setError(err.message || "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-background-dark shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-black/10 dark:border-white/10 flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                    <div>
                        <h2 className="text-xl font-black">Ajouter un utilisateur</h2>
                        <p className="text-xs text-black/50 dark:text-white/50 mt-1">Créer manuellement un compte membre</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="size-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                            <span className="material-symbols-outlined text-base mt-0.5">error</span>
                            <p>{error}</p>
                        </div>
                    )}

                    <form id="create-user-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
                                Nom Complet <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="Ex: Jean Dupont"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
                                Email
                            </label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="Ex: jean.dupont@email.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
                                Numéro de téléphone
                            </label>
                            <input 
                                type="text" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="Ex: +33612345678"
                            />
                            <p className="text-[10px] text-black/40 mt-1">Inclure l&apos;indicatif (ex: +33, +509)</p>
                        </div>

                        <div className="pt-4 border-t border-black/5 dark:border-white/10">
                            <p className="text-xs text-black/50 italic leading-relaxed">
                                Note : L&apos;utilisateur n&apos;aura pas besoin de mot de passe. Il pourra se connecter via OTP (SMS) ou par e-mail en utilisant les informations saisies ci-dessus.
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-end gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-full text-sm font-bold text-black/60 hover:bg-black/5 transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        type="submit"
                        form="create-user-form"
                        disabled={loading}
                        className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Création...
                            </>
                        ) : "Créer l'utilisateur"}
                    </button>
                </div>
            </div>
        </>
    );
}

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

function ResetPasswordForm() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Firebase inclut un paramètre 'oobCode' dans le lien envoyé par e-mail
    const oobCode = searchParams.get("oobCode");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!oobCode) {
            setError("Le code de réinitialisation est manquant ou invalide.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setSuccess(true);
        } catch (err: any) {
            console.error("Password reset error:", err);
            if (err.code === "auth/invalid-action-code" || err.code === "auth/expired-action-code") {
                setError("Le lien de réinitialisation est invalide ou a expiré. Veuillez refaire une demande.");
            } else {
                setError("Une erreur est survenue. Veuillez réessayer.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 border border-primary/10 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                <div className="size-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Mot de passe modifié</h2>
                <p className="text-primary/60 dark:text-white/60 mb-8">
                    Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
                <Link 
                    href="/login"
                    className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center"
                >
                    Retour à la connexion
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleReset} className="flex flex-col gap-4 p-[20px] border border-primary/10 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
                    {error}
                </div>
            )}
            
            {!oobCode && !error && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-sm font-medium text-center">
                    Le lien semble invalide. Assurez-vous d'avoir cliqué sur le lien complet dans votre e-mail.
                </div>
            )}

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-primary/80 dark:text-white/80">Nouveau mot de passe</label>
                <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-primary/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-white/20 transition-all text-sm"
                    placeholder="••••••••"
                    required
                    minLength={6}
                />
            </div>
            
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-primary/80 dark:text-white/80">Confirmer le nouveau mot de passe</label>
                <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-primary/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-white/20 transition-all text-sm"
                    placeholder="••••••••"
                    required
                    minLength={6}
                />
            </div>

            <button 
                type="submit"
                disabled={isLoading || !oobCode}
                className="w-full py-3 mt-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
            >
                {isLoading ? (
                    <div className="h-5 w-5 mx-auto border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    "Réinitialiser le mot de passe"
                )}
            </button>
            
            <div className="text-center mt-2">
                <Link 
                    href="/login"
                    className="text-sm text-primary/60 dark:text-white/60 hover:text-primary dark:hover:text-white transition-colors"
                >
                    Retour à la connexion
                </Link>
            </div>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex h-screen w-full bg-white dark:bg-background-dark text-primary dark:text-white overflow-hidden items-center justify-center p-4">
            <div className="w-full max-w-md flex flex-col">
                <Link href="/" className="flex items-center justify-center gap-3 mb-12 group">
                    <div className="size-10 bg-black dark:bg-white rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12">
                        <span className="material-symbols-outlined text-white dark:text-black">bolt</span>
                    </div>
                    <span className="text-xl font-black tracking-tighter uppercase italic">DRJ Akademi</span>
                </Link>

                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black tracking-tight mb-2 uppercase">
                        Nouveau mot de passe
                    </h1>
                    <p className="text-primary/60 dark:text-white/60 text-sm">
                        Créez un nouveau mot de passe sécurisé pour votre compte.
                    </p>
                </div>

                <Suspense fallback={
                    <div className="flex justify-center p-8">
                        <div className="h-8 w-8 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}

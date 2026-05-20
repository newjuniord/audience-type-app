"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

function MagicLoginHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState("Vérification de votre accès...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleLogin = async () => {
            if (!token) {
                setError("Token d'accès magique manquant");
                return;
            }

            try {
                // 1. Appeler l'API de vérification
                const res = await fetch(`/api/auth/magic-link/verify?token=${token}`);
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Erreur de connexion magique");
                }

                const { customToken } = await res.json();

                // 2. Se connecter avec le Custom Token
                await signInWithCustomToken(auth, customToken);

                // 3. Rediriger vers le dashboard
                setStatus("Connexion réussie ! Chargement de votre espace...");
                setTimeout(() => {
                    router.push("/dashboard");
                }, 1000);

            } catch (err: any) {
                console.error("Magic Login Error:", err);
                setError(err.message || "Une erreur est survenue lors de la connexion via le lien magique.");
            }
        };

        handleLogin();
    }, [token, router]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button 
                        onClick={() => router.push("/login")}
                        className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        Retour à la connexion
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès Direct</h1>
                <p className="text-gray-500">{status}</p>
            </div>
        </div>
    );
}

export default function MagicLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
            <MagicLoginHandler />
        </Suspense>
    );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";

function TempLoginHandler() {
    const router = useRouter();
    const [status, setStatus] = useState("Vérification en cours...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setError("Les liens de connexion directe sont obsolètes. Veuillez utiliser le code à 4 chiffres reçu par SMS ou Email pour vous connecter.");
        setTimeout(() => {
            router.push("/login");
        }, 4000);
    }, [router]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur d'accès</h1>
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
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Connexion Temporaire</h1>
                <p className="text-gray-500">{status}</p>
            </div>
        </div>
    );
}

export default function TempLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
            <TempLoginHandler />
        </Suspense>
    );
}

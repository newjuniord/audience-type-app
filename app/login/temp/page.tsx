"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

function TempLoginHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("Vérification du lien...");
    const [error, setError] = useState<string | null>(null);
    const attemptRef = useRef(false);

    useEffect(() => {
        const token = searchParams.get("token");
        
        if (!token) {
            setError("Lien invalide ou expiré.");
            return;
        }

        if (attemptRef.current) return;
        attemptRef.current = true;

        const verifyToken = async () => {
            try {
                const res = await fetch("/api/auth/temp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Erreur lors de la vérification du lien.");
                }

                setStatus("Connexion réussie ! Redirection...");
                await signInWithCustomToken(auth, data.customToken);
                
                // Redirection
                router.push("/dashboard");

            } catch (err: any) {
                console.error("Temp login error:", err);
                setError(err.message || "Impossible de se connecter.");
            }
        };

        verifyToken();
    }, [router, searchParams]);

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
                        Aller à la connexion classique
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Connexion Rapide</h1>
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

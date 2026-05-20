"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

function TrustedLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function doAutoLogin() {
            const token = searchParams.get("token");
            const redirectTo = searchParams.get("redirectTo") || "/dashboard";

            if (!token) {
                router.push("/login");
                return;
            }

            try {
                // Sign in with Firebase Custom Token
                await signInWithCustomToken(auth, token);
                
                // Set lightweight logged_in cookie
                document.cookie = "logged_in=true; path=/; max-age=315360000; SameSite=Strict; Secure";
                
                router.push(redirectTo);
            } catch (err: any) {
                console.error("Auto-login failed:", err);
                setError("Échec de la connexion automatique.");
                setTimeout(() => router.push("/login"), 2000);
            }
        }

        doAutoLogin();
    }, [router, searchParams]);

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-primary">Connexion Automatique...</h1>
            {error ? (
                <p className="text-sm text-red-500 font-bold">{error}</p>
            ) : (
                <p className="text-sm text-white/40">Vérification de l'appareil sécurisé en cours</p>
            )}
        </div>
    );
}

export default function TrustedLoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white font-display">
            <Suspense fallback={
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <h1 className="text-xl font-bold uppercase tracking-widest text-primary">Chargement...</h1>
                </div>
            }>
                <TrustedLoginContent />
            </Suspense>
        </div>
    );
}

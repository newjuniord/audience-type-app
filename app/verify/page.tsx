"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyMagicLinkAction } from "@/app/actions/auth";

// ─── Composant interne qui utilise useSearchParams ────────────────────────────
function VerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("N ap verifye lyen majik la...");

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus("error");
                setMessage("Lyen koneksyon an pa valab oswa li manke.");
                return;
            }

            try {
                const result = await verifyMagicLinkAction(token);
                if (result.error) {
                    setStatus("error");
                    setMessage(result.error);
                } else {
                    setStatus("success");
                    setMessage("Koneksyon an reyalize avèk siksè! Ou ka fèmen paj sa a epi tounen sou òdinatè w.");
                }
            } catch (err: any) {
                setStatus("error");
                setMessage("Gen yon erè ki fèt pandan n ap verifye.");
            }
        };

        verify();
    }, [token]);

    return (
        <div className="max-w-md w-full bg-white/5 border border-white/10 p-8 rounded-3xl text-center space-y-6 shadow-2xl backdrop-blur-xl">
            {/* Icône animée selon le statut */}
            <div className="flex justify-center">
                {status === "loading" && (
                    <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                    </div>
                )}
                {status === "success" && (
                    <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center animate-bounce-once">
                        <span className="text-4xl">✅</span>
                    </div>
                )}
                {status === "error" && (
                    <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <span className="text-4xl">❌</span>
                    </div>
                )}
            </div>

            {/* Logo */}
            <div className="text-xs font-black text-white/20 uppercase tracking-[0.3em]">DJR Akademi</div>

            {/* Titre */}
            <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                    {status === "loading" && "Koneksyon ap fèt..."}
                    {status === "success" && "🎉 Ou konekte!"}
                    {status === "error" && "Koneksyon an echwe"}
                </h1>
                <p className="text-white/50 text-sm font-medium leading-relaxed">
                    {message}
                </p>
            </div>

            {/* Actions */}
            {status === "success" && (
                <div className="pt-2 space-y-3">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                        <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">✨ Maji a mache</p>
                        <p className="text-white/50 text-xs leading-relaxed">
                            Òdinatè w la sot konekte otomatikman.<br/>
                            Ou ka fèmen paj sa a pou w ka kontinye.
                        </p>
                    </div>
                    <button
                        onClick={() => window.close()}
                        className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all uppercase tracking-widest text-xs"
                    >
                        Fèmen paj sa a
                    </button>
                </div>
            )}
            {status === "error" && (
                <div className="pt-2">
                    <a
                        href="/"
                        className="inline-flex items-center justify-center w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white font-bold rounded-xl transition-all uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20"
                    >
                        Tounen sou paj prensipal la
                    </a>
                </div>
            )}
        </div>
    );
}

// ─── Fallback pendant le chargement de Suspense ───────────────────────────────
function LoadingFallback() {
    return (
        <div className="max-w-md w-full bg-white/5 border border-white/10 p-8 rounded-3xl text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto">
                <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
            <p className="text-white/40 text-sm">N ap chaje...</p>
        </div>
    );
}

// ─── Page principale (enveloppe Suspense OBLIGATOIRE pour useSearchParams) ────
export default function VerifyMagicLinkPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <Suspense fallback={<LoadingFallback />}>
                <VerifyContent />
            </Suspense>
        </div>
    );
}

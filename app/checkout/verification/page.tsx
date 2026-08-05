"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("N ap verifye peman w lan...");

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                const provider = searchParams.get("provider") || "plopplop";
                
                // Essayer de trouver la référence dans l'URL ou dans le localStorage
                let reference_id = searchParams.get("refference_id") || searchParams.get("reference_id") || searchParams.get("order_id");
                
                if (!reference_id) {
                    reference_id = localStorage.getItem(`pending_${provider}_order`);
                }
                
                // Fallback de sécurité
                if (!reference_id) {
                    reference_id = localStorage.getItem("pending_plopplop_order");
                }

                if (!reference_id) {
                    setStatus("error");
                    setMessage("Nou pa ka jwenn referans peman an.");
                    return;
                }

                const endpoint = provider === "lemon-squeezy" 
                    ? '/api/payment/lemon-squeezy/verify-order'
                    : '/api/payment/plopplop/verify-order';

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reference_id })
                });

                const data = await response.json();

                if (response.ok && data.status === 'paid') {
                    // Confirmer le rendez-vous côté client : les règles Firestore exigent
                    // un utilisateur authentifié, ce que le serveur de paiement n'est pas.
                    const bookingId = data.bookingId
                        || localStorage.getItem(`pending_${provider}_booking`)
                        || localStorage.getItem("pending_booking");

                    if (bookingId) {
                        try {
                            const { confirmBookingPayment } = await import("@/lib/booking-applications");
                            await confirmBookingPayment(bookingId, data.orderId || reference_id);
                            localStorage.removeItem(`pending_${provider}_booking`);
                            localStorage.removeItem("pending_booking");
                        } catch (bookingError) {
                            // Le paiement reste valide : on ne bloque pas l'utilisateur,
                            // l'admin voit la commande payée et peut confirmer à la main.
                            console.error("Rendez-vous non confirmé automatiquement:", bookingError);
                        }
                    }

                    setStatus("success");
                    setMessage("Peman ou an konfime ! Mèsi 🎉");
                    localStorage.removeItem(`pending_${provider}_order`);
                    localStorage.removeItem("pending_plopplop_order");

                    // Rediriger vers le dashboard après 3 secondes
                    setTimeout(() => {
                        router.push('/dashboard?payment=success');
                    }, 3000);
                } else {
                    setStatus("error");
                    setMessage(data.error || "Peman an poko konfime oswa li echwe.");
                }

            } catch (error) {
                console.error("Erreur de vérification:", error);
                setStatus("error");
                setMessage("Gen yon erè ki fèt pandan n ap verifye peman an.");
            }
        };

        verifyPayment();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center">
                
                {status === "loading" && (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <h2 className="text-xl font-bold text-white mb-2">Verifikasyon...</h2>
                        <p className="text-white/60 text-sm">{message}</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Peman Konfime !</h2>
                        <p className="text-white/60 mb-6">{message}</p>
                        <p className="text-xs text-white/40 mb-6">Ou pral redireje nan tablodbò a nan kèk segond...</p>
                        <Link href="/dashboard" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors">
                            Ale nan tablodbò m
                        </Link>
                    </div>
                )}

                {status === "error" && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Pwoblèm Peman</h2>
                        <p className="text-white/60 mb-6">{message}</p>
                        <Link href="/dashboard" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors">
                            Retounen
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
}

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>}>
            <CallbackContent />
        </Suspense>
    );
}

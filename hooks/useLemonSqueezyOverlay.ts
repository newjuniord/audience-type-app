"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface OverlayOptions {
    checkoutUrl: string;
    orderId: string;
}

interface UseLemonSqueezyOverlayReturn {
    openCheckout: (checkoutUrl: string, orderId: string, expiresAtMs?: number) => Promise<void>;
    closeCheckout: () => void;
    isVerifying: boolean;
    hasExpiredSession: boolean;
}

export function useLemonSqueezyOverlay(): UseLemonSqueezyOverlayReturn {
    const [isVerifying, setIsVerifying] = useState(false);
    const [hasExpiredSession, setHasExpiredSession] = useState(false);
    const router = useRouter();

    const verifyAndRedirect = useCallback(async (orderId: string) => {
        setIsVerifying(true);
        try {
            // Attendre 2s pour laisser le temps au webhook en arrière-plan d'arriver
            await new Promise((resolve) => setTimeout(resolve, 2000));
            router.push(`/dashboard?payment=success`);
        } catch (err) {
            console.error("[Overlay] Error during post-payment redirect:", err);
            router.push(`/dashboard?payment=success`);
        } finally {
            setIsVerifying(false);
        }
    }, [router]);

    const openCheckout = useCallback(async ({ checkoutUrl, orderId }: OverlayOptions) => {
        const LS = (window as any).LemonSqueezy;

        // Fallback si le script Lemon Squeezy n'est pas chargé (rare)
        if (!LS || typeof LS.Url?.Open !== "function") {
            console.warn("[Overlay] LemonSqueezy overlay not available — using redirect fallback");
            window.location.href = checkoutUrl;
            return;
        }

        // Initialiser l'overlay avec le callback de fermeture
        LS.Setup({
            eventHandler: async (event: { event: string }) => {
                if (
                    event.event === "Checkout.Success" ||
                    event.event === "PaymentMethodUpdate.Mounted"
                ) {
                    // Paiement confirmé côté overlay
                    console.log("[Overlay] Payment confirmed:", event.event);
                }

                if (
                    event.event === "Checkout.Success" ||
                    event.event === "PopupClosed"
                ) {
                    // Overlay fermé (après succès ou annulation)
                    if (event.event === "Checkout.Success") {
                        await verifyAndRedirect(orderId);
                    }
                }
            },
        });

        // Ouvrir l'overlay
        LS.Url.Open(checkoutUrl);
    }, [verifyAndRedirect]);

    const closeCheckout = useCallback(() => {
        const LS = (window as any).LemonSqueezy;
        if (LS && typeof LS.Url?.Close === "function") {
            LS.Url.Close();
        }
    }, []);

    // Surcharge pour signature simple (checkoutUrl, orderId)
    const openCheckoutSimple = useCallback(
        async (checkoutUrl: string, orderId: string, expiresAtMs?: number) => {
            setHasExpiredSession(false); // Réinitialiser l'état d'expiration
            await openCheckout({ checkoutUrl, orderId });
            
            if (expiresAtMs) {
                // Affiche le popup et ferme l'overlay 1 minute (60 000 ms) après l'expiration
                const msLeft = (expiresAtMs + 60000) - Date.now();
                if (msLeft > 0) {
                    setTimeout(() => {
                        closeCheckout();
                        setHasExpiredSession(true);
                    }, msLeft);
                } else {
                    closeCheckout();
                    setHasExpiredSession(true);
                }
            }
        },
        [openCheckout, closeCheckout]
    );

    return { openCheckout: openCheckoutSimple, closeCheckout, isVerifying, hasExpiredSession };
}

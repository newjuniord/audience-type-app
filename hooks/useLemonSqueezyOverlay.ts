"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface OverlayOptions {
    checkoutUrl: string;
    orderId: string;
}

interface UseLemonSqueezyOverlayReturn {
    openCheckout: (checkoutUrl: string, orderId: string) => Promise<void>;
    isVerifying: boolean;
}

export function useLemonSqueezyOverlay(): UseLemonSqueezyOverlayReturn {
    const [isVerifying, setIsVerifying] = useState(false);
    const router = useRouter();

    const verifyAndRedirect = useCallback(async (orderId: string) => {
        setIsVerifying(true);
        try {
            // Attendre 2s pour laisser le webhook Firestore traiter le paiement
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const res = await fetch("/api/lemonsqueezy/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
            });

            if (!res.ok) {
                console.warn("[Overlay] Verify failed, redirecting to payment-success anyway");
                router.push(`/payment-success?orderId=${orderId}&provider=lemonsqueezy`);
                return;
            }

            const data = await res.json();

            if (data.status === "paid") {
                const amount = data.order?.amount || "";
                const currency = data.order?.currency?.toUpperCase() || "USD";
                router.push(
                    `/payment-success?orderId=${orderId}&amount=${amount}&currency=${currency}&provider=lemonsqueezy`
                );
            } else {
                // Paiement pas encore confirmé — redirection vers payment-success qui re-vérifie
                router.push(`/payment-success?orderId=${orderId}&provider=lemonsqueezy`);
            }
        } catch (err) {
            console.error("[Overlay] Error during post-payment verification:", err);
            // Fallback sécurisé
            router.push(`/payment-success?orderId=${orderId}&provider=lemonsqueezy`);
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

    // Surcharge pour signature simple (checkoutUrl, orderId)
    const openCheckoutSimple = useCallback(
        (checkoutUrl: string, orderId: string) =>
            openCheckout({ checkoutUrl, orderId }),
        [openCheckout]
    );

    return { openCheckout: openCheckoutSimple, isVerifying };
}

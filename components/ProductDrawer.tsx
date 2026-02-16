import { useEffect, useState } from "react";
import BubbleButton from "./BubbleButton";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, Timestamp } from "firebase/firestore";
import { createOrder } from "@/lib/orders";
import { createEnrollment } from "@/lib/enrollments";
import { createBookingApplication } from "@/lib/booking-applications";
import ConfirmModal from "./ui/ConfirmModal";
import SuccessModal from "./ui/SuccessModal";

export interface Product {
    id?: string;
    title: string;
    price: string;
    type: string;
    image: string;
    description: string;
    features?: string[];
    isOwned?: boolean;
}

interface ProductDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

export default function ProductDrawer({ isOpen, onClose, product }: ProductDrawerProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);

    // Application State
    const [applicationMessage, setApplicationMessage] = useState("");
    const [userPhone, setUserPhone] = useState("");
    const [isApplying, setIsApplying] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const isService = product?.type === "Service" || product?.type === "Booking";

    // Handle mounting animation
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Match transition duration
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handlePurchase = async () => {
        if (!user) {
            router.push("/login");
            return;
        }

        if (!product) return;

        setIsPurchasing(true);
        try {
            // Call our API to create a Dodo Payment Link
            const response = await fetch("/api/dodo/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    productId: product.id,
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.displayName || "Client", // Fallback name
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create checkout session");
            }

            if (data.checkoutUrl) {
                // Redirect user to Dodo Payments
                window.location.href = data.checkoutUrl;
            } else {
                throw new Error("No checkout URL returned");
            }

        } catch (error: any) {
            console.error("Purchase failed", error);
            alert(`Une erreur est survenue lors de l'initialisation du paiement: ${error.message || "Erreur inconnue"}`);
        } finally {
            setIsPurchasing(false);
        }
    };

    const handleApplicationSubmit = async () => {
        if (!user) {
            router.push("/login");
            return;
        }
        if (!product || !product.id) return;

        setIsApplying(true);
        try {
            await createBookingApplication({
                bookingsId: doc(db, "services", product.id), // Or "products" depending on where services are stored
                createdAt: Timestamp.now(),
                message: applicationMessage,
                serviceName: product.title,
                title: product.title, // Add title as requested
                status: "pending", // Default to pending
                userName: user.displayName || "Utilisateur",
                userPhone: userPhone,
                usersId: doc(db, "users", user.uid)
            });

            // Show success modal instead of alert
            setShowSuccessModal(true);
            setApplicationMessage("");
            setUserPhone("");
            // onClose(); // Let modal handle closing
        } catch (error: any) {
            console.error("Application failed", error);
            alert(`Erreur lors de l'envoi de la candidature: ${error.message || "Erreur inconnue"}`);
        } finally {
            setIsApplying(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        onClose();
    };

    if (!product && !isVisible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-[#111] shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {product && (
                    <div className="h-full flex flex-col overflow-y-auto">
                        {/* Header / Close */}
                        <div className="flex items-center justify-between p-6 border-b border-primary/5 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="bg-primary/5 dark:bg-white/5 text-primary dark:text-white text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-sm">
                                    {product.type}
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-primary/5 dark:hover:bg-white/5 rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 flex flex-col gap-8">
                            <div>
                                <h2 className="text-3xl font-black leading-tight mb-2">{product.title}</h2>
                                <p className="text-2xl font-normal text-primary/60 dark:text-white/60">{product.price}</p>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-white/40 mb-4">Description</h3>
                                <p className="text-primary/80 dark:text-white/80 leading-relaxed">
                                    {product.description}
                                </p>
                            </div>

                            {product.features && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-white/40 mb-4">Ce qui est inclus</h3>
                                    <ul className="flex flex-col gap-3">
                                        {product.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm">
                                                <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Service Application Form */}
                            {isService && (
                                <div className="mt-4 p-6 bg-primary/5 dark:bg-white/5 rounded-xl border border-primary/5 dark:border-white/5">
                                    <h3 className="text-lg font-bold mb-4">Postuler pour ce service</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest mb-1 opacity-60">Votre Message</label>
                                            <textarea
                                                value={applicationMessage}
                                                onChange={(e) => setApplicationMessage(e.target.value)}
                                                className="w-full bg-white dark:bg-black/20 border border-primary/10 dark:border-white/10 rounded-lg p-3 text-sm min-h-[80px]"
                                                placeholder="Expliquez vos besoins..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest mb-1 opacity-60">Téléphone (WhatsApp)</label>
                                            <input
                                                type="text"
                                                value={userPhone}
                                                onChange={(e) => setUserPhone(e.target.value)}
                                                className="w-full bg-white dark:bg-black/20 border border-primary/10 dark:border-white/10 rounded-lg p-3 text-sm"
                                                placeholder="+33 6 12 34 56 78"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="mt-auto p-8 border-t border-primary/5 dark:border-white/5 bg-primary/2 dark:bg-white/2">
                            {isService ? (
                                <BubbleButton
                                    variant="rounded"
                                    disabled={isApplying || !applicationMessage || !userPhone}
                                    onClick={handleApplicationSubmit}
                                >
                                    {isApplying ? "Envoi en cours..." : "Envoyer ma candidature"}
                                </BubbleButton>
                            ) : (
                                <BubbleButton
                                    variant="rounded"
                                    disabled={product.isOwned}
                                    onClick={() => {
                                        if (product.isOwned) return;
                                        setIsPurchaseModalOpen(true);
                                    }}
                                >
                                    {product.isOwned ? "Déjà possédé" : "Acheter maintenant"}
                                </BubbleButton>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={isPurchaseModalOpen}
                onClose={() => setIsPurchaseModalOpen(false)}
                onConfirm={handlePurchase}
                title="Confirmer l'achat"
                message={`Voulez-vous vraiment acheter "${product?.title}" pour ${product?.price} ? (Ceci est une simulation)`}
                confirmText="Confirmer l'achat"
                isLoading={isPurchasing}
            />

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessClose}
                message="Votre candidature a été envoyée avec succès !"
            />
        </>
    );
}

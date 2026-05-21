"use client";

import { useState, useEffect } from "react";
import ConfirmModal from "./ui/ConfirmModal";
import LoginModal from "./LoginModal";
import { Product } from "@/types/product";
import BubbleButton from "./BubbleButton";
import { useAuth } from "@/context/AuthContext";
import { getEnrollmentsByUser } from "@/lib/enrollments";
import { doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/orders";

export default function FeaturedProducts({
    title = "Produits en vedette",
    showBorder = true,
    initialProducts = []
}: {
    title?: string,
    showBorder?: boolean,
    initialProducts?: Product[]
}) {
    const { user } = useAuth();
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeFilter, setActiveFilter] = useState("All");
    const [visibleCount, setVisibleCount] = useState(9);
    const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());

    // Modal States
    const [isWhatsAppLoginOpen, setIsWhatsAppLoginOpen] = useState(false);
    const [isPaymentSelectorOpen, setIsPaymentSelectorOpen] = useState(false);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'moncash' | 'lemonsqueezy'>('lemonsqueezy');
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        async function syncOwnedStatus() {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const userRef = doc(db, "users", user.uid);
                const enrollments = await getEnrollmentsByUser(userRef);
                const ownedIds = new Set<string>();
                
                enrollments.forEach(enrollment => {
                    if (enrollment.productId) {
                        const pid = typeof enrollment.productId === 'string' ? enrollment.productId : enrollment.productId.id;
                        if (pid) ownedIds.add(pid);
                    }
                });

                setOwnedProductIds(ownedIds);
                
                setProducts(prev => prev.map(p => ({
                    ...p,
                    isOwned: p.id ? ownedIds.has(p.id) : false
                })));
            } catch (error) {
                console.error("Failed to sync owned status", error);
            } finally {
                setLoading(false);
            }
        }

        if (initialProducts.length > 0) {
            syncOwnedStatus();
        }
    }, [user, initialProducts.length]);

    const handleProductClick = (product: Product) => {
        if (product.type === "Service") {
            router.push('/consultation');
            return;
        }

        if (product.isOwned) {
            router.push('/dashboard');
            return;
        }

        setSelectedProduct(product);

        if (!user) {
            setIsWhatsAppLoginOpen(true);
        } else {
            setIsPaymentSelectorOpen(true);
        }
    };

    const handleWhatsAppLoginSuccess = () => {
        // User is now logged in. Open payment selector directly.
        setIsPaymentSelectorOpen(true);
    };

    const getGourdesPrice = () => {
        return selectedProduct?.priceHTG || 0;
    };

    const handlePaymentMethodSelect = (method: 'moncash' | 'lemonsqueezy') => {
        setIsPaymentSelectorOpen(false);
        setTimeout(() => {
            setSelectedPaymentMethod(method);
            setIsPurchaseModalOpen(true);
        }, 200);
    };

    const handlePurchase = async () => {
        if (!user || !selectedProduct) return;

        setIsPurchasing(true);
        try {
            if (selectedPaymentMethod === 'moncash') {
                let collectionName = "courses";
                if (selectedProduct.type.toLowerCase() === "ebook") collectionName = "ebooks";
                else if (selectedProduct.type.toLowerCase() === "service" || selectedProduct.type.toLowerCase() === "booking") collectionName = "services";

                const priceInGourdes = getGourdesPrice();
                const orderData = {
                    userId: user.uid,
                    userEmail: user.email || `${user.uid}@audiencetype.com`,
                    productId: doc(db, collectionName, selectedProduct.id!),
                    productThumbnailUrl: selectedProduct.image,
                    productTitle: selectedProduct.title,
                    productType: selectedProduct.type.toLowerCase(),
                    transactionId: "",
                    amount: priceInGourdes,
                    currency: "HTG",
                    status: "pending",
                    paymentMethod: "moncash",
                    createdAt: Timestamp.now()
                };

                const orderId = await createOrder(orderData);

                const response = await fetch("/api/bazik/payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId,
                        amount: priceInGourdes,
                        description: selectedProduct.title,
                        customerFirstName: user.displayName || "Client",
                        userId: user.uid,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to initialize Moncash payment");
                }

                const redirectUrl = data.redirectUrl || data.redirect_url || data.payment_link;

                if (redirectUrl) {
                    window.location.href = redirectUrl;
                } else if (data.payment_token?.redirect_url) {
                    window.location.href = data.payment_token.redirect_url;
                } else {
                    throw new Error("No redirect URL returned from payment provider");
                }

            } else if (selectedPaymentMethod === 'lemonsqueezy') {
                const response = await fetch("/api/lemonsqueezy/checkout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        productId: selectedProduct.id,
                        userId: user.uid,
                        userEmail: user.email || `${user.uid}@audiencetype.com`,
                        userName: user.displayName || "Client"
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to create checkout session");
                }

                if (data.checkoutUrl) {
                    window.location.href = data.checkoutUrl;
                } else {
                    throw new Error("No checkout URL returned");
                }
            }

        } catch (error: any) {
            console.error("Purchase failed", error);
            alert(`Une erreur est survenue lors de l'initialisation du paiement: ${error.message || "Erreur inconnue"}`);
        } finally {
            setIsPurchasing(false);
        }
    };

    const displayCategories = [
        { id: "All", label: "Tout" },
        { id: "Course", label: "Cours" },
        { id: "Ebook", label: "Ebooks" }
    ];

    const mainProducts = products.filter(p => p.type !== "Service");
    const consultationProduct = products.find(p => p.type === "Service");

    const filteredProducts = activeFilter === "All"
        ? mainProducts
        : mainProducts.filter(p => p.type === activeFilter);

    const visibleProducts = filteredProducts.slice(0, visibleCount);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 9);
    };

    if (loading) return null;

    return (
        <section className={`w-full max-w-[1200px] px-6 pb-20 pt-8 ${showBorder ? 'border-t border-white/5' : ''}`}>
            {mainProducts.length > 0 && (
                <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-white"><span>{title}</span></h2>
                        <div className="flex flex-row gap-8">
                            {displayCategories.map(cat => {
                                const isAll = cat.id === "All";
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setActiveFilter(cat.id);
                                            setVisibleCount(9);
                                        }}
                                        className={`text-xs font-bold uppercase tracking-widest transition-all pb-1 border-b-2 w-fit ${isAll ? "block" : "hidden md:block"} ${activeFilter === cat.id
                                                ? "border-primary opacity-100"
                                                : "border-transparent opacity-40 hover:opacity-100"
                                            }`}
                                    >
                                        <span>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
                        {visibleProducts.map((product, index) => (
                            <div key={index} className="group flex flex-col bg-white/[0.03] overflow-hidden border border-white/10 hover:border-primary/50 hover:bg-white/[0.06] transition-all duration-300 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="aspect-[4/3] overflow-hidden relative">
                                    <img alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={product.image} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                    <div className="absolute top-3 left-3 z-10">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border ${
                                            product.type === "Course"
                                                ? "bg-primary/90 text-white border-primary/20"
                                                : "bg-secondary/90 text-white border-secondary/20"
                                        } shadow-xl backdrop-blur-sm`}>
                                            {product.type === "Course" ? "Kou" : "Ebook"}
                                        </span>
                                    </div>
                                    {product.isOwned && (
                                        <div className="absolute top-3 right-3 z-10">
                                            <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-green-500/80 text-white border border-green-400/20 backdrop-blur-sm">
                                                Possédé
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 flex flex-col flex-grow">
                                    <div className="flex justify-between items-start mb-2 gap-3">
                                        <h3 className="text-base font-black leading-tight text-white"><span>{product.title}</span></h3>
                                        <span className="text-primary font-bold text-sm shrink-0"><span>{product.price}</span></span>
                                    </div>
                                    <p className="text-xs text-white/50 mb-6 line-clamp-2 leading-relaxed"><span>{product.description}</span></p>
                                    <div className="mt-auto">
                                        <BubbleButton
                                            onClick={() => handleProductClick(product)}
                                        >
                                            <span>
                                                {product.isOwned ? "Accéder" : "Acheter"}
                                            </span>
                                        </BubbleButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full flex items-center justify-center py-20">
                                <p className="text-white/30 uppercase font-bold tracking-widest"><span>Aucun produit trouvé dans cette catégorie</span></p>
                            </div>
                        )}
                    </div>
                    {visibleCount < filteredProducts.length && (
                        <div className="mt-12 flex justify-center">
                            <button
                                onClick={handleLoadMore}
                                className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest border border-white/20 px-10 py-4 rounded-full hover:border-primary/60 hover:bg-primary/10 hover:text-white transition-all text-white/60"
                            >
                                <span>Voir plus</span>
                                <span className="material-symbols-outlined text-sm notranslate transition-transform group-hover:translate-x-1" translate="no">trending_flat</span>
                            </button>
                        </div>
                    )}
                </>
            )}

            {consultationProduct && mainProducts.length > 0 && (
                <div className="w-full h-px bg-primary/10 dark:bg-white/10 my-20"></div>
            )}

            {consultationProduct && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-white">
                        <span>Konsiltasyon Prive</span>
                    </h2>
                    <div className="flex flex-col lg:flex-row bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-primary/40 hover:bg-white/[0.05] transition-all duration-300">
                        <div className="w-full lg:w-[45%] aspect-[16/10] lg:aspect-auto min-h-[300px] relative bg-primary/5 dark:bg-white/5 overflow-hidden">
                            <img 
                                src={consultationProduct.image} 
                                alt={consultationProduct.title} 
                                className="absolute inset-0 w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500 hover:scale-105" 
                            />
                            <div className="absolute top-6 left-6 z-10">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 bg-emerald-600 text-white border border-emerald-400/20 rounded-full shadow-2xl">
                                    Session 1-sur-1 en Direct
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 p-8 md:p-12 flex flex-col justify-between">
                            <div>
                                <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
                                    <h3 className="text-3xl font-black tracking-tight text-white">
                                        <span>{consultationProduct.title}</span>
                                    </h3>
                                    <span className="text-2xl font-extrabold text-primary">
                                        <span>{consultationProduct.price}</span>
                                    </span>
                                </div>
                                <p className="text-base text-white/60 mb-8 max-w-2xl leading-relaxed">
                                    <span>{consultationProduct.description}</span>
                                </p>

                                {consultationProduct.features && consultationProduct.features.length > 0 && (
                                    <div className="mb-10">
                                        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Sa ki enkli :</p>
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {consultationProduct.features.map((feature, fIdx) => (
                                                <li key={fIdx} className="flex items-center gap-3 text-sm text-white/70">
                                                    <span className="material-symbols-outlined text-primary text-lg notranslate" translate="no">check_circle</span>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="w-full sm:w-fit mt-4">
                                <BubbleButton
                                    onClick={() => handleProductClick(consultationProduct)}
                                    className="px-12 py-5 text-base font-bold tracking-wider"
                                >
                                    <span>
                                        {consultationProduct.isOwned ? "Déjà réservé (Accéder)" : "Réserver ma séance"}
                                    </span>
                                </BubbleButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Login Modal */}
            <LoginModal
                isOpen={isWhatsAppLoginOpen}
                onClose={() => setIsWhatsAppLoginOpen(false)}
                onSuccess={handleWhatsAppLoginSuccess}
                productName={selectedProduct?.title || ""}
            />

            {/* Payment Method Selector Modal */}
            <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 transition-all duration-300 ${isPaymentSelectorOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div
                    className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsPaymentSelectorOpen(false)}
                />

                <div className={`bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-sm relative overflow-hidden transform transition-all duration-300 ${isPaymentSelectorOpen ? 'scale-100' : 'scale-95'}`}>
                    <div className="p-8">
                        <h3 className="text-xl font-black text-center mb-6">Choisir le mode de paiement</h3>
                        <div className="space-y-4">
                            <button
                                onClick={() => handlePaymentMethodSelect('lemonsqueezy')}
                                className="w-full h-14 rounded-2xl bg-primary text-white font-bold flex items-center justify-between px-6 hover:opacity-90 transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined">payments</span>
                                    <span>Payer par Carte ou PayPal</span>
                                </div>
                                <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                            </button>

                            <div className="flex items-center gap-4 text-xs font-bold text-primary/10 dark:text-white/10 uppercase tracking-widest text-center py-2">
                                <div className="h-px bg-primary/10 dark:bg-white/10 flex-1"></div>
                                <span>ou</span>
                                <div className="h-px bg-primary/10 dark:bg-white/10 flex-1"></div>
                            </div>

                            <button
                                onClick={() => handlePaymentMethodSelect('moncash')}
                                disabled={!selectedProduct?.priceHTG || selectedProduct.priceHTG <= 0}
                                className="w-full h-14 rounded-2xl bg-red-600/10 text-red-600 border border-red-600/20 font-bold flex items-center justify-between px-6 hover:bg-red-600/20 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-3">
                                    <img src="/images/moncash-logo.png" alt="Moncash" className="h-6 w-6 object-contain" />
                                    <span>Payer avec Moncash</span>
                                </div>
                                <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setIsPaymentSelectorOpen(false)}
                            className="w-full mt-6 text-sm font-bold opacity-40 hover:opacity-100 transition-opacity"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isPurchaseModalOpen}
                onClose={() => setIsPurchaseModalOpen(false)}
                onConfirm={handlePurchase}
                title="Confirmer l'achat"
                image={selectedPaymentMethod === 'moncash' ? "/images/moncash-logo.png" : undefined}
                message={
                    selectedPaymentMethod === 'moncash'
                        ? `Vous êtes sur le point de débloquer "${selectedProduct?.title}". Confirmez votre paiement de ${getGourdesPrice()} gourdes via MonCash pour commencer l'aventure !`
                        : `Prêt à commencer ? Confirmez l'acquisition de "${selectedProduct?.title}" pour ${selectedProduct?.price} et accédez à votre contenu instantanément.`
                }
                confirmText={selectedPaymentMethod === 'moncash' ? "Payer avec Moncash" : "Confirmer l'achat"}
                isLoading={isPurchasing}
                showIcon={false}
                showReferenceInput={false}
            />
        </section>
    );
}

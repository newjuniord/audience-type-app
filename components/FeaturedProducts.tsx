"use client";

import { useState, useEffect } from "react";
import ProductDrawer from "./ProductDrawer";
import InvitationCodeModal from "./InvitationCodeModal";
import { Product } from "@/types/product";
import BubbleButton from "./BubbleButton";
import { getCourses } from "@/lib/courses";
import { getEbooks } from "@/lib/ebooks";
import { getServices } from "@/lib/services";
import { useAuth } from "@/context/AuthContext";
import { getEnrollmentsByUser } from "@/lib/enrollments";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

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
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState("All");
    const [visibleCount, setVisibleCount] = useState(9);
    const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
    const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
    const [invitationTarget, setInvitationTarget] = useState<Product | null>(null);

    useEffect(() => {
        async function syncOwnedStatus() {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // Fetch user enrollments ONLY to mark products as owned
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
                
                // Update the products list with owned status
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
    }, [user, initialProducts]);

    const handleProductClick = (product: Product) => {
        if (product.isOwned) {
            router.push('/dashboard');
            return;
        }

        if (product.isInvitationOnly && product.invitationCode) {
            setInvitationTarget(product);
            setIsInvitationModalOpen(true);
            return;
        }

        setSelectedProduct(product);
        setIsDrawerOpen(true);
    };

    const handleInvitationSuccess = () => {
        if (invitationTarget) {
            setSelectedProduct(invitationTarget);
            setIsDrawerOpen(true);
            setInvitationTarget(null);
        }
    };

    const displayCategories = [
        { id: "All", label: "Tout" },
        { id: "Course", label: "Cours" },
        { id: "Ebook", label: "Ebooks" },
        { id: "Service", label: "Consultations" }
    ];

    const filteredProducts = activeFilter === "All"
        ? products
        : products.filter(p => p.type === activeFilter);

    const visibleProducts = filteredProducts.slice(0, visibleCount);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 9);
    };

    if (loading) return null; // Or a skeleton

    return (
        <section className={`w-full max-w-[1200px] px-6 pb-20 pt-8 ${showBorder ? 'border-t border-primary/5 dark:border-white/5' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                <h2 className="text-2xl font-black uppercase tracking-tighter"><span>{title}</span></h2>
                <div className="flex flex-row gap-8">
                    {displayCategories.map(cat => {
                        const isAll = cat.id === "All";
                        return (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setActiveFilter(cat.id);
                                    setVisibleCount(9); // Reset pagination on filter change
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 min-h-[400px]">
                {visibleProducts.map((product, index) => (
                    <div key={index} className="group flex flex-col bg-white dark:bg-transparent overflow-hidden border border-primary/10 dark:border-white/10 hover:border-primary dark:hover:border-white transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="aspect-[4/3] bg-primary/5 dark:bg-white/5 overflow-hidden relative">
                            <img alt={product.title} className="w-full h-full object-cover grayscale transition-transform duration-500 group-hover:scale-105 group-hover:grayscale-0" src={product.image} />
                            <div className="absolute top-4 left-4 z-10">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 backdrop-blur-md rounded-full border ${
                                    product.type === "Course" 
                                        ? "bg-black/80 text-white border-white/20" 
                                        : product.type === "Ebook"
                                            ? "bg-blue-600/80 text-white border-blue-400/20"
                                            : "bg-emerald-600/80 text-white border-emerald-400/20"
                                } shadow-xl`}>
                                    {product.type === "Course" ? "Cours" : product.type === "Ebook" ? "Ebook" : "Consultation"}
                                </span>
                            </div>
                        </div>
                        <div className="p-6 flex flex-col flex-grow">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-black leading-tight"><span>{product.title}</span></h3>
                                <span className="text-lg font-bold"><span>{product.price}</span></span>
                            </div>
                            <p className="text-sm text-primary/60 dark:text-white/60 mb-8 line-clamp-2"><span>{product.description}</span></p>
                            <div className="mt-auto">
                                <BubbleButton
                                    onClick={() => handleProductClick(product)}
                                >
                                    <span>
                                        {product.isOwned
                                            ? "Possédé"
                                            : (product.type === "Service" ? "Réserver" : "Acheter")
                                        }
                                    </span>
                                </BubbleButton>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredProducts.length === 0 && (
                    <div className="col-span-full flex items-center justify-center py-20">
                        <p className="text-primary/40 uppercase font-bold tracking-widest"><span>Aucun produit trouvé dans cette catégorie</span></p>
                    </div>
                )}
            </div>
            {visibleCount < filteredProducts.length && (
                <div className="mt-16 flex justify-center">
                    <button
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest border border-primary/20 dark:border-white/20 px-10 py-4 hover:border-primary dark:hover:border-white transition-colors"
                    >
                        <span>Voir plus</span>
                        <span className="material-symbols-outlined text-sm notranslate" translate="no">trending_flat</span>
                    </button>
                </div>
            )}

            <ProductDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                product={selectedProduct}
            />

            {invitationTarget && (
                <InvitationCodeModal
                    isOpen={isInvitationModalOpen}
                    onClose={() => {
                        setIsInvitationModalOpen(false);
                        setInvitationTarget(null);
                    }}
                    correctCode={invitationTarget.invitationCode || ""}
                    onSuccess={handleInvitationSuccess}
                    productName={invitationTarget.title}
                />
            )}
        </section>
    );
}

"use client";

import { useState, useEffect } from "react";
import ProductDrawer, { Product } from "./ProductDrawer";
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
    const [visibleCount, setVisibleCount] = useState(6);
    const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchData() {
            try {
                const [courses, ebooks, services] = await Promise.all([
                    getCourses(),
                    getEbooks(),
                    getServices()
                ]);

                // Fetch user enrollments if logged in
                let ownedIds = new Set<string>();
                if (user) {
                    try {
                        const userRef = doc(db, "users", user.uid);
                        const enrollments = await getEnrollmentsByUser(userRef);
                        enrollments.forEach(enrollment => {
                            if (enrollment.productId) {
                                if (typeof enrollment.productId === 'string') {
                                    ownedIds.add(enrollment.productId);
                                } else if (enrollment.productId.id) {
                                    ownedIds.add(enrollment.productId.id);
                                }
                            }
                        });
                        setOwnedProductIds(ownedIds);
                    } catch (err) {
                        console.error("Error fetching enrollments", err);
                    }
                }

                const formattedCourses: Product[] = courses
                    .filter(c => c.statut === 'published')
                    .map(c => ({
                        id: c.id,
                        title: c.title,
                        price: `$${c.price}`, // Dynamic price from Firestore
                        type: "Course",
                        image: c.thumbnail || "https://images.unsplash.com/photo-1542744094-24638eff58bb?q=80&w=2071&auto=format&fit=crop",
                        description: c.description,
                        features: c.includedItems || [],
                        isOwned: c.id ? ownedIds.has(c.id) : false
                    }));

                const formattedEbooks: Product[] = ebooks
                    .filter(e => e.status === 'published')
                    .map(e => ({
                        id: e.id,
                        title: e.title,
                        price: `$${e.price}`, // Dynamic price from Firestore
                        type: "Ebook",
                        image: e.coverImage || "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=2074&auto=format&fit=crop",
                        description: e.description,
                        features: e.includedItems || [],
                        isOwned: e.id ? ownedIds.has(e.id) : false
                    }));

                const formattedServices: Product[] = services
                    .filter(s => s.status === 'published' || (s.status === undefined && s.active === true))
                    .map(s => ({
                        id: s.id,
                        title: s.title,
                        price: s.price.includes('$') || s.price.includes('€') ? s.price : `$${s.price}`, // Dynamic price
                        type: "Service",
                        image: s.imageUrl || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2074&auto=format&fit=crop",
                        description: s.description,
                        features: s.includedItems || [],
                        isOwned: false
                    }));

                const allProducts = [...formattedCourses, ...formattedEbooks, ...formattedServices];

                // If we have initial data, we try to preserve the order/mix if possible, 
                // but usually a fresh fetch is better for the full state.
                // We shuffle to keep the "featured" feel.
                const shuffled = allProducts.sort(() => 0.5 - Math.random());
                setProducts(shuffled);
            } catch (error) {
                console.error("Failed to fetch featured products", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user]);

    const handleProductClick = (product: Product) => {
        if (product.isOwned) {
            router.push('/dashboard');
            return;
        }
        setSelectedProduct(product);
        setIsDrawerOpen(true);
    };

    const displayCategories = [
        { id: "All", label: "Tout" },
        { id: "Course", label: "Cours" },
        { id: "Ebook", label: "Ebooks" },
        { id: "Service", label: "Services" }
    ];

    const filteredProducts = activeFilter === "All"
        ? products
        : products.filter(p => p.type === activeFilter);

    const visibleProducts = filteredProducts.slice(0, visibleCount);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 6);
    };

    if (loading) return null; // Or a skeleton

    return (
        <section className={`w-full max-w-[1200px] px-6 py-20 ${showBorder ? 'border-t border-primary/5 dark:border-white/5' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                <h2 className="text-2xl font-black uppercase tracking-tighter">{title}</h2>
                <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                    {displayCategories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveFilter(cat.id);
                                setVisibleCount(6); // Reset pagination on filter change
                            }}
                            className={`text-xs font-bold uppercase tracking-widest transition-all pb-1 border-b-2 w-fit ${activeFilter === cat.id
                                ? "border-primary opacity-100"
                                : "border-transparent opacity-40 hover:opacity-100"
                                }`}
                        >
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 min-h-[400px]">
                {visibleProducts.map((product, index) => (
                    <div key={index} className="group flex flex-col bg-white dark:bg-transparent overflow-hidden border border-primary/10 dark:border-white/10 hover:border-primary dark:hover:border-white transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="aspect-[4/3] bg-primary/5 dark:bg-white/5 overflow-hidden relative">
                            <img alt={product.title} className="w-full h-full object-cover grayscale transition-transform duration-500 group-hover:scale-105 group-hover:grayscale-0" src={product.image} />
                            <span>{product.type === "Course" ? "Cours" : product.type === "Ebook" ? "Ebook" : "Service"}</span>
                        </div>
                        <div className="p-6 flex flex-col flex-grow">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-black leading-tight">{product.title}</h3>
                                <span className="text-lg font-bold">{product.price}</span>
                            </div>
                            <p className="text-sm text-primary/60 dark:text-white/60 mb-8 line-clamp-2">{product.description}</p>
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
                        <p className="text-primary/40 uppercase font-bold tracking-widest">Aucun produit trouvé dans cette catégorie</p>
                    </div>
                )}
            </div>
            {visibleCount < filteredProducts.length && (
                <div className="mt-16 flex justify-center">
                    <button
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest border border-primary/20 dark:border-white/20 px-10 py-4 hover:border-primary dark:hover:border-white transition-colors"
                    >
                        Voir plus
                        <span className="material-symbols-outlined text-sm">trending_flat</span>
                    </button>
                </div>
            )}

            <ProductDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                product={selectedProduct}
            />
        </section>
    );
}

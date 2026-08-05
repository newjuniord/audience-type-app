"use client";

import { useState, useEffect } from "react";
import { Review } from "@/lib/types";
import { getReviewsByProduct } from "@/lib/reviews";
import ReviewModal from "@/components/buyer/ReviewModal";

interface ProductReviewsSectionProps {
    productId: string;
    productTitle: string;
}

export default function ProductReviewsSection({ productId, productTitle }: ProductReviewsSectionProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProductReviews() {
            try {
                const fetched = await getReviewsByProduct(productId);
                if (fetched && fetched.length > 0) {
                    setReviews(fetched);
                }
            } catch (err) {
                // keep default fallback reviews
            } finally {
                setLoading(false);
            }
        }
        loadProductReviews();
    }, [productId]);

    const averageRating = reviews.length > 0 
        ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
        : "5.0";

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        const stars = Math.round(r.rating || 5);
        if (stars >= 1 && stars <= 5) {
            ratingCounts[stars as keyof typeof ratingCounts]++;
        }
    });

    const getPercentage = (stars: keyof typeof ratingCounts) => {
        if (reviews.length === 0) return stars === 5 ? 100 : 0;
        return Math.round((ratingCounts[stars] / reviews.length) * 100);
    };

    return (
        <section className="w-full py-16 border-t border-white/10 mt-16">
            <div className="space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-xs font-black uppercase tracking-widest">
                            <span className="material-symbols-outlined text-sm">star</span>
                            <span>Avis & Eksperyans Achte yo</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
                            Sa Etidyan Yo Di
                        </h2>
                        <p className="text-white/50 text-sm max-w-md">
                            Temwayaj verifye moun ki achte epi aplike sa yo aprann nan pwodui sa a.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsReviewModalOpen(true)}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">rate_review</span>
                        <span>Ekri yon avis</span>
                    </button>
                </div>

                {/* Rating Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white/[0.02] border border-white/10 rounded-3xl p-8 items-center">
                    <div className="md:col-span-4 text-center md:border-r border-white/10 md:pr-8 space-y-2">
                        <div className="text-6xl font-black text-white tracking-tighter">
                            {averageRating}
                        </div>
                        <div className="flex justify-center text-yellow-400 gap-1 text-xl">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <span key={s} className="material-symbols-outlined fill-current">star</span>
                            ))}
                        </div>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
                            Baze sou {reviews.length} avis verifye
                        </p>
                    </div>

                    <div className="md:col-span-8 space-y-3">
                        {[
                            { stars: 5, pct: getPercentage(5) },
                            { stars: 4, pct: getPercentage(4) },
                            { stars: 3, pct: getPercentage(3) },
                            { stars: 2, pct: getPercentage(2) },
                            { stars: 1, pct: getPercentage(1) },
                        ].map((row) => (
                            <div key={row.stars} className="flex items-center gap-4 text-xs">
                                <span className="w-12 text-white/60 font-bold">{row.stars} zetwal</span>
                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
                                        style={{ width: `${row.pct}%` }}
                                    />
                                </div>
                                <span className="w-10 text-right text-white/40 font-mono">{row.pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reviews Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reviews.map((rev) => (
                        <div
                            key={rev.id}
                            className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4 hover:border-white/20 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {rev.userAvatar ? (
                                        <img src={rev.userAvatar} alt={rev.userName || "User"} className="size-10 rounded-full object-cover border border-primary/30" />
                                    ) : (
                                        <div className="size-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-sm">
                                            {rev.userName ? rev.userName.charAt(0).toUpperCase() : "A"}
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-white font-bold text-sm">{rev.userName || "Etidyan Anonim"}</h4>
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">verified</span>
                                            Achtè Verifye
                                        </p>
                                    </div>
                                </div>

                                <div className="flex text-yellow-400 text-sm">
                                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                        <span key={i} className="material-symbols-outlined text-sm">star</span>
                                    ))}
                                </div>
                            </div>

                            <p className="text-white/70 text-sm leading-relaxed italic">
                                "{rev.comment}"
                            </p>

                            <p className="text-[11px] text-white/30 text-right">
                                {new Date(rev.createdAt || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal pour écrire un avis */}
            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                courseId={productId}
                courseTitle={productTitle}
            />
        </section>
    );
}

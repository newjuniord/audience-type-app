"use client";

import React, { useEffect, useState } from 'react';
import { getFeaturedReviews } from '@/lib/reviews';
import { Review } from '@/lib/types';

export default function ReviewsSection() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [visibleCount, setVisibleCount] = useState(6);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReviews() {
            try {
                const data = await getFeaturedReviews(50);
                setReviews(data);
            } catch (error) {
                console.error("Failed to load home reviews", error);
            } finally {
                setLoading(false);
            }
        }
        fetchReviews();
    }, []);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 6);
    };

    if (loading) return null;
    if (reviews.length === 0) return null;

    const visibleReviews = reviews.slice(0, visibleCount);

    return (
        <section className="py-24 relative overflow-hidden border-t border-white/5">
            {/* Subtle radial glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 max-w-6xl relative z-10">
                {/* Header */}
                <div className="mb-16 text-center max-w-3xl mx-auto space-y-4">
                    <span className="text-primary text-xs font-black uppercase tracking-[0.3em]">Témoignages</span>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                        Ce que disent nos clients
                    </h2>
                    <p className="text-white/50 leading-relaxed font-medium">
                        Ils ont testé, ils ont adoré, et ils recommandent nos consultations, cours et ebooks pour apprendre plus vite et réussir plus vite.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {visibleReviews.map((review) => (
                        <div
                            key={review.id}
                            className="group flex flex-col p-7 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-primary/40 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1"
                        >
                            {/* Stars */}
                            <div className="flex items-center gap-1 mb-5">
                                {[...Array(5)].map((_, i) => (
                                    <span
                                        key={i}
                                        className={`material-symbols-outlined text-lg ${i < review.rating ? "text-primary" : "text-white/20"}`}
                                        style={{ fontVariationSettings: `'FILL' 1` }}
                                    >
                                        star
                                    </span>
                                ))}
                            </div>

                            {/* Quote */}
                            <p className="text-white/70 leading-relaxed font-medium line-clamp-4 flex-1 mb-6 text-sm">
                                "{review.comment}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30">
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName || 'User')}&background=F28C28&color=fff`}
                                        alt={review.userName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">{review.userName || "Anonyme"}</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Client Vérifié ✓</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {visibleCount < reviews.length && (
                    <div className="flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            className="group flex items-center gap-2 px-8 py-3 border border-white/20 rounded-full font-bold text-white/70 hover:text-white hover:border-primary/60 hover:bg-primary/10 transition-all text-sm"
                        >
                            Voir plus d'avis
                            <span className="material-symbols-outlined transition-transform group-hover:translate-y-0.5 text-base">expand_more</span>
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}

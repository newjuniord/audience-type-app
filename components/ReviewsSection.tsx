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
                // Fetch a larger batch to support "Load More" locally
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

    if (loading) return null; // Or a skeleton loader
    if (reviews.length === 0) return null;

    const visibleReviews = reviews.slice(0, visibleCount);

    return (
        <section className="py-24 bg-background-light dark:bg-background-dark relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/5 dark:via-white/10 to-transparent"></div>

            <div className="container mx-auto px-4 max-w-6xl relative z-10">
                <div className="mb-16 text-center max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
                        Ce que disent nos clients
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        Ils ont testé, ils ont adoré, et ils recommandent nos consultations, cours et ebooks pour apprendre plus vite et réussir plus vite ce mois-ci là.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {visibleReviews.map((review) => (
                        <div
                            key={review.id}
                            className="group p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-sidebar-active/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-1 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <span
                                        key={i}
                                        className={`material-symbols-outlined text-xl ${i < review.rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
                                        style={{ fontVariationSettings: `'FILL' 1` }}
                                    >
                                        star
                                    </span>
                                ))}
                            </div>

                            <p className="text-slate-700 dark:text-slate-300 mb-8 leading-relaxed font-medium line-clamp-4">
                                "{review.comment}"
                            </p>

                            <div className="flex items-center gap-4 mt-auto">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10">
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName || 'User')}&background=random`}
                                        alt={review.userName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{review.userName || "Anonyme"}</h4>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Client Vérifié</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {visibleCount < reviews.length && (
                    <div className="flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            className="group relative px-8 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                            <span className="flex items-center gap-2">
                                Voir plus d'avis
                                <span className="material-symbols-outlined transition-transform group-hover:translate-y-1">expand_more</span>
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}

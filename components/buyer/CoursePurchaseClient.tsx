"use client";

import { useState } from "react";
import { Course } from "@/lib/types";
import CheckoutModal from "@/components/buyer/CheckoutModal";

export default function CoursePurchaseClient({ course }: { course: Course }) {
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

    return (
        <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
            {/* Thumbnail preview */}
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                <img
                    src={course.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <button
                        onClick={() => setIsCheckoutModalOpen(true)}
                        className="size-16 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform"
                    >
                        <span className="material-symbols-outlined text-3xl">play_arrow</span>
                    </button>
                </div>
            </div>

            {/* Price Box */}
            <div className="space-y-1">
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Pri fòmasyon an</p>
                <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-white">${course.price}</span>
                    {course.priceHTG && (
                        <span className="text-base font-extrabold text-primary">/ {course.priceHTG.toLocaleString()} HTG</span>
                    )}
                </div>
            </div>

            {/* Primary Action Button */}
            <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="w-full py-5 px-8 bg-primary hover:bg-primary/90 text-white font-black text-center uppercase tracking-wider text-xs rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
                <span className="material-symbols-outlined text-lg">bolt</span>
                <span>Achte Kounye a (Aksè rapid)</span>
            </button>

            {/* Trust Features */}
            <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-white/70">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400 text-base">verified_user</span>
                    <span>Peman 100% Sekirize</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-base">all_inclusive</span>
                    <span>Aksè illimité pou tout lavi</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-400 text-base">workspace_premium</span>
                    <span>Sètitika achèvman DJR Akademi</span>
                </div>
            </div>

            {/* Checkout Modal */}
            {isCheckoutModalOpen && (
                <CheckoutModal
                    isOpen={isCheckoutModalOpen}
                    onClose={() => setIsCheckoutModalOpen(false)}
                    product={{
                        id: course.id!,
                        title: course.title,
                        priceHTG: course.priceHTG || 0,
                        price: course.price || 0,
                        currency: "$",
                        type: "course",
                        image: course.thumbnail || "/logo.png",
                        headline: course.title,
                    }}
                />
            )}
        </div>
    );
}

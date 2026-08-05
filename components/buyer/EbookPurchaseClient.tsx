"use client";

import { useState } from "react";
import { Ebook } from "@/lib/types";
import CheckoutModal from "@/components/buyer/CheckoutModal";

export default function EbookPurchaseClient({ ebook }: { ebook: Ebook }) {
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

    return (
        <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
            {/* Price Box */}
            <div className="space-y-1">
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Pri Ebook la</p>
                <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-white">${ebook.price}</span>
                    {ebook.priceHTG && (
                        <span className="text-base font-extrabold text-primary">/ {ebook.priceHTG.toLocaleString()} HTG</span>
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

            {/* Included Items */}
            {ebook.includedItems && ebook.includedItems.length > 0 && (
                <div className="space-y-3 pt-2">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">Sa k anndan li :</p>
                    <div className="space-y-2">
                        {ebook.includedItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-xs text-white/80">
                                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Trust Features */}
            <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-white/70">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400 text-base">verified_user</span>
                    <span>Peman 100% Sekirize</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-base">download</span>
                    <span>Telechajman PDF Imedyat apre acha</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-400 text-base">update</span>
                    <span>Mizajou gratis pou tout lavi</span>
                </div>
            </div>

            {/* Checkout Modal */}
            {isCheckoutModalOpen && (
                <CheckoutModal
                    isOpen={isCheckoutModalOpen}
                    onClose={() => setIsCheckoutModalOpen(false)}
                    product={{
                        id: ebook.id!,
                        title: ebook.title,
                        priceHTG: ebook.priceHTG || 0,
                        price: ebook.price || 0,
                        currency: "$",
                        type: "ebook",
                        image: ebook.coverImage || "/logo.png",
                        headline: ebook.title,
                    }}
                />
            )}
        </div>
    );
}

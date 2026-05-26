"use client";

import { useState } from "react";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { addReview } from "@/lib/reviews";
import { Timestamp } from "firebase/firestore";

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    courseTitle: string;
}

export default function ReviewModal({ isOpen, onClose, courseId, courseTitle }: ReviewModalProps) {
    const { user, userData } = useAuth();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hoveredStar, setHoveredStar] = useState<number | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!user) return;

        setIsSubmitting(true);
        try {
            await addReview({
                isVisible: false, // Default to hidden for moderation
                comment: comment,
                createdAt: Timestamp.now(),
                productId: doc(db, "courses", courseId),
                productTitle: courseTitle,
                rating: rating,
                userId: user.uid,
                userName: userData?.fullName || userData?.displayName || user.displayName || "Itilizatè",
                userEmail: user.email || "",
            });
            onClose();
            // Optional: Show success toast/notification here if you have a toast system
        } catch (error) {
            console.error("Failed to submit review", error);
            alert("Gen yon erè pandan n ap voye avi a. Tanpri reeseye.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500"></div>

                <h2 className="text-2xl font-black tracking-tight mb-2 text-center">Felisitasyon ! 🎉</h2>
                <p className="text-center text-black/60 dark:text-white/60 mb-8 text-sm">
                    Ou fini <strong>{courseTitle}</strong>. Kisa w panse de li ?
                </p>

                {/* Star Rating */}
                <div className="flex justify-center gap-2 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredStar(star)}
                            onMouseLeave={() => setHoveredStar(null)}
                            className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                        >
                            <span
                                className={`material-symbols-outlined text-4xl transition-colors duration-200 ${star <= (hoveredStar ?? rating)
                                    ? "text-yellow-400"
                                    : "text-gray-300 dark:text-gray-600"
                                    }`}
                                style={{ fontVariationSettings: star <= (hoveredStar ?? rating) ? "'FILL' 1" : "'FILL' 0" }}
                            >
                                star
                            </span>
                        </button>
                    ))}
                </div>

                {/* Comment Input */}
                <div className="mb-6">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/40 dark:text-white/40">
                        Avi ou (Si w vle)
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Kou sa a te ede m anpil paske..."
                        className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl p-4 text-sm min-h-[100px] resize-none focus:ring-0 transition-all placeholder:text-black/20 dark:placeholder:text-white/20"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-3 rounded-full font-bold text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60 transition-colors"
                    >
                        Plus tard
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-3 rounded-full font-bold text-sm bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Voye</span>
                                <span className="material-symbols-outlined text-base">send</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

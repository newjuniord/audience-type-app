"use client";

import { useState, useEffect } from "react";
import { getReviews, addReview, deleteReview } from "@/lib/reviews";
import { Review } from "@/lib/types";

export default function ReviewsDemo() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const data = await getReviews();
            setReviews(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTestReview = async () => {
        const newReview: Omit<Review, "id"> = {
            isVisible: true,
            comment: "Super produit, je recommande !",
            createdAt: new Date().toISOString() as any, // Using ISO string for Supabase
            productId: "some-product-id" as any,
            productTitle: "Mon Ebook Test",
            rating: 5,
            userId: "some-user-id" as any,
            userName: "Sophie Martin",
            userEmail: "sophie.martin@example.com"
        };

        await addReview(newReview);
        loadReviews();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Supprimer l'avis ?")) {
            await deleteReview(id);
            loadReviews();
        }
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Gestion des Avis</h1>
            <button onClick={handleAddTestReview} className="bg-yellow-500 text-white px-4 py-2 rounded mb-6">
                + Ajouter Avis Test
            </button>

            <div className="grid gap-4">
                {reviews.map(review => (
                    <div key={review.id} className="border p-4 rounded bg-white shadow">
                        <div className="flex justify-between">
                            <h3 className="font-bold">{review.productTitle}</h3>
                            <span className="text-yellow-500 font-bold">{review.rating}/5</span>
                        </div>
                        <p className="text-gray-700 my-2">"{review.comment}"</p>
                        <div className="text-xs text-gray-500 flex justify-between">
                            <span>Par: {review.userName}</span>
                            <span>Visible: {review.isVisible ? "Oui" : "Non"}</span>
                        </div>
                        <button onClick={() => review.id && handleDelete(review.id)} className="text-red-500 underline text-sm mt-2">
                            Supprimer
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

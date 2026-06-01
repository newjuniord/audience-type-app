import { createClient } from "./supabase/client";
import { Review } from "./types";

const COLLECTION_NAME = "reviews";

const getSupabase = () => createClient();

/**
 * Récupère tous les avis.
 */
export const getReviews = async (): Promise<Review[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Review[];
    } catch (error) {
        console.error("Erreur récup reviews:", error);
        throw error;
    }
};

/**
 * Récupère les avis mis en avant (pour la page d'accueil).
 */
export const getFeaturedReviews = async (max: number = 3): Promise<Review[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('isVisible', true)
            .order('rating', { ascending: false })
            .order('createdAt', { ascending: false })
            .limit(max);

        if (error) throw error;
        return (data || []) as Review[];
    } catch (error) {
        console.error("Erreur récup featured reviews:", error);
        throw error;
    }
};

/**
 * Récupère les avis pour un produit spécifique.
 * 
 * @param {string} productId - L'ID du produit.
 */
export const getReviewsByProduct = async (productId: string): Promise<Review[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('productId', productId)
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Review[];
    } catch (error) {
        console.error("Erreur récup reviews par produit:", error);
        throw error;
    }
};

/**
 * Ajoute un nouvel avis.
 */
export const addReview = async (reviewData: Omit<Review, "id">): Promise<string> => {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newReview = {
            ...reviewData,
            id,
            createdAt: reviewData.createdAt || new Date().toISOString()
        };

        const { error } = await supabase
            .from(COLLECTION_NAME)
            .insert(newReview);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error("Erreur ajout review:", error);
        throw error;
    }
};

/**
 * Met à jour un avis (ex: changer la visibilité).
 */
export const updateReview = async (id: string, data: Partial<Review>): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update(data)
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur maj review:", error);
        throw error;
    }
};

/**
 * Supprime un avis.
 */
export const deleteReview = async (id: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur suppression review:", error);
        throw error;
    }
};

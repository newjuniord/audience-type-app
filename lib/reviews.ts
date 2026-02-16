import {
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
    query,
    where,
    orderBy,
    limit,
    DocumentReference
} from "firebase/firestore";
import { db } from "./firebase";
import { Review } from "./types";

const COLLECTION_NAME = "reviews";

/**
 * Récupère tous les avis.
 */
export const getReviews = async (): Promise<Review[]> => {
    try {
        const ref = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(ref);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Review[];
    } catch (error) {
        console.error("Erreur récup reviews:", error);
        throw error;
    }
};

/**
 * Récupère les avis mis en avant (pour la page d'accueil).
 * Utilise la méthode côté client pour éviter d'imposer un index composite pour le moment.
 */
export const getFeaturedReviews = async (max: number = 3): Promise<Review[]> => {
    try {
        const ref = collection(db, COLLECTION_NAME);

        // On récupère simplement tous les avis visibles (jusqu'à une limite raisonnable pour ne pas tout charger)
        // La gestion complexe des index (tri + filtre) est évitée ici.
        const q = query(
            ref,
            where("isVisible", "==", true),
            limit(50)
        );

        const snapshot = await getDocs(q);

        let allReviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Review[];

        // Tri côté client : d'abord par note (desc), puis par date (desc)
        allReviews.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            // Si même note, le plus récent en premier
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
        });

        // Limite finale
        return allReviews.slice(0, max);
    } catch (error) {
        console.error("Erreur récup featured reviews:", error);
        throw error;
    }
};

/**
 * Récupère les avis pour un produit spécifique.
 * 
 * @param {DocumentReference} productRef - La référence du produit.
 */
export const getReviewsByProduct = async (productRef: DocumentReference): Promise<Review[]> => {
    try {
        const ref = collection(db, COLLECTION_NAME);
        // Filtre les avis où le champ 'productId' correspond à la référence donnée
        const q = query(ref, where("productId", "==", productRef));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Review[];
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
        const ref = await addDoc(collection(db, COLLECTION_NAME), {
            ...reviewData,
            createdAt: reviewData.createdAt || Timestamp.now()
        });
        return ref.id;
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
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, data);
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
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    } catch (error) {
        console.error("Erreur suppression review:", error);
        throw error;
    }
};

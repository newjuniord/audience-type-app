import { db } from "./firebase";
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy
} from "firebase/firestore";
import { Referral } from "./types";

const COLLECTION_NAME = "referrals";

/**
 * Récupère tous les parrainages.
 */
export async function getReferrals(): Promise<Referral[]> {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Referral));
    } catch (error) {
        console.error("Error fetching referrals:", error);
        throw error;
    }
}

/**
 * Met à jour le statut d'un parrainage.
 */
export async function updateReferralStatus(id: string, status: 'pending' | 'rewarded'): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, { status });
    } catch (error) {
        console.error(`Error updating referral ${id}:`, error);
        throw error;
    }
}

/**
 * Supprime un enregistrement de parrainage.
 */
export async function deleteReferral(id: string): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Error deleting referral ${id}:`, error);
        throw error;
    }
}

import { Review } from "./types";
import { db } from "./firebase";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";

const COLLECTION_NAME = "reviews";

export async function getReviews(): Promise<Review[]> {
    try {
        const reviewsRef = collection(db, COLLECTION_NAME);
        const q = query(reviewsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (error) {
        console.error("Error getting reviews:", error);
        return [];
    }
}

export async function getReviewsByProduct(productId: string): Promise<Review[]> {
    try {
        const reviewsRef = collection(db, COLLECTION_NAME);
        const q = query(reviewsRef, where("productId", "==", productId), where("isVisible", "==", true));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (error) {
        console.error("Error getting reviews by product:", error);
        return [];
    }
}

export async function getFeaturedReviews(limitCount?: number): Promise<Review[]> {
    try {
        const reviewsRef = collection(db, COLLECTION_NAME);
        const q = query(reviewsRef, where("isVisible", "==", true));
        const snapshot = await getDocs(q);
        let featured = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        // Client side sorting to avoid complex compound indexes if not created
        featured.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (limitCount) {
            return featured.slice(0, limitCount);
        }
        return featured;
    } catch (error) {
        console.error("Error getting featured reviews:", error);
        return [];
    }
}

export async function updateReview(id: string, data: Partial<Review>): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error updating review:", error);
        throw error;
    }
}

export async function addReview(reviewData: Partial<Review>): Promise<string> {
    try {
        const reviewsRef = collection(db, COLLECTION_NAME);
        const newDocRef = doc(reviewsRef);
        const newReview: Review = {
            id: newDocRef.id,
            userId: reviewData.userId || "",
            userName: reviewData.userName || "Anonyme",
            userAvatar: reviewData.userAvatar || "",
            rating: reviewData.rating || 5,
            comment: reviewData.comment || "",
            status: reviewData.status || "pending",
            isVisible: reviewData.isVisible ?? false,
            createdAt: new Date().toISOString(),
            productId: reviewData.productId,
            productTitle: reviewData.productTitle,
            userEmail: reviewData.userEmail
        };
        await setDoc(newDocRef, newReview);
        return newDocRef.id;
    } catch (error) {
        console.error("Error adding review:", error);
        throw error;
    }
}

export async function updateReviewStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    return updateReview(id, { status, isVisible: status === 'approved' });
}

export async function deleteReview(id: string): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting review:", error);
        throw error;
    }
}

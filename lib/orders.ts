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
    limit,
    orderBy,
    DocumentReference
} from "firebase/firestore";
import { db } from "./firebase";
import { Order } from "./types";

const COLLECTION_NAME = "orders";

/**
 * Récupère toutes les commandes.
 */
export const getOrders = async (): Promise<Order[]> => {
    try {
        const ref = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(ref);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Order[];
    } catch (error) {
        console.error("Erreur récup orders:", error);
        throw error;
    }
};

/**
 * Récupère les commandes d'un utilisateur spécifique.
 * 
 * @param {DocumentReference} userRef - La référence de l'utilisateur.
 */
export const getOrdersByUser = async (userId: string, limitCount?: number): Promise<Order[]> => {
    try {
        console.log("🔍 [LIB/ORDERS] Querying orders for userId:", userId);
        const ref = collection(db, COLLECTION_NAME);
        const allDocs: any[] = [];

        // 1. Try querying by string ID (Newer format)
        try {
            const constraints: any[] = [where("userId", "==", userId)];
            if (limitCount) {
                constraints.push(orderBy("createdAt", "desc"), limit(limitCount));
            }
            const qString = query(ref, ...constraints);
            const snapshotString = await getDocs(qString);
            console.log(`🔍 [LIB/ORDERS] Found ${snapshotString.size} orders with string userId.`);
            allDocs.push(...snapshotString.docs);
        } catch (err: any) {
            console.warn("⚠️ [LIB/ORDERS] String-based query failed (possibly missing index or permissions):", err.message);
            // Fallback for missing composite index
            if (limitCount) {
                const fallbackQ = query(ref, where("userId", "==", userId));
                const snap = await getDocs(fallbackQ);
                allDocs.push(...snap.docs);
            }
        }

        // 2. Try querying by DocumentReference (Older/Alternative format)
        try {
            const userRef = doc(db, "users", userId);
            const constraints: any[] = [where("userId", "==", userRef)];
            if (limitCount) {
                constraints.push(orderBy("createdAt", "desc"), limit(limitCount));
            }
            const qRef = query(ref, ...constraints);
            const snapshotRef = await getDocs(qRef);
            console.log(`🔍 [LIB/ORDERS] Found ${snapshotRef.size} orders with Reference userId.`);

            // Add ref docs if not already in list
            snapshotRef.docs.forEach(d => {
                if (!allDocs.find(existing => existing.id === d.id)) {
                    allDocs.push(d);
                }
            });
        } catch (err: any) {
            console.warn("⚠️ [LIB/ORDERS] Reference-based query failed:", err.message);
            if (limitCount) {
                const fallbackQ = query(ref, where("userId", "==", doc(db, "users", userId)));
                const snap = await getDocs(fallbackQ);
                snap.docs.forEach(d => {
                    if (!allDocs.find(existing => existing.id === d.id)) {
                        allDocs.push(d);
                    }
                });
            }
        }

        let orders = allDocs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Order[];

        // Always sort in memory to merge the two queries correctly, and apply limit if fallback happened.
        orders.sort((a, b) => {
            const dateA = a.createdAt?.toDate().getTime() || 0;
            const dateB = b.createdAt?.toDate().getTime() || 0;
            return dateB - dateA;
        });

        if (limitCount) {
            orders = orders.slice(0, limitCount);
        }

        return orders;
    } catch (error) {
        console.error("❌ [LIB/ORDERS] Critical error in getOrdersByUser:", error);
        throw error;
    }
};

/**
 * Crée une nouvelle commande.
 */
export const createOrder = async (orderData: Omit<Order, "id">): Promise<string> => {
    try {
        const ref = await addDoc(collection(db, COLLECTION_NAME), {
            ...orderData,
            createdAt: orderData.createdAt || Timestamp.now()
        });
        return ref.id;
    } catch (error) {
        console.error("Erreur ajout order:", error);
        throw error;
    }
};

/**
 * Met à jour le statut d'une commande.
 */
export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
    try {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, { status });
    } catch (error) {
        console.error("Erreur maj order status:", error);
        throw error;
    }
};

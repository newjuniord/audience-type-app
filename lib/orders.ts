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
export const getOrdersByUser = async (userId: string): Promise<Order[]> => {
    try {
        console.log("🔍 [LIB/ORDERS] Querying orders for userId:", userId);
        const ref = collection(db, COLLECTION_NAME);

        // Try querying by string ID first (new format)
        const qString = query(ref, where("userId", "==", userId));
        const snapshotString = await getDocs(qString);
        console.log(`🔍 [LIB/ORDERS] Found ${snapshotString.size} orders with string userId.`);

        // Try querying by DocumentReference (old/alternate format)
        const userRef = doc(db, "users", userId);
        const qRef = query(ref, where("userId", "==", userRef));
        const snapshotRef = await getDocs(qRef);
        console.log(`🔍 [LIB/ORDERS] Found ${snapshotRef.size} orders with Reference userId.`);

        // Combine and deduplicate
        const allDocs = [...snapshotString.docs];
        // Add ref docs if not already in list (unlikely to have both for same record, but safe)
        snapshotRef.docs.forEach(d => {
            if (!allDocs.find(existing => existing.id === d.id)) {
                allDocs.push(d);
            }
        });

        const orders = allDocs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Order[];

        return orders;
    } catch (error) {
        console.error("❌ [LIB/ORDERS] Erreur récup orders par user:", error);
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

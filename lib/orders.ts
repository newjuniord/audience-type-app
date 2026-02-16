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
        const ref = collection(db, COLLECTION_NAME);
        const q = query(ref, where("userId", "==", userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Order[];
    } catch (error) {
        console.error("Erreur récup orders par user:", error);
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

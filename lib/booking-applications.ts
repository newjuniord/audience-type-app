import {
    collection,
    addDoc,
    Timestamp,
    doc,
    DocumentReference
} from "firebase/firestore";
import { db } from "./firebase";
import { BookingApplication } from "./types";

const COLLECTION_NAME = "bookingApplications";

/**
 * Crée une nouvelle demande de réservation (Application).
 */
export const createBookingApplication = async (data: Omit<BookingApplication, "id">): Promise<string> => {
    try {
        const ref = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: data.createdAt || Timestamp.now()
        });
        return ref.id;
    } catch (error) {
        console.error("Erreur création booking application:", error);
        throw error;
    }
};

/**
 * Récupère les demandes de réservation d'un utilisateur.
 */

/**
 * Récupère les demandes de réservation d'un utilisateur.
 */
import { query, where, getDocs, updateDoc, deleteDoc } from "firebase/firestore";

export const getBookingApplicationsByUser = async (userRef: DocumentReference | string): Promise<BookingApplication[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("usersId", "==", userRef)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingApplication));
    } catch (error) {
        console.error("Erreur récupération booking applications:", error);
        return [];
    }
};

/**
 * Récupère toutes les demandes de réservation (Admin).
 */
export const getBookingApplications = async (): Promise<BookingApplication[]> => {
    try {
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingApplication));
    } catch (error) {
        console.error("Erreur récupération all booking applications:", error);
        return [];
    }
};

/**
 * Met à jour le statut d'une demande.
 */
export const updateBookingApplicationStatus = async (id: string, status: string): Promise<void> => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, id), { status });
    } catch (error) {
        console.error("Erreur update status:", error);
        throw error;
    }
};

/**
 * Supprime une demande.
 */
export const deleteBookingApplication = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Erreur suppression application:", error);
        throw error;
    }
};

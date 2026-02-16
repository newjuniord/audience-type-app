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
    orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { Booking } from "./types";

const COLLECTION_NAME = "bookings";

/**
 * Récupère toutes les réservations.
 * 
 * @returns {Promise<Booking[]>} Une liste de réservations.
 */
export const getBookings = async (): Promise<Booking[]> => {
    try {
        const ref = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(ref);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Booking[];
    } catch (error) {
        console.error("Erreur récup bookings:", error);
        throw error;
    }
};

/**
 * Récupère une réservation spécifique.
 * 
 * @param {string} id - ID de la réservation.
 */
export const getBookingById = async (id: string): Promise<Booking | null> => {
    try {
        const ref = doc(db, COLLECTION_NAME, id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as Booking;
        }
        return null;
    } catch (error) {
        console.error("Erreur récup booking:", error);
        throw error;
    }
};

/**
 * Ajoute une nouvelle réservation.
 * 
 * @param {Omit<Booking, "id">} bookingData - Données de la réservation.
 */
export const addBooking = async (bookingData: Omit<Booking, "id">): Promise<string> => {
    try {
        const ref = await addDoc(collection(db, COLLECTION_NAME), {
            ...bookingData,
            createdAt: bookingData.createdAt || Timestamp.now()
        });
        return ref.id;
    } catch (error) {
        console.error("Erreur ajout booking:", error);
        throw error;
    }
};

/**
 * Met à jour une réservation.
 */
export const updateBooking = async (id: string, data: Partial<Booking>): Promise<void> => {
    try {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, data);
    } catch (error) {
        console.error("Erreur maj booking:", error);
        throw error;
    }
};

/**
 * Supprime une réservation.
 */
export const deleteBooking = async (id: string): Promise<void> => {
    try {
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    } catch (error) {
        console.error("Erreur suppression booking:", error);
        throw error;
    }
};

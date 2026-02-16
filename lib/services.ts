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
import { Service } from "./types";

const COLLECTION_NAME = "services";

/**
 * Récupère tous les services (offres).
 */
export const getServices = async (): Promise<Service[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Service[];
    } catch (error) {
        console.error("Erreur récup services:", error);
        throw error;
    }
};

/**
 * Récupère un service par son ID.
 */
export const getServiceById = async (id: string): Promise<Service | null> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Service;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Erreur récup service par ID:", error);
        return null;
    }
};

/**
 * Ajoute un nouveau service.
 */
export const addService = async (data: Omit<Service, "id" | "createdAt" | "updatedAt">): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error("Erreur ajout service:", error);
        throw error;
    }
};

/**
 * Met à jour un service existant.
 */
export const updateService = async (id: string, data: Partial<Service>): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Erreur maj service:", error);
        throw error;
    }
};

/**
 * Supprime un service.
 */
export const deleteService = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Erreur suppression service:", error);
        throw error;
    }
};

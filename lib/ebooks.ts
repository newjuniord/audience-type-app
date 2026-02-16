import {
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp
} from "firebase/firestore";
import { db } from "./firebase"; // Importation de notre instance Firestore configurée
import { Ebook } from "./types"; // Importation de notre type Ebook

// Définition du nom de la collection dans Firestore
const COLLECTION_NAME = "ebooks";

/**
 * Récupère tous les ebooks de la collection 'ebooks'.
 * 
 * Cette fonction interroge Firestore pour obtenir tous les documents de la collection 'ebooks'.
 * Elle mappe ensuite les résultats pour retourner un tableau d'objets `Ebook` avec leurs IDs.
 * 
 * @returns {Promise<Ebook[]>} Une promesse qui résout avec un tableau d'ebooks.
 */
export const getEbooks = async (): Promise<Ebook[]> => {
    try {
        // Crée une référence à la collection 'ebooks'
        const ebooksRef = collection(db, COLLECTION_NAME);

        // Exécute la requête pour obtenir un "snapshot" (instantané) des données
        const snapshot = await getDocs(ebooksRef);

        // Transforme chaque document du snapshot en objet Ebook
        const ebooks = snapshot.docs.map((doc) => ({
            id: doc.id, // On inclut l'ID du document
            ...doc.data(), // On déploie le reste des données du document
        })) as Ebook[]; // On force le type pour correspondre à notre interface

        return ebooks;
    } catch (error) {
        console.error("Erreur lors de la récupération des ebooks:", error);
        throw error; // On relance l'erreur pour qu'elle puisse être gérée par l'appelant
    }
};

/**
 * Récupère un ebook spécifique par son ID.
 * 
 * @param {string} id - L'identifiant unique de l'ebook à récupérer.
 * @returns {Promise<Ebook | null>} Une promesse qui résout avec l'ebook trouvé ou null si non trouvé.
 */
export const getEbookById = async (id: string): Promise<Ebook | null> => {
    try {
        // Crée une référence au document spécifique dans la collection 'ebooks'
        const docRef = doc(db, COLLECTION_NAME, id);

        // Récupère le document
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // Si le document existe, on le retourne formaté
            return { id: docSnap.id, ...docSnap.data() } as Ebook;
        } else {
            // Si le document n'existe pas, on retourne null
            console.log("Aucun ebook trouvé avec cet ID !");
            return null;
        }
    } catch (error) {
        console.error("Erreur lors de la récupération de l'ebook:", error);
        throw error;
    }
};

/**
 * Ajoute un nouvel ebook à la collection.
 * 
 * @param {Omit<Ebook, "id">} ebookData - Les données de l'ebook à ajouter (sans l'ID car Firestore le génère).
 * @returns {Promise<string>} Une promesse qui résout avec l'ID du nouvel ebook créé.
 */
export const addEbook = async (ebookData: Omit<Ebook, "id">): Promise<string> => {
    try {
        // Firestore génère automatiquement un ID unique lors de l'ajout avec addDoc
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...ebookData,
            // On s'assure que les dates sont des Timestamps Firestore si ce n'est pas déjà le cas
            createdAt: ebookData.createdAt || Timestamp.now(),
            updatedAt: ebookData.updatedAt || Timestamp.now()
        });

        console.log("Ebook ajouté avec l'ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Erreur lors de l'ajout de l'ebook:", error);
        throw error;
    }
};

/**
 * Met à jour un ebook existant.
 * 
 * @param {string} id - L'identifiant de l'ebook à mettre à jour.
 * @param {Partial<Ebook>} data - Les données à mettre à jour (Partiel car on ne change pas tout forcément).
 * @returns {Promise<void>} Une promesse qui résout quand la mise à jour est terminée.
 */
export const updateEbook = async (id: string, data: Partial<Ebook>): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);

        // On met à jour le champ updatedAt automatiquement
        await updateDoc(docRef, {
            ...data,
            updatedAt: Timestamp.now()
        });

        console.log("Ebook mis à jour avec succès");
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'ebook:", error);
        throw error;
    }
};

/**
 * Supprime un ebook de la collection.
 * 
 * @param {string} id - L'identifiant de l'ebook à supprimer.
 * @returns {Promise<void>} Une promesse qui résout quand la suppression est terminée.
 */
export const deleteEbook = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
        console.log("Ebook supprimé avec succès");
    } catch (error) {
        console.error("Erreur lors de la suppression de l'ebook:", error);
        throw error;
    }
};

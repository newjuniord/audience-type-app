import { db } from "./firebase";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp
} from "firebase/firestore";
import { User } from "./types";

const COLLECTION_NAME = "users";

/**
 * Récupère tous les utilisateurs.
 * @returns Liste des utilisateurs
 */
export async function getUsers(): Promise<User[]> {
    try {
        const q = query(collection(db, COLLECTION_NAME));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as User));

        // Sort in-memory to avoid filtering out docs missing the field
        return users.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
            const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

/**
 * Récupère un utilisateur par son ID.
 */
export async function getUserById(uid: string): Promise<User | null> {
    try {
        const docRef = doc(db, COLLECTION_NAME, uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { uid: docSnap.id, ...docSnap.data() } as User;
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching user ${uid}:`, error);
        return null;
    }
}

/**
 * Met à jour le rôle d'un utilisateur.
 * @param uid ID de l'utilisateur
 * @param role Nouveau rôle ('admin' | 'customer')
 */
export async function updateUserRole(uid: string, role: 'admin' | 'customer'): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, uid);
        await updateDoc(docRef, { role });
    } catch (error) {
        console.error(`Error updating role for user ${uid}:`, error);
        throw error;
    }
}

/**
 * Met à jour les informations d'un utilisateur.
 * @param uid ID de l'utilisateur
 * @param data Données à mettre à jour
 */
export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, uid);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error(`Error updating user ${uid}:`, error);
        throw error;
    }
}

/**
 * Supprime un document utilisateur de Firestore.
 * Note: Cela ne supprime pas le compte d'authentification (nécessite Admin SDK).
 */
export async function deleteUserDocument(uid: string): Promise<void> {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, uid));
    } catch (error) {
        console.error(`Error deleting user document ${uid}:`, error);
        throw error;
    }
}

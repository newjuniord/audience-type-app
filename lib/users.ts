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
    Timestamp,
    limit as firestoreLimit,
    startAfter,
    QueryDocumentSnapshot
} from "firebase/firestore";
import { User } from "./types";

const COLLECTION_NAME = "users";

/**
 * Récupère les utilisateurs avec pagination.
 * @param pageSize Nombre d'utilisateurs à charger
 * @param lastVisible Dernier document chargé (pour la pagination)
 * @returns Liste des utilisateurs et le dernier document
 */
export async function getUsers(pageSize: number = 20, lastVisible?: QueryDocumentSnapshot): Promise<{ users: User[], lastVisible?: QueryDocumentSnapshot }> {
    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            orderBy("createdAt", "desc"),
            firestoreLimit(pageSize)
        );

        if (lastVisible) {
            q = query(q, startAfter(lastVisible));
        }

        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as User));

        return {
            users,
            lastVisible: snapshot.docs[snapshot.docs.length - 1]
        };
    } catch (error) {
        console.error("Error fetching users:", error);
        return { users: [] };
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

import { User } from "./types";
import { db } from "./firebase";
import { collection, doc, getDoc, getDocs, query, updateDoc, deleteDoc, orderBy, limit } from "firebase/firestore";

const COLLECTION_NAME = "users";

export async function getUsers(pageSize: number = 1000, page: number = 1): Promise<{ users: User[], hasMore: boolean }> {
    try {
        const usersRef = collection(db, COLLECTION_NAME);
        // We fetch up to 1000 users by default to allow fast client-side searching and pagination
        const q = query(usersRef, orderBy("createdAt", "desc"), limit(pageSize));
        const querySnapshot = await getDocs(q);
        
        const users: User[] = [];
        querySnapshot.forEach((docSnap) => {
            users.push({ id: docSnap.id, ...docSnap.data() } as User);
        });

        return {
            users,
            hasMore: false // Handled client-side now
        };
    } catch (error) {
        console.error("Error fetching users:", error);
        return { users: [], hasMore: false };
    }
}

export async function getUserById(uid: string): Promise<User | null> {
    try {
        const userRef = doc(db, COLLECTION_NAME, uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as User;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        return null;
    }
}

export async function updateUserRole(uid: string, role: 'admin' | 'customer'): Promise<void> {
    try {
        const userRef = doc(db, COLLECTION_NAME, uid);
        await updateDoc(userRef, { role, updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error("Error updating user role:", error);
        throw error;
    }
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
    try {
        const userRef = doc(db, COLLECTION_NAME, uid);
        await updateDoc(userRef, { ...data, updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
}

export async function deleteUserDocument(uid: string): Promise<void> {
    try {
        const userRef = doc(db, COLLECTION_NAME, uid);
        await deleteDoc(userRef);
    } catch (error) {
        console.error("Error deleting user document:", error);
        throw error;
    }
}

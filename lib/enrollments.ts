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
import { Enrollment } from "./types";

const COLLECTION_NAME = "enrollments";

/**
 * Récupère toutes les inscriptions.
 */
export const getEnrollments = async (): Promise<Enrollment[]> => {
    try {
        const ref = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(ref);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Enrollment[];
    } catch (error) {
        console.error("Erreur récup enrollments:", error);
        throw error;
    }
};

/**
 * Récupère les inscriptions d'un utilisateur.
 */
export const getEnrollmentsByUser = async (userRef: DocumentReference | string): Promise<Enrollment[]> => {
    try {
        const ref = collection(db, COLLECTION_NAME);
        
        // On s'assure d'avoir les deux formats proprement
        const uid = typeof userRef === 'string' ? userRef : userRef.id;
        const userDocRef = typeof userRef === 'string' ? doc(db, "users", userRef) : userRef;

        console.log("🔍 Fetching enrollments for UID:", uid);

        // On lance les deux requêtes
        const qString = query(ref, where("userId", "==", uid));
        const qRef = query(ref, where("userId", "==", userDocRef));

        const [snapString, snapRef] = await Promise.all([
            getDocs(qString),
            getDocs(qRef)
        ]);

        // Fusion des résultats par ID unique
        const resultsMap = new Map<string, Enrollment>();
        
        [...snapString.docs, ...snapRef.docs].forEach(doc => {
            resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as Enrollment);
        });

        return Array.from(resultsMap.values());
    } catch (error) {
        console.error("Erreur récup enrollments par user:", error);
        return []; // On retourne un tableau vide au lieu de bloquer le chargement
    }
};

/**
 * Ajoute une nouvelle inscription.
 */
export const createEnrollment = async (data: Omit<Enrollment, "id">): Promise<string> => {
    try {
        const ref = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            enrolledAt: data.enrolledAt || Timestamp.now(),
            lastAccessedAt: data.lastAccessedAt || Timestamp.now()
        });
        return ref.id;
    } catch (error) {
        console.error("Erreur ajout enrollment:", error);
        throw error;
    }
};

/**
 * Met à jour la progression d'une inscription.
 */
export const updateEnrollmentProgress = async (
    id: string,
    completedLessons: string[],
    currentLessonId: string,
    progress: number
): Promise<void> => {
    try {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, {
            completedLessons,
            currentLessonId,
            progress,
            lastAccessedAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Erreur maj enrollment progress:", error);
        throw error;
    }
};

/**
 * Incrémente le compteur de téléchargements d'une inscription (ebook).
 */
export const incrementEnrollmentDownloadCount = async (id: string): Promise<void> => {
    try {
        const ref = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(ref);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const currentCount = parseInt(data.downloadCount || "0");
            await updateDoc(ref, {
                downloadCount: (currentCount + 1).toString(),
                lastAccessedAt: Timestamp.now()
            });
        }
    } catch (error) {
        console.error("Erreur increment download count:", error);
        throw error;
    }
};
/**
 * Supprime une inscription (retrait d'accès).
 */
export const deleteEnrollment = async (id: string): Promise<void> => {
    try {
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    } catch (error) {
        console.error("Erreur suppression enrollment:", error);
        throw error;
    }
};

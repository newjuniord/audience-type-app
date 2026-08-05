import { Enrollment } from "./types";

import { db } from "./firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, addDoc } from "firebase/firestore";

export const getEnrollments = async (): Promise<Enrollment[]> => {
    const enrollmentsRef = collection(db, "enrollments");
    const snapshot = await getDocs(enrollmentsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment));
};

export const getEnrollmentsByUser = async (userId: string): Promise<Enrollment[]> => {
    const enrollmentsRef = collection(db, "enrollments");
    const q = query(enrollmentsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment));
};

/** Les horodatages sont posés ici : les appelants n'ont pas à les fournir. */
type NewEnrollment = Omit<Enrollment, "id" | "enrolledAt" | "lastAccessedAt"> &
    Partial<Pick<Enrollment, "enrolledAt" | "lastAccessedAt">>;

export const createEnrollment = async (data: NewEnrollment): Promise<string> => {
    const newEnrollmentRef = doc(collection(db, "enrollments"));
    const id = newEnrollmentRef.id;
    const newEnrollment: Enrollment = {
        ...data,
        id,
        enrolledAt: data.enrolledAt || new Date().toISOString(),
        lastAccessedAt: data.lastAccessedAt || new Date().toISOString()
    };
    await setDoc(newEnrollmentRef, newEnrollment);

    // Mettre à jour le nombre d'inscriptions de l'utilisateur
    if (data.userId) {
        try {
            const userRef = doc(db, "users", data.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const currentCount = userSnap.data().enrollmentCount || 0;
                await updateDoc(userRef, { enrollmentCount: currentCount + 1 });
            }
        } catch (err) {
            console.error("Erreur lors de la mise à jour du compteur d'inscriptions utilisateur:", err);
        }
    }

    return id;
};

export const updateEnrollmentProgress = async (
    id: string,
    completedLessons: string[],
    currentLessonId: string,
    progress: number
): Promise<void> => {
    const docRef = doc(db, "enrollments", id);
    await updateDoc(docRef, {
        completedLessons,
        currentLessonId,
        progress,
        lastAccessedAt: new Date().toISOString()
    });
};

export const incrementEnrollmentDownloadCount = async (id: string): Promise<void> => {
    const docRef = doc(db, "enrollments", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        const enr = snapshot.data() as Enrollment;
        const currentCount = parseInt(enr.downloadCount || "0");
        await updateDoc(docRef, {
            downloadCount: (currentCount + 1).toString(),
            lastAccessedAt: new Date().toISOString()
        });
    }
};

export const deleteEnrollment = async (id: string): Promise<void> => {
    const docRef = doc(db, "enrollments", id);
    await deleteDoc(docRef);
};

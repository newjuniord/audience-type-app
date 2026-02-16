import { db, storage } from "./firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp, getDoc, setDoc } from "firebase/firestore";
import { Course, Module, Lesson } from "./types";
import { ref, deleteObject } from "firebase/storage";

const COURSES_COLLECTION = "courses";
const MODULES_COLLECTION = "modules";

// --- Courses CRUD ---

export async function getCourses(): Promise<Course[]> {
    try {
        // Fetch all courses without ordering first to avoid index issues/connection complexity
        const q = query(collection(db, COURSES_COLLECTION));
        const snapshot = await getDocs(q);
        const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

        // Sort by createdAt desc (Newest first) in memory
        return courses.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
            return dateB - dateA;
        });
    } catch (error) {
        console.error("Error fetching courses:", error);
        return [];
    }
}

export async function getCourse(courseId: string): Promise<Course | null> {
    try {
        const docRef = doc(db, COURSES_COLLECTION, courseId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Course;
        }
        return null;
    } catch (error) {
        console.error("Error fetching course:", error);
        return null;
    }
}

export async function addCourse(courseData: Partial<Course>): Promise<string> {
    try {
        const newCourse = {
            ...courseData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            sales: 0, // Default for new course
        };
        const docRef = await addDoc(collection(db, COURSES_COLLECTION), newCourse);
        return docRef.id;
    } catch (error) {
        console.error("Error adding course:", error);
        throw error;
    }
}

export async function updateCourse(courseId: string, courseData: Partial<Course>): Promise<void> {
    try {
        const docRef = doc(db, COURSES_COLLECTION, courseId);
        await updateDoc(docRef, {
            ...courseData,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Error updating course:", error);
        throw error;
    }
}

export async function deleteCourse(courseId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, COURSES_COLLECTION, courseId));
        // Note: Subcollections (modules) are not automatically deleted. 
        // For a full production app, implement a recursive delete via Cloud Functions.
    } catch (error) {
        console.error("Error deleting course:", error);
        throw error;
    }
}

// --- Modules CRUD (Subcollection) ---

export async function getModules(courseId: string): Promise<Module[]> {
    try {
        const modulesRef = collection(db, COURSES_COLLECTION, courseId, MODULES_COLLECTION);
        const snapshot = await getDocs(modulesRef);
        const modules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Module));

        // Sort by Date ONLY (Oldest first) as requested.
        // If createdAt is missing (legacy data), treat as 0 (very old) so they appear first.
        return modules.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
            return dateA - dateB;
        });
    } catch (error) {
        console.error("Error fetching modules:", error);
        return [];
    }
}

export async function addModule(courseId: string, moduleData: Partial<Module>): Promise<string> {
    try {
        const modulesRef = collection(db, COURSES_COLLECTION, courseId, MODULES_COLLECTION);
        const newModule = {
            ...moduleData,
            createdAt: Timestamp.now()
        };
        const docRef = await addDoc(modulesRef, newModule);
        return docRef.id;
    } catch (error) {
        console.error("Error adding module:", error);
        throw error;
    }
}

export async function updateModule(courseId: string, moduleId: string, moduleData: Partial<Module>): Promise<void> {
    try {
        const docRef = doc(db, COURSES_COLLECTION, courseId, MODULES_COLLECTION, moduleId);
        await updateDoc(docRef, moduleData);
    } catch (error) {
        console.error("Error updating module:", error);
        throw error;
    }
}

export async function deleteModule(courseId: string, moduleId: string): Promise<void> {
    try {
        const docRef = doc(db, COURSES_COLLECTION, courseId, MODULES_COLLECTION, moduleId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting module:", error);
        throw error;
    }
}

// Lessons are stored in the 'lessons' array field of a Module document
export async function updateModuleLessons(courseId: string, moduleId: string, lessons: Lesson[]): Promise<void> {
    try {
        const docRef = doc(db, COURSES_COLLECTION, courseId, MODULES_COLLECTION, moduleId);
        await updateDoc(docRef, { lessons });
    } catch (error) {
        console.error("Error updating lessons:", error);
        throw error;
    }
}

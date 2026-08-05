import { Course, Module, Lesson } from "./types";
import { db } from "./firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";

// --- Courses CRUD ---

export async function getCourses(): Promise<Course[]> {
    const coursesRef = collection(db, "courses");
    const snapshot = await getDocs(coursesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
}

export async function getCourse(courseId: string): Promise<Course | null> {
    const docRef = doc(db, "courses", courseId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Course;
    }
    return null;
}

export async function addCourse(courseData: Partial<Course>): Promise<string> {
    const newCourseRef = doc(collection(db, "courses"));
    const id = newCourseRef.id;
    const newCourse: Course = {
        id,
        title: courseData.title || "Nouvo Kou",
        description: courseData.description || "",
        price: courseData.price || 0,
        priceHTG: courseData.priceHTG || 0,
        sales: 0,
        statut: courseData.statut || "draft",
        thumbnail: courseData.thumbnail || "",
        includedItems: courseData.includedItems || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: courseData.authorId || "",
        authorName: courseData.authorName || "",
        authorImage: courseData.authorImage || ""
    };
    await setDoc(newCourseRef, newCourse);
    return id;
}

export async function updateCourse(courseId: string, courseData: Partial<Course>): Promise<void> {
    const docRef = doc(db, "courses", courseId);
    await updateDoc(docRef, {
        ...courseData,
        updatedAt: new Date().toISOString()
    });
}

export async function deleteCourse(courseId: string): Promise<void> {
    const docRef = doc(db, "courses", courseId);
    await deleteDoc(docRef);
}

// --- Modules CRUD ---

export async function getModules(courseId: string): Promise<Module[]> {
    const modulesRef = collection(db, "modules");
    const q = query(modulesRef, where("courseId", "==", courseId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Module)).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function addModule(courseId: string, moduleData: Partial<Module>): Promise<string> {
    const newModuleRef = doc(collection(db, "modules"));
    const id = newModuleRef.id;
    
    // Obtenir le prochain order
    const existingModules = await getModules(courseId);
    const nextOrder = existingModules.length + 1;

    const newModule: Module = {
        id,
        courseId,
        title: moduleData.title || "Nouvo Modil",
        description: moduleData.description || "",
        order: nextOrder,
        lessonsCount: 0,
        duration: "0 min",
        lessons: [],
        createdAt: new Date().toISOString()
    };
    
    await setDoc(newModuleRef, newModule);
    return id;
}

export async function updateModule(courseId: string, moduleId: string, moduleData: Partial<Module>): Promise<void> {
    const docRef = doc(db, "modules", moduleId);
    await updateDoc(docRef, { ...moduleData });
}

export async function deleteModule(courseId: string, moduleId: string): Promise<void> {
    const docRef = doc(db, "modules", moduleId);
    await deleteDoc(docRef);
}

export async function updateModuleLessons(courseId: string, moduleId: string, lessons: Lesson[]): Promise<void> {
    const docRef = doc(db, "modules", moduleId);
    await updateDoc(docRef, { 
        lessons: lessons,
        lessonsCount: lessons.length
    });
}

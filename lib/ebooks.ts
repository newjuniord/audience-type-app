import { Ebook } from "./types";
import { db } from "./firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

export async function getEbooks(): Promise<Ebook[]> {
    const ebooksRef = collection(db, "ebooks");
    const snapshot = await getDocs(ebooksRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ebook));
}

export async function getEbook(ebookId: string): Promise<Ebook | null> {
    const docRef = doc(db, "ebooks", ebookId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Ebook;
    }
    return null;
}

export const getEbookById = getEbook;

export async function addEbook(ebookData: Partial<Ebook>): Promise<string> {
    const newEbookRef = doc(collection(db, "ebooks"));
    const id = newEbookRef.id;
    const newEbook: Ebook = {
        id,
        title: ebookData.title || "Nouvo Ebook",
        description: ebookData.description || "",
        price: ebookData.price || 0,
        priceHTG: ebookData.priceHTG || 0,
        sales: 0,
        status: ebookData.status || "draft",
        coverImage: ebookData.coverImage || "",
        fileUrl: ebookData.fileUrl || "",
        includedItems: ebookData.includedItems || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: ebookData.authorId || "",
        authorName: ebookData.authorName || "",
        authorImage: ebookData.authorImage || ""
    };
    await setDoc(newEbookRef, newEbook);
    return id;
}

export async function updateEbook(ebookId: string, ebookData: Partial<Ebook>): Promise<void> {
    const docRef = doc(db, "ebooks", ebookId);
    await updateDoc(docRef, {
        ...ebookData,
        updatedAt: new Date().toISOString()
    });
}

export async function deleteEbook(ebookId: string): Promise<void> {
    const docRef = doc(db, "ebooks", ebookId);
    await deleteDoc(docRef);
}

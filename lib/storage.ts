import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, Timestamp, where } from "firebase/firestore";
import { storage, db } from "./firebase";
import { StorageAsset } from "./types";

const ASSETS_COLLECTION = "assets";

/**
 * Uploads a file to Firebase Storage and saves its metadata to Firestore.
 * @param file The file to upload.
 * @param folder The folder path in storage (default: 'uploads').
 */
export async function uploadFile(file: File, folder: string = "uploads"): Promise<StorageAsset> {
    try {
        // 1. Determine Folder if not provided
        let targetFolder = folder;
        if (targetFolder === "uploads") { // Only override if default
            if (file.type.startsWith("image/")) targetFolder = "images";
            else if (file.type.startsWith("video/")) targetFolder = "videos";
            else if (file.type.includes("pdf") || file.type.includes("document") || file.type.includes("text") || file.type.includes("json")) targetFolder = "documents";
            else if (file.type.includes("zip") || file.type.includes("compressed")) targetFolder = "archives";
            else targetFolder = "others";
        }

        // 2. Upload to Storage
        const storagePath = `${targetFolder}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);

        // 2. Format Metadata
        const type = getFileType(file.type, file.name);
        const size = formatBytes(file.size);

        const newAsset: StorageAsset = {
            name: file.name,
            type: type,
            path: targetFolder + "/",
            size: size,
            sizeBytes: file.size,
            createdAt: Timestamp.now(),
            url: url,
            contentType: file.type,
        };

        // 3. Save to Firestore
        const docRef = await addDoc(collection(db, ASSETS_COLLECTION), newAsset);
        return { ...newAsset, id: docRef.id };

    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
}

/**
 * Retrieves all assets from Firestore, optionally filtered by type.
 */
export async function getAssets(filterType?: string): Promise<StorageAsset[]> {
    try {
        let q = query(collection(db, ASSETS_COLLECTION), orderBy("createdAt", "desc"));

        // Note: Client-side filtering might be better for simple categories unless we index specifically
        const snapshot = await getDocs(q);
        const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageAsset));

        if (filterType && filterType !== "All Files") {
            return assets.filter(asset => {
                if (filterType === "Images") return asset.contentType.startsWith("image/");
                if (filterType === "Videos") return asset.contentType.startsWith("video/");
                if (filterType === "Documents") return asset.contentType.includes("pdf") || asset.contentType.includes("doc") || asset.contentType.includes("txt");
                if (filterType === "Archives") return asset.contentType.includes("zip") || asset.contentType.includes("rar");
                return true;
            });
        }

        return assets;
    } catch (error) {
        console.error("Error getting assets:", error);
        return [];
    }
}

/**
 * Deletes an asset from both Storage and Firestore.
 */
export async function deleteAsset(asset: StorageAsset): Promise<void> {
    try {
        // 1. Delete from Firestore
        if (asset.id) {
            await deleteDoc(doc(db, ASSETS_COLLECTION, asset.id));
        }

        // 2. Delete from Storage (reconstruct path from URL or store distinct storage path)
        // We stored 'path' as the folder, let's try to find the full ref. 
        // Ideally we should store the full 'storagePath' in the object. 
        // For now, let's try to match by name if we constructed it securely, 
        // BUT actually getDownloadURL returns a tokenized URL. 
        // It's safer if we store the `storagePath` explicitly in the DB.
        // Let's rely on the fact we named it `${folder}/${Date.now()}_${file.name}`... 
        // Wait, we didn't store the exact storage path string in the DB object (only the folder).
        // Let's just create a reference from the URL using the storage instance.

        const fileRef = ref(storage, asset.url);
        // Note: ref(storage, url) works for gs:// urls or http urls if from the same bucket.
        await deleteObject(fileRef);

    } catch (error) {
        console.error("Error deleting asset:", error);
        throw error;
    }
}

// Helpers
function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileType(mime: string, name: string): string {
    if (mime.startsWith("image/")) return "IMG";
    if (mime.startsWith("video/")) return "VID";
    if (mime.includes("pdf")) return "PDF";
    if (mime.includes("zip") || mime.includes("compressed")) return "ZIP";
    return name.split('.').pop()?.toUpperCase() || "FILE";
}

import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, listAll, getMetadata, deleteObject } from "firebase/storage";

export interface StorageFile {
    id: string;
    name: string;
    size: number;
    url: string;
    type: string;
    createdAt: string;
}

export async function uploadFile(file: File): Promise<StorageFile> {
    const id = crypto.randomUUID();
    const fileName = `${id}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; // Clean filename
    const storageRef = ref(storage, `uploads/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    const metadata = await getMetadata(snapshot.ref);

    return {
        id: fileName,
        name: file.name,
        size: file.size,
        url: downloadURL,
        type: file.type,
        createdAt: metadata.timeCreated || new Date().toISOString()
    };
}

export async function getStorageFiles(): Promise<StorageFile[]> {
    try {
        const listRef = ref(storage, 'uploads');
        const res = await listAll(listRef);
        
        const files = await Promise.all(res.items.map(async (itemRef) => {
            try {
                const [url, metadata] = await Promise.all([
                    getDownloadURL(itemRef),
                    getMetadata(itemRef)
                ]);
                
                // Try to parse the original name by removing the UUID prefix if possible
                let originalName = itemRef.name;
                if (originalName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/)) {
                    originalName = originalName.substring(37);
                }

                return {
                    id: itemRef.name, // Using the full name as ID for deletion
                    name: originalName,
                    size: metadata.size,
                    url: url,
                    type: metadata.contentType || "application/octet-stream",
                    createdAt: metadata.timeCreated
                };
            } catch (err) {
                console.error(`Error fetching metadata for ${itemRef.name}`, err);
                return null;
            }
        }));
        
        // Filter out nulls and sort by creation date descending
        const validFiles = files.filter(f => f !== null) as StorageFile[];
        return validFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
        console.error("Error listing storage files:", err);
        return [];
    }
}

export const getAssets = getStorageFiles;

export async function deleteStorageFile(id: string): Promise<void> {
    try {
        const fileRef = ref(storage, `uploads/${id}`);
        await deleteObject(fileRef);
    } catch (err) {
        console.error(`Error deleting storage file ${id}:`, err);
        throw err;
    }
}

export const deleteAsset = deleteStorageFile;

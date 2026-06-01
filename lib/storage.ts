import { createClient } from "./supabase/client";
import { StorageAsset } from "./types";

const ASSETS_TABLE = "assets";
const BUCKET_NAME = "assets";

const getSupabase = () => createClient();

/**
 * Uploads a file to Supabase Storage and saves its metadata to Postgres.
 * @param file The file to upload.
 * @param folder The folder path in storage (default: 'uploads').
 */
export async function uploadFile(file: File, folder: string = "uploads"): Promise<StorageAsset> {
    try {
        const supabase = getSupabase();
        
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
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const storagePath = `${targetFolder}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        // 3. Format Metadata
        const type = getFileType(file.type, file.name);
        const size = formatBytes(file.size);
        const id = crypto.randomUUID();

        const newAsset: StorageAsset = {
            id,
            name: file.name,
            type: type,
            path: targetFolder + "/",
            size: size,
            sizeBytes: file.size,
            createdAt: new Date().toISOString(),
            url: publicUrl,
            contentType: file.type,
            // You can optionally save storagePath if you want to make deletion easier
        };

        // 4. Save to Database
        const { error: dbError } = await supabase
            .from(ASSETS_TABLE)
            .insert(newAsset);

        if (dbError) {
            // Revert upload if DB fails
            await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
            throw dbError;
        }

        return newAsset;

    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
}

/**
 * Retrieves all assets from Postgres, optionally filtered by type.
 */
export async function getAssets(filterType?: string): Promise<StorageAsset[]> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(ASSETS_TABLE)
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        const assets = (data || []) as StorageAsset[];

        if (filterType && filterType !== "All Files") {
            return assets.filter(asset => {
                if (!asset.contentType) return true;
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
 * Deletes an asset from both Storage and Database.
 */
export async function deleteAsset(asset: StorageAsset): Promise<void> {
    try {
        const supabase = getSupabase();
        
        // 1. Extract storage path from the public URL
        // Example URL: https://[project_ref].supabase.co/storage/v1/object/public/assets/images/123_abc.png
        // The path we need is 'images/123_abc.png'
        if (asset.url) {
            const urlParts = asset.url.split(`/public/${BUCKET_NAME}/`);
            if (urlParts.length > 1) {
                const storagePath = urlParts[1];
                const { error: storageError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([storagePath]);
                
                if (storageError) {
                    console.error("Error deleting from Supabase Storage:", storageError);
                    // Decide if we want to throw or continue to delete the DB record
                }
            }
        }

        // 2. Delete from Database
        if (asset.id) {
            const { error: dbError } = await supabase
                .from(ASSETS_TABLE)
                .delete()
                .eq('id', asset.id);
                
            if (dbError) throw dbError;
        }

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

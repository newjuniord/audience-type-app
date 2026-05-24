import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Upload a chat media file (image or voice) to Firebase Storage.
 * Path: chat-media/{userId}/{timestamp}_{filename}
 * Returns the public download URL.
 */
export async function uploadChatMedia(
    userId: string,
    file: Blob,
    filename: string
): Promise<string> {
    const timestamp = Date.now();
    const storageRef = ref(storage, `chat-media/${userId}/${timestamp}_${filename}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

/**
 * Compress an image before upload (max 800px wide, JPEG 0.7 quality).
 */
export function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement("canvas");
            const MAX_W = 800;
            let w = img.width;
            let h = img.height;
            if (w > MAX_W) {
                h = (h * MAX_W) / w;
                w = MAX_W;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas not supported"));
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
                "image/jpeg",
                0.7
            );
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
    });
}

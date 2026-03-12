import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Singleton-like pattern for caching the db instance
let dbInstance: Firestore | null = null;

/**
 * Cleans and formats a Firebase private key from environment variables.
 * Handles escaped newlines, wrapping quotes, and literal backslashes.
 */
function formatPrivateKey(key: string | undefined): string {
    if (!key) return "";
    
    let cleanedKey = key.trim();
    
    // 1. Remove wrapping quotes
    if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
        cleanedKey = cleanedKey.slice(1, -1);
    }

    // 2. Convert escaped \n characters to real newlines
    cleanedKey = cleanedKey.replace(/\\n/g, '\n');

    // 3. Remove all literal backslashes (often used for line continuation in .env)
    cleanedKey = cleanedKey.replace(/\\/g, '');

    // 4. Line-by-line normalization to remove internal whitespace in Base64 parts
    const lines = cleanedKey.split('\n');
    return lines
        .map(line => {
            const trimmed = line.trim();
            if (trimmed.includes('-----')) return trimmed; // Keep headers/footers
            return trimmed.replace(/\s+/g, ''); // Squash Base64 lines
        })
        .filter(line => line.length > 0)
        .join('\n');
}

/**
 * Gets the Firebase Admin Firestore instance.
 * Initializes the SDK if it hasn't been initialized yet.
 */
export function getAdminDb(): Firestore {
    if (dbInstance) return dbInstance;

    try {
        if (!getApps().length) {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

            if (!projectId || !clientEmail || !privateKey) {
                throw new Error("Missing Firebase Admin Credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY)");
            }

            console.log("🔑 Initializing Firebase Admin SDK...");
            initializeApp({
                credential: cert({ projectId, clientEmail, privateKey }),
            });
            console.log("✅ Firebase Admin SDK Initialized Successfully");
        }

        dbInstance = getFirestore();
        return dbInstance;
    } catch (error) {
        console.error("🔥 FIREBASE ADMIN INIT FAILED:", error);
        throw error;
    }
}

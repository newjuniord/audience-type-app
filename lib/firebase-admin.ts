import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Singleton-like pattern for caching the db instance if it's already initialized
let dbInstance: Firestore | null = null;

export function getAdminDb(): Firestore {
    if (dbInstance) {
        return dbInstance;
    }

    try {
        // Check if an app is already initialized
        if (!getApps().length) {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            // Robust private key parsing
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (privateKey) {
                // Remove wrapping quotes if present
                if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                    privateKey = privateKey.slice(1, -1);
                }
                // Handle escaped newlines
                privateKey = privateKey.replace(/\\n/g, '\n');
            }

            if (!projectId || !clientEmail || !privateKey) {
                // Return a specific error that the active route can catch and display
                throw new Error("Missing Firebase Admin Credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY)");
            }

            console.log("🔑 Initializing Firebase Admin SDK...");
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log("✅ Firebase Admin SDK Initialized Successfully");
        }

        dbInstance = getFirestore();
        return dbInstance;

    } catch (error) {
        console.error("🔥 FIREBASE ADMIN INIT FAILED:", error);
        throw error; // Re-throw to be caught by the API route
    }
}

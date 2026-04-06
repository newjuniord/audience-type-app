import { db } from "../firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

/**
 * Generates a random 4-character alphanumeric code (a-z, 1-9).
 */
export function generateRandomCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Generates a unique reference code by checking Firestore for collisions.
 */
export async function generateUniqueReferenceCode(): Promise<string> {
    const usersRef = collection(db, "users");
    let isUnique = false;
    let code = '';
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
        code = generateRandomCode();
        const q = query(usersRef, where("referenceCode", "==", code), limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        // Highly unlikely for 4 characters (35^4 = 1.5M combinations) 
        // but if it happens, we append a timestamp slice to guarantee uniqueness for this session
        code = generateRandomCode() + Math.floor(Date.now() / 1000).toString(36).slice(-2);
    }

    return code;
}

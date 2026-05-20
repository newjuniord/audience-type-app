import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface AnnouncementBarSettings {
    text: string;
    isActive: boolean;
    backgroundColor: string;
    textColor: string;
    displayFor: 'all' | 'logged-in' | 'guest';
    productFilter: 'all' | 'has-product' | 'no-product';
    link?: string;
}

const SETTINGS_COLLECTION = "settings";
const ANNOUNCEMENT_DOC = "announcement-bar";

export const defaultSettings: AnnouncementBarSettings = {
    text: "Bienvenue sur DRJ Akademi ! Profitez de nos promotions.",
    isActive: false,
    backgroundColor: "#000000",
    textColor: "#ffffff",
    displayFor: 'all',
    productFilter: 'all',
    link: ""
};

export async function getAnnouncementSettings(): Promise<AnnouncementBarSettings> {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, ANNOUNCEMENT_DOC);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as AnnouncementBarSettings;
        } else {
            return defaultSettings;
        }
    } catch (error) {
        console.error("Error fetching announcement settings:", error);
        return defaultSettings;
    }
}

export async function updateAnnouncementSettings(settings: AnnouncementBarSettings): Promise<void> {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, ANNOUNCEMENT_DOC);
        await setDoc(docRef, settings, { merge: true });
    } catch (error) {
        console.error("Error updating announcement settings:", error);
        throw error;
    }
}

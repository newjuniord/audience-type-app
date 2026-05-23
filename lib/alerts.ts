// Alerts CRUD for Firestore collection "alerts"
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    writeBatch,
    doc,
    getDocs,
    addDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Alert } from "@/lib/types";

/**
 * Subscribe to a user's alerts in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToAlerts(userId: string, callback: (alerts: Alert[]) => void) {
    const q = query(
        collection(db, "alerts"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Alert[];
        callback(alerts);
    });
}

/**
 * Mark a single alert as read.
 */
export async function markAlertAsRead(alertId: string) {
    await updateDoc(doc(db, "alerts", alertId), { isRead: true });
}

/**
 * Mark ALL alerts for a user as read (batch write).
 */
export async function markAllAlertsAsRead(userId: string) {
    const q = query(
        collection(db, "alerts"),
        where("userId", "==", userId),
        where("isRead", "==", false)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
    await batch.commit();
}

/**
 * Create a new alert (client-side, for direct creation from admin UI).
 */
export async function createAlert(data: Omit<Alert, "id" | "createdAt">): Promise<string> {
    const ref = await addDoc(collection(db, "alerts"), {
        ...data,
        isRead: false,
        createdAt: Timestamp.now(),
    });
    return ref.id;
}

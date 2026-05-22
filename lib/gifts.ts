import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp,
    increment,
    runTransaction
} from "firebase/firestore";
import { db } from "./firebase";
import { Gift } from "./types";

const COLLECTION = "gifts";

/** Récupère tous les cadeaux */
export const getGifts = async (): Promise<Gift[]> => {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Gift[];
};

/** Récupère un cadeau par ID */
export const getGift = async (id: string): Promise<Gift | null> => {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Gift;
};

/** Retourne le premier cadeau actif lié à un produit déclencheur */
export const getGiftByTriggerProduct = async (triggerProductId: string): Promise<Gift | null> => {
    const q = query(
        collection(db, COLLECTION),
        where("triggerProductId", "==", triggerProductId),
        where("isActive", "==", true)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Gift;
};

/** Crée un cadeau */
export const createGift = async (data: Omit<Gift, "id" | "createdAt" | "currentUsesCount">): Promise<string> => {
    const ref = await addDoc(collection(db, COLLECTION), {
        ...data,
        currentUsesCount: 0,
        createdAt: Timestamp.now()
    });
    return ref.id;
};

/** Met à jour un cadeau */
export const updateGift = async (id: string, data: Partial<Gift>): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), data);
};

/** Supprime un cadeau */
export const deleteGift = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, id));
};

/**
 * Réclame un cadeau pour un utilisateur.
 * Retourne :
 *  - "already_enrolled"  : l'utilisateur a déjà ce produit
 *  - "inactive"          : le cadeau est désactivé
 *  - "expired"           : cadeau expiré
 *  - "max_uses_reached"  : quota atteint
 *  - "invalid_code"      : code d'invitation invalide
 *  - "success"           : enrollment créé avec succès
 */
export type ClaimResult = 
    | "already_enrolled"
    | "inactive"
    | "expired"
    | "max_uses_reached"
    | "invalid_code"
    | "success";

export const claimGift = async (
    giftId: string,
    userId: string,
    userEmail: string,
    userName: string,
    invitationCode?: string
): Promise<ClaimResult> => {
    const giftRef = doc(db, COLLECTION, giftId);

    return await runTransaction(db, async (txn) => {
        const giftSnap = await txn.get(giftRef);
        if (!giftSnap.exists()) throw new Error("Cadeau introuvable");

        const gift = { id: giftSnap.id, ...giftSnap.data() } as Gift;

        // 1. Vérifications de base
        if (!gift.isActive) return "inactive";

        if (gift.expirationDate && gift.expirationDate.toMillis() < Date.now()) {
            return "expired";
        }

        if (gift.maxUses !== null && gift.currentUsesCount >= gift.maxUses) {
            return "max_uses_reached";
        }

        if (gift.requiresInvitation && gift.invitationCode) {
            if (!invitationCode || invitationCode.trim().toUpperCase() !== gift.invitationCode.trim().toUpperCase()) {
                return "invalid_code";
            }
        }

        // 2. Vérifier si l'utilisateur est déjà inscrit
        const enrollmentsRef = collection(db, "enrollments");
        const qString = query(enrollmentsRef, where("userId", "==", userId), where("productId", "==", gift.giftProductId));
        const existingSnap = await getDocs(qString);
        if (!existingSnap.empty) return "already_enrolled";

        // 3. Créer l'enrollment
        const enrollmentData = {
            userId,
            userEmail,
            userName,
            productId: gift.giftProductId,
            productTitle: gift.giftProductTitle,
            productType: gift.giftProductType,
            productThumbnailUrl: gift.giftProductThumbnailUrl || "",
            accessGranted: true,
            enrolledAt: Timestamp.now(),
            lastAccessedAt: Timestamp.now(),
            status: "active",
            progress: 0,
            completedLessons: [],
            currentLessonId: "",
            totalLessons: 0,
            downloadCount: "0",
            isGift: true,           // Marqueur pour distinguer des achats normaux
            giftId: giftId
        };

        const newEnrollRef = doc(collection(db, "enrollments"));
        txn.set(newEnrollRef, enrollmentData);

        // 4. Incrémenter le compteur du cadeau
        txn.update(giftRef, { currentUsesCount: increment(1) });

        // 5. Incrémenter le compteur d'enrollments de l'utilisateur
        const userRef = doc(db, "users", userId);
        txn.update(userRef, { enrollmentCount: increment(1) });

        return "success";
    });
};

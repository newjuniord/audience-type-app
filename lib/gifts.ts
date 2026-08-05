import { Gift } from "./types";
import { db } from "./firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";

export async function getGifts(): Promise<Gift[]> {
    const giftsRef = collection(db, "gifts");
    const snapshot = await getDocs(giftsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gift));
}

export async function getGift(giftId: string): Promise<Gift | null> {
    const docRef = doc(db, "gifts", giftId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Gift;
    }
    return null;
}

export async function getGiftByTriggerProduct(productId: string): Promise<Gift | null> {
    const giftsRef = collection(db, "gifts");
    const q = query(giftsRef, where("triggerProductId", "==", productId), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Gift;
    }
    return null;
}

export async function addGift(giftData: Partial<Gift>): Promise<string> {
    const newGiftRef = doc(collection(db, "gifts"));
    const id = newGiftRef.id;
    const newGift: Gift = {
        id,
        title: giftData.title || "",
        description: giftData.description || "",
        photoLink: giftData.photoLink || "",
        type: giftData.type || "ebook",
        giftProductId: giftData.giftProductId || "",
        giftProductTitle: giftData.giftProductTitle || "",
        giftProductType: giftData.giftProductType || "ebook",
        giftProductThumbnailUrl: giftData.giftProductThumbnailUrl || "",
        isActive: giftData.isActive ?? true,
        expirationDate: giftData.expirationDate || null,
        maxUses: giftData.maxUses || null,
        currentUsesCount: 0,
        requiresInvitation: giftData.requiresInvitation ?? false,
        invitationCode: giftData.invitationCode || null,
        createdAt: new Date().toISOString(),
    };
    await setDoc(newGiftRef, newGift);
    return id;
}

export const createGift = addGift;

export async function updateGift(giftId: string, giftData: Partial<Gift>): Promise<void> {
    const docRef = doc(db, "gifts", giftId);
    await updateDoc(docRef, { ...giftData });
}

export async function deleteGift(giftId: string): Promise<void> {
    const docRef = doc(db, "gifts", giftId);
    await deleteDoc(docRef);
}

export async function claimGift(giftId: string, userId: string): Promise<boolean> {
    const docRef = doc(db, "gifts", giftId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        const gift = snapshot.data() as Gift;
        if (!gift.isActive) return false;
        
        // Optionally check maxUses or expiration here
        
        await updateDoc(docRef, {
            currentUsesCount: (gift.currentUsesCount || 0) + 1
        });
        return true;
    }
    return false;
}

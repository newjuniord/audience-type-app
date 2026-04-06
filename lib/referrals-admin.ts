import { getAdminDb } from "./firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Traite le parrainage lors d'une commande réussie.
 * Vérifie si un code de référence a été utilisé et si celui-ci est valide.
 * 
 * @param orderId ID de la commande
 * @param orderData Données de la commande issues de Firestore
 */
export async function handleReferralOnOrderSuccess(orderId: string, orderData: any) {
    const { referenceCode, userId, productId, productTitle, amount, productType } = orderData;

    // Si pas de code utilisé, on ignore
    if (!referenceCode) return;

    try {
        const adminDb = getAdminDb();
        
        // 1. Valider le code de référence et trouver le parrain
        const usersRef = adminDb.collection("users");
        const referrerQuery = await usersRef.where("referenceCode", "==", referenceCode).limit(1).get();

        if (referrerQuery.empty) {
            console.log(`[REFERRAL] Code de référence invalide utilisé : ${referenceCode}. Ignoré.`);
            return;
        }

        const referrerDoc = referrerQuery.docs[0];
        const referrerRef = referrerDoc.ref;
        
        // Normalisation de l'ID utilisateur (Referee)
        const refereeId = userId?.id || userId;
        if (!refereeId) {
            console.warn(`[REFERRAL] Impossible de trouver l'ID utilisateur pour la commande ${orderId}`);
            return;
        }
        const refereeRef = adminDb.collection("users").doc(refereeId);

        // 2. Éviter l'auto-parrainage
        if (referrerRef.id === refereeRef.id) {
            console.log(`[REFERRAL] Auto-parrainage détecté pour l'utilisateur ${refereeRef.id}. Ignoré.`);
            return;
        }

        // 3. Créer le document de parrainage
        const referralsRef = adminDb.collection("referrals");
        
        // Normalisation de la référence produit
        let productRef = productId;
        if (typeof productId === "string") {
            const productCollection = productType === "course" ? "courses" : (productType === "ebook" ? "ebooks" : "services");
            productRef = adminDb.collection(productCollection).doc(productId);
        }

        await referralsRef.add({
            referrerId: referrerRef,
            refereeId: refereeRef,
            productId: productRef,
            productTitle: productTitle || "Produit inconnu",
            referenceCode: referenceCode,
            amount: amount || 0,
            status: "pending",
            createdAt: Timestamp.now(),
            orderId: orderId
        });

        console.log(`✅ [REFERRAL] Parrainage enregistré pour le code ${referenceCode} (Parrain: ${referrerRef.id}, Client: ${refereeRef.id})`);

    } catch (error) {
        console.error(`❌ [REFERRAL] Erreur lors du traitement du parrainage pour la commande ${orderId}:`, error);
    }
}

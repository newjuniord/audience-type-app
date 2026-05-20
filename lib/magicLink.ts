import { getAdminDb } from "./firebase-admin";
import { v4 as uuidv4 } from "uuid";

/**
 * Récupère ou génère un token magique permanent (non expirable) pour l'utilisateur.
 * Si le token n'existe pas encore dans Firestore, il est créé à la volée.
 */
export async function getOrCreateUserMagicToken(userId: string): Promise<string> {
  if (!userId) return "";
  
  try {
    const db = getAdminDb();
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      console.warn(`[MAGIC LINK] Utilisateur ${userId} non trouvé dans Firestore.`);
      return "";
    }
    
    const data = userSnap.data();
    if (data?.MAGIC_LINK_CLICK) {
      return data.MAGIC_LINK_CLICK;
    }
    
    // Générer un nouveau token permanent unique (sans tirets)
    const magicToken = uuidv4().replace(/-/g, '');
    await userRef.update({ MAGIC_LINK_CLICK: magicToken });
    console.log(`🔑 [MAGIC LINK] Nouveau token permanent généré pour ${userId}: ${magicToken}`);
    return magicToken;
  } catch (error) {
    console.error("Erreur lors de la génération du token magique permanent:", error);
    return "";
  }
}

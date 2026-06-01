import { supabaseAdmin } from "./supabase/admin";
import { v4 as uuidv4 } from "uuid";

/**
 * Récupère ou génère un token magique permanent (non expirable) pour l'utilisateur.
 * Si le token n'existe pas encore, il est créé à la volée.
 */
export async function getOrCreateUserMagicToken(userId: string): Promise<string> {
  if (!userId) return "";
  
  try {
    const { data: userSnap, error } = await supabaseAdmin
        .from("users")
        .select("id, MAGIC_LINK_CLICK")
        .eq("id", userId)
        .single();
    
    if (error || !userSnap) {
      console.warn(`[MAGIC LINK] Utilisateur ${userId} non trouvé dans Supabase.`);
      return "";
    }
    
    if (userSnap.MAGIC_LINK_CLICK) {
      return userSnap.MAGIC_LINK_CLICK;
    }
    
    // Générer un nouveau token permanent unique (sans tirets)
    const magicToken = uuidv4().replace(/-/g, '');
    const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ MAGIC_LINK_CLICK: magicToken })
        .eq("id", userId);
        
    if (updateError) {
        throw updateError;
    }
    
    console.log(`🔑 [MAGIC LINK] Nouveau token permanent généré pour ${userId}: ${magicToken}`);
    return magicToken;
  } catch (error) {
    console.error("Erreur lors de la génération du token magique permanent:", error);
    return "";
  }
}

import { createClient } from "./supabase/client";
import { Gift } from "./types";

const COLLECTION = "gifts";

const getSupabase = () => createClient();

/** Récupère tous les cadeaux */
export const getGifts = async (): Promise<Gift[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION)
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Gift[];
    } catch (error) {
        console.error("Erreur récup gifts:", error);
        return [];
    }
};

/** Récupère un cadeau par ID */
export const getGift = async (id: string): Promise<Gift | null> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION)
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;
        return data as Gift;
    } catch (error) {
        console.error("Erreur récup gift:", error);
        return null;
    }
};

/** Retourne le premier cadeau actif lié à un produit déclencheur */
export const getGiftByTriggerProduct = async (triggerProductId: string): Promise<Gift | null> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION)
            .select('*')
            .eq('triggerProductId', triggerProductId)
            .eq('isActive', true)
            .limit(1)
            .single();

        if (error || !data) return null;
        return data as Gift;
    } catch (error) {
        console.error("Erreur récup gift by trigger:", error);
        return null;
    }
};

/** Crée un cadeau */
export const createGift = async (data: Omit<Gift, "id" | "createdAt" | "currentUsesCount">): Promise<string> => {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newGift = {
            ...data,
            id,
            currentUsesCount: 0,
            createdAt: new Date().toISOString()
        };

        const { error } = await supabase.from(COLLECTION).insert(newGift);
        if (error) throw error;
        return id;
    } catch (error) {
        console.error("Erreur création gift:", error);
        throw error;
    }
};

/** Met à jour un cadeau */
export const updateGift = async (id: string, data: Partial<Gift>): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase.from(COLLECTION).update(data).eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error("Erreur maj gift:", error);
        throw error;
    }
};

/** Supprime un cadeau */
export const deleteGift = async (id: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase.from(COLLECTION).delete().eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error("Erreur suppression gift:", error);
        throw error;
    }
};

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
    try {
        const supabase = getSupabase();

        // 1. Fetch gift
        const { data: giftData, error: giftError } = await supabase.from(COLLECTION).select('*').eq('id', giftId).single();
        if (giftError || !giftData) throw new Error("Cadeau introuvable");
        const gift = giftData as Gift;

        // 2. Vérifications de base
        if (!gift.isActive) return "inactive";

        // Expiration check (assuming string ISO date)
        if (gift.expirationDate && new Date(gift.expirationDate).getTime() < Date.now()) {
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

        // 3. Vérifier si l'utilisateur est déjà inscrit
        const { data: existingEnrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('userId', userId)
            .eq('productId', gift.giftProductId)
            .limit(1)
            .maybeSingle();

        if (existingEnrollment) return "already_enrolled";

        // 4. Créer l'enrollment
        const enrollmentId = crypto.randomUUID();
        const enrollmentData = {
            id: enrollmentId,
            userId,
            userEmail,
            userName,
            productId: gift.giftProductId,
            productTitle: gift.giftProductTitle,
            productType: gift.giftProductType,
            productThumbnailUrl: gift.giftProductThumbnailUrl || "",
            accessGranted: true,
            enrolledAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
            status: "active",
            progress: 0,
            completedLessons: [],
            currentLessonId: "",
            totalLessons: 0,
            downloadCount: "0",
            isGift: true,
            giftId: giftId
        };

        const { error: enrollError } = await supabase.from('enrollments').insert(enrollmentData);
        if (enrollError) {
            console.error("Error creating enrollment:", enrollError);
            throw enrollError;
        }

        // 5. Incrémenter le compteur du cadeau
        await supabase
            .from(COLLECTION)
            .update({ currentUsesCount: gift.currentUsesCount + 1 })
            .eq('id', giftId);

        // 6. Incrémenter le compteur d'enrollments de l'utilisateur
        const { data: user } = await supabase.from('users').select('enrollmentCount').eq('id', userId).single();
        if (user) {
            await supabase
                .from('users')
                .update({ enrollmentCount: (user.enrollmentCount || 0) + 1 })
                .eq('id', userId);
        }

        return "success";
    } catch (error) {
        console.error("Erreur claimGift:", error);
        throw error;
    }
};

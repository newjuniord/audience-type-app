import { createClient } from "./supabase/client";
import { Enrollment } from "./types";

const COLLECTION_NAME = "enrollments";

const getSupabase = () => createClient();

/**
 * Récupère toutes les inscriptions.
 */
export const getEnrollments = async (): Promise<Enrollment[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .order('enrolledAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Enrollment[];
    } catch (error) {
        console.error("Erreur récup enrollments:", error);
        throw error;
    }
};

/**
 * Récupère les inscriptions d'un utilisateur.
 */
export const getEnrollmentsByUser = async (userId: string): Promise<Enrollment[]> => {
    try {
        console.log("🔍 Fetching enrollments for UID:", userId);
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('userId', userId)
            .order('enrolledAt', { ascending: false });

        if (error) {
            console.error("Erreur Supabase:", error.message);
            throw error;
        }
        
        return (data || []) as Enrollment[];
    } catch (error) {
        console.error("Erreur récup enrollments par user:", error);
        return [];
    }
};

/**
 * Helper: Increments or decrements user enrollment count
 */
const updateEnrollmentCount = async (userId: string, amount: number) => {
    const supabase = getSupabase();
    try {
        const { data: user } = await supabase.from('users').select('enrollmentCount').eq('id', userId).single();
        if (user) {
            const currentCount = user.enrollmentCount || 0;
            await supabase.from('users').update({ enrollmentCount: currentCount + amount }).eq('id', userId);
        }
    } catch (err) {
        console.error("Erreur update enrollmentCount:", err);
    }
};

/**
 * Ajoute une nouvelle inscription.
 */
export const createEnrollment = async (data: Omit<Enrollment, "id">): Promise<string> => {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newEnrollment = {
            ...data,
            id,
            enrolledAt: data.enrolledAt || new Date().toISOString(),
            lastAccessedAt: data.lastAccessedAt || new Date().toISOString()
        };

        const { error } = await supabase
            .from(COLLECTION_NAME)
            .insert(newEnrollment);

        if (error) throw error;

        // Mettre à jour le compteur global de l'utilisateur
        if (data.userId) {
            await updateEnrollmentCount(data.userId, 1);
        }

        return id;
    } catch (error) {
        console.error("Erreur ajout enrollment:", error);
        throw error;
    }
};

/**
 * Met à jour la progression d'une inscription.
 */
export const updateEnrollmentProgress = async (
    id: string,
    completedLessons: string[],
    currentLessonId: string,
    progress: number
): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update({
                completedLessons,
                currentLessonId,
                progress,
                lastAccessedAt: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur maj enrollment progress:", error);
        throw error;
    }
};

/**
 * Incrémente le compteur de téléchargements d'une inscription (ebook).
 */
export const incrementEnrollmentDownloadCount = async (id: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { data: enrollment } = await supabase
            .from(COLLECTION_NAME)
            .select('downloadCount')
            .eq('id', id)
            .single();

        if (enrollment) {
            const currentCount = parseInt(enrollment.downloadCount || "0");
            await supabase
                .from(COLLECTION_NAME)
                .update({
                    downloadCount: (currentCount + 1).toString(),
                    lastAccessedAt: new Date().toISOString()
                })
                .eq('id', id);
        }
    } catch (error) {
        console.error("Erreur increment download count:", error);
        throw error;
    }
};

/**
 * Supprime une inscription (retrait d'accès).
 */
export const deleteEnrollment = async (id: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        
        // Fetch to get userId before delete
        const { data: enrollment } = await supabase.from(COLLECTION_NAME).select('userId').eq('id', id).single();
        
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Mettre à jour le compteur global de l'utilisateur
        if (enrollment && enrollment.userId) {
            await updateEnrollmentCount(enrollment.userId, -1);
        }
    } catch (error) {
        console.error("Erreur suppression enrollment:", error);
        throw error;
    }
};

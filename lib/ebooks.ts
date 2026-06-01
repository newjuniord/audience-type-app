import { createClient } from "./supabase/client";
import { Ebook } from "./types";

const COLLECTION_NAME = "ebooks";

const getSupabase = () => createClient();

/**
 * Récupère tous les ebooks de la table 'ebooks'.
 */
export const getEbooks = async (): Promise<Ebook[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Ebook[];
    } catch (error) {
        console.error("Erreur lors de la récupération des ebooks:", error);
        throw error;
    }
};

/**
 * Récupère un ebook spécifique par son ID.
 */
export const getEbookById = async (id: string): Promise<Ebook | null> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.log("Aucun ebook trouvé avec cet ID ou erreur :", error);
            return null;
        }
        
        return data as Ebook;
    } catch (error) {
        console.error("Erreur lors de la récupération de l'ebook:", error);
        throw error;
    }
};

/**
 * Ajoute un nouvel ebook à la table.
 */
export const addEbook = async (ebookData: Omit<Ebook, "id">): Promise<string> => {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newEbook = {
            ...ebookData,
            id,
            createdAt: ebookData.createdAt || new Date().toISOString(),
            updatedAt: ebookData.updatedAt || new Date().toISOString()
        };

        const { error } = await supabase
            .from(COLLECTION_NAME)
            .insert(newEbook);

        if (error) throw error;

        console.log("Ebook ajouté avec l'ID: ", id);
        return id;
    } catch (error) {
        console.error("Erreur lors de l'ajout de l'ebook:", error);
        throw error;
    }
};

/**
 * Met à jour un ebook existant.
 */
export const updateEbook = async (id: string, data: Partial<Ebook>): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update({
                ...data,
                updatedAt: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        console.log("Ebook mis à jour avec succès");
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'ebook:", error);
        throw error;
    }
};

/**
 * Supprime un ebook de la table.
 */
export const deleteEbook = async (id: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
        console.log("Ebook supprimé avec succès");
    } catch (error) {
        console.error("Erreur lors de la suppression de l'ebook:", error);
        throw error;
    }
};

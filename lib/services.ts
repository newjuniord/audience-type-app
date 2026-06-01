import { createClient } from "./supabase/client";
import { Service } from "./types";

const COLLECTION_NAME = "services";

const getSupabase = () => createClient();

/**
 * Récupère tous les services (offres).
 */
export const getServices = async (): Promise<Service[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Service[];
    } catch (error) {
        console.error("Erreur récup services:", error);
        throw error;
    }
};

/**
 * Récupère un service par son ID.
 */
export const getServiceById = async (id: string): Promise<Service | null> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.log("Erreur récup service par ID ou non trouvé:", error);
            return null;
        }
        return data as Service;
    } catch (error) {
        console.error("Erreur récup service par ID:", error);
        return null;
    }
};

/**
 * Ajoute un nouveau service.
 */
export const addService = async (data: Omit<Service, "id" | "createdAt" | "updatedAt">): Promise<string> => {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newService = {
            ...data,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const { error } = await supabase
            .from(COLLECTION_NAME)
            .insert(newService);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error("Erreur ajout service:", error);
        throw error;
    }
};

/**
 * Met à jour un service existant.
 */
export const updateService = async (id: string, data: Partial<Service>): Promise<void> => {
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
    } catch (error) {
        console.error("Erreur maj service:", error);
        throw error;
    }
};

/**
 * Supprime un service.
 */
export const deleteService = async (id: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur suppression service:", error);
        throw error;
    }
};

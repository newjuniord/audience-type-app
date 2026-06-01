import { createClient } from "./supabase/client";
import { BookingApplication } from "./types";

const COLLECTION_NAME = "bookingApplications";

const getSupabase = () => createClient();

/**
 * Crée une nouvelle demande de réservation (Application).
 */
export const createBookingApplication = async (data: Omit<BookingApplication, "id">): Promise<string> => {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newApp = {
            ...data,
            id,
            createdAt: data.createdAt || new Date().toISOString()
        };

        const { error } = await supabase
            .from(COLLECTION_NAME)
            .insert(newApp);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error("Erreur création booking application:", error);
        throw error;
    }
};

/**
 * Récupère les demandes de réservation d'un utilisateur.
 */
export const getBookingApplicationsByUser = async (userId: string): Promise<BookingApplication[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('usersId', userId)
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as BookingApplication[];
    } catch (error) {
        console.error("Erreur récupération booking applications:", error);
        return [];
    }
};

/**
 * Récupère toutes les demandes de réservation (Admin).
 */
export const getBookingApplications = async (): Promise<BookingApplication[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as BookingApplication[];
    } catch (error) {
        console.error("Erreur récupération all booking applications:", error);
        return [];
    }
};

/**
 * Met à jour le statut d'une demande.
 */
export const updateBookingApplicationStatus = async (id: string, status: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur update status:", error);
        throw error;
    }
};

/**
 * Supprime une demande.
 */
export const deleteBookingApplication = async (id: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur suppression application:", error);
        throw error;
    }
};

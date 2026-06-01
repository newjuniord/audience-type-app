import { createClient } from "./supabase/client";
import { Booking } from "./types";

const COLLECTION_NAME = "bookings";

const getSupabase = () => createClient();

/**
 * Récupère toutes les réservations.
 * 
 * @returns {Promise<Booking[]>} Une liste de réservations.
 */
export const getBookings = async (): Promise<Booking[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Booking[];
    } catch (error) {
        console.error("Erreur récup bookings:", error);
        throw error;
    }
};

/**
 * Récupère une réservation spécifique.
 * 
 * @param {string} id - ID de la réservation.
 */
export const getBookingById = async (id: string): Promise<Booking | null> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.log("Erreur récup booking par ID ou non trouvé:", error);
            return null;
        }
        return data as Booking;
    } catch (error) {
        console.error("Erreur récup booking:", error);
        throw error;
    }
};

/**
 * Ajoute une nouvelle réservation.
 * 
 * @param {Omit<Booking, "id">} bookingData - Données de la réservation.
 */
export const addBooking = async (bookingData: Omit<Booking, "id">): Promise<string> => {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newBooking = {
            ...bookingData,
            id,
            createdAt: bookingData.createdAt || new Date().toISOString()
        };

        const { error } = await supabase
            .from(COLLECTION_NAME)
            .insert(newBooking);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error("Erreur ajout booking:", error);
        throw error;
    }
};

/**
 * Met à jour une réservation.
 */
export const updateBooking = async (id: string, data: Partial<Booking>): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update(data)
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur maj booking:", error);
        throw error;
    }
};

/**
 * Supprime une réservation.
 */
export const deleteBooking = async (id: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur suppression booking:", error);
        throw error;
    }
};

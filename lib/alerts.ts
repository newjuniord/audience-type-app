import { createClient } from "./supabase/client";
import { Alert } from "./types";

const COLLECTION_NAME = "alerts";

const getSupabase = () => createClient();

/**
 * Fetch a user's alerts. (Replaces real-time subscribeToAlerts to save free tier connections)
 */
export async function fetchAlerts(userId: string): Promise<Alert[]> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Alert[];
    } catch (error) {
        console.error("Error fetching alerts:", error);
        return [];
    }
}

/**
 * Mark a single alert as read.
 */
export async function markAlertAsRead(alertId: string): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update({ isRead: true })
            .eq('id', alertId);

        if (error) throw error;
    } catch (error) {
        console.error("Error marking alert as read:", error);
        throw error;
    }
}

/**
 * Mark ALL alerts for a user as read.
 */
export async function markAllAlertsAsRead(userId: string): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update({ isRead: true })
            .eq('userId', userId)
            .eq('isRead', false);

        if (error) throw error;
    } catch (error) {
        console.error("Error marking all alerts as read:", error);
        throw error;
    }
}

/**
 * Create a new alert (client-side, for direct creation from admin UI).
 */
export async function createAlert(data: Omit<Alert, "id" | "createdAt">): Promise<string> {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newAlert = {
            ...data,
            id,
            isRead: false,
            createdAt: new Date().toISOString()
        };

        const { error } = await supabase
            .from(COLLECTION_NAME)
            .insert(newAlert);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error("Error creating alert:", error);
        throw error;
    }
}

import { createClient } from "./supabase/client";
import { Order } from "./types";

const COLLECTION_NAME = "orders";

const getSupabase = () => createClient();

/**
 * Récupère toutes les commandes.
 */
export const getOrders = async (): Promise<Order[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Order[];
    } catch (error) {
        console.error("Erreur récup orders:", error);
        throw error;
    }
};

/**
 * Récupère les commandes d'un utilisateur spécifique.
 * 
 * @param {string} userId - L'ID de l'utilisateur.
 * @param {number} limitCount - Optionnel, limite le nombre de résultats.
 */
export const getOrdersByUser = async (userId: string, limitCount?: number): Promise<Order[]> => {
    try {
        console.log("🔍 [LIB/ORDERS] Querying orders for userId:", userId);
        const supabase = getSupabase();
        let query = supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (limitCount) {
            query = query.limit(limitCount);
        }

        const { data, error } = await query;

        if (error) {
            console.error("⚠️ [LIB/ORDERS] Erreur de requête Supabase:", error.message);
            throw error;
        }

        console.log(`🔍 [LIB/ORDERS] Found ${data?.length || 0} orders for user.`);
        return (data || []) as Order[];
    } catch (error) {
        console.error("❌ [LIB/ORDERS] Critical error in getOrdersByUser:", error);
        throw error;
    }
};

/**
 * Crée une nouvelle commande.
 */
export const createOrder = async (orderData: Omit<Order, "id">): Promise<string> => {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newOrder = {
            ...orderData,
            id,
            createdAt: orderData.createdAt || new Date().toISOString()
        };

        const { error } = await supabase
            .from(COLLECTION_NAME)
            .insert(newOrder);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error("Erreur ajout order:", error);
        throw error;
    }
};

/**
 * Met à jour le statut d'une commande.
 */
export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur maj order status:", error);
        throw error;
    }
};

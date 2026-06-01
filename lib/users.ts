import { createClient } from "./supabase/client";
import { User } from "./types";

const COLLECTION_NAME = "users";

const getSupabase = () => createClient();

/**
 * Récupère les utilisateurs avec pagination.
 * @param pageSize Nombre d'utilisateurs à charger
 * @param page Numéro de la page (commence à 1)
 * @returns Liste des utilisateurs et s'il y en a plus
 */
export async function getUsers(pageSize: number = 20, page: number = 1): Promise<{ users: User[], hasMore: boolean }> {
    try {
        const supabase = getSupabase();
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
            .from(COLLECTION_NAME)
            .select('*', { count: 'exact' })
            .order('createdAt', { ascending: false })
            .range(from, to);

        if (error) throw error;
        
        return {
            users: (data || []) as User[],
            hasMore: count !== null && to < count - 1
        };
    } catch (error) {
        console.error("Error fetching users:", error);
        return { users: [], hasMore: false };
    }
}

/**
 * Récupère un utilisateur par son ID.
 */
export async function getUserById(uid: string): Promise<User | null> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COLLECTION_NAME)
            .select('*')
            .eq('id', uid)
            .single();

        if (error) {
            console.log("Aucun utilisateur trouvé ou erreur:", error);
            return null;
        }
        
        // Supabase stores user id as 'id', but old code used 'uid'. Let's ensure 'uid' is mapped if needed
        const user = data as any;
        if (user.id && !user.uid) {
            user.uid = user.id;
        }
        
        return user as User;
    } catch (error) {
        console.error(`Error fetching user ${uid}:`, error);
        return null;
    }
}

/**
 * Met à jour le rôle d'un utilisateur.
 * @param uid ID de l'utilisateur
 * @param role Nouveau rôle ('admin' | 'customer')
 */
export async function updateUserRole(uid: string, role: 'admin' | 'customer'): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update({ role })
            .eq('id', uid);
            
        if (error) throw error;
    } catch (error) {
        console.error(`Error updating role for user ${uid}:`, error);
        throw error;
    }
}

/**
 * Met à jour les informations d'un utilisateur.
 * @param uid ID de l'utilisateur
 * @param data Données à mettre à jour
 */
export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .update(data)
            .eq('id', uid);
            
        if (error) throw error;
    } catch (error) {
        console.error(`Error updating user ${uid}:`, error);
        throw error;
    }
}

/**
 * Supprime un document utilisateur de Postgres.
 * Note: Cela ne supprime pas le compte d'authentification (nécessite Admin SDK).
 */
export async function deleteUserDocument(uid: string): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COLLECTION_NAME)
            .delete()
            .eq('id', uid);
            
        if (error) throw error;
    } catch (error) {
        console.error(`Error deleting user document ${uid}:`, error);
        throw error;
    }
}

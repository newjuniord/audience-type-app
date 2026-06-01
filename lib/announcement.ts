import { createClient } from "./supabase/client";

export interface AnnouncementBarSettings {
    text: string;
    isActive: boolean;
    backgroundColor: string;
    textColor: string;
    displayFor: 'all' | 'logged-in' | 'guest';
    productFilter: 'all' | 'has-product' | 'no-product';
    link?: string;
}

const SETTINGS_COLLECTION = "settings";
const ANNOUNCEMENT_DOC = "announcement-bar";

export const defaultSettings: AnnouncementBarSettings = {
    text: "Bienvenue sur DJR Akademi ! Profitez de nos promotions.",
    isActive: false,
    backgroundColor: "#000000",
    textColor: "#ffffff",
    displayFor: 'all',
    productFilter: 'all',
    link: ""
};

const getSupabase = () => createClient();

export async function getAnnouncementSettings(): Promise<AnnouncementBarSettings> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(SETTINGS_COLLECTION)
            .select('value')
            .eq('id', ANNOUNCEMENT_DOC)
            .single();

        if (error || !data) {
            return defaultSettings;
        }

        return data.value as AnnouncementBarSettings;
    } catch (error) {
        console.error("Error fetching announcement settings:", error);
        return defaultSettings;
    }
}

export async function updateAnnouncementSettings(settings: AnnouncementBarSettings): Promise<void> {
    try {
        const supabase = getSupabase();
        
        // Use upsert to handle both insert and update
        const { error } = await supabase
            .from(SETTINGS_COLLECTION)
            .upsert({ 
                id: ANNOUNCEMENT_DOC, 
                value: settings 
            }, { onConflict: 'id' });

        if (error) throw error;
    } catch (error) {
        console.error("Error updating announcement settings:", error);
        throw error;
    }
}

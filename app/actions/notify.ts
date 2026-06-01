"use server";

import { sendSmsMessage, formatMessageTemplate } from "@/lib/whatsapp";
import { v4 as uuidv4 } from "uuid";
import { getOrCreateUserMagicToken } from "@/lib/magicLink";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function sendGiftNotification(
    userId: string,
    phone: string,
    userName: string,
    productName: string
) {
    if (!phone) return { success: false, error: "Aucun numéro de téléphone fourni." };
    if (!userId) return { success: false, error: "userId manquant." };
    
    try {
        // 1. Check if user already has an active (unused) temp link
        const { data: existingLinks, error: fetchError } = await supabaseAdmin
            .from("temp_links")
            .select("*")
            .eq("userId", userId)
            .eq("used", false)
            .limit(1);

        let token = "";
        let code = "";

        if (!existingLinks || existingLinks.length === 0) {
            token = uuidv4();
            code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
            
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 100);

            // Store in temp_links table
            const { error: insertError } = await supabaseAdmin.from("temp_links").insert({
                id: token,
                userId: userId,
                code: code,
                expiresAt: expiresAt.toISOString(),
                used: false,
                createdAt: new Date().toISOString()
            });
            
            if (insertError) throw insertError;
        } else {
            const existingDoc = existingLinks[0];
            token = existingDoc.id;
            code = existingDoc.code;
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://audiencetype.com";
        const link = `${baseUrl}/login/temp?token=${token}`;

        const magicToken = await getOrCreateUserMagicToken(userId);
        const magicLink = `${baseUrl}/login/magic?token=${magicToken}`;

        const productTemplate = process.env.TWILIO_TEMPLATE_PRODUCT || 
            "Bonjour, votre commande est prête. Utilisez ce code *{{code}}* pour avoir accès. - Connecte-toi ici : {{link}}";

        const message = formatMessageTemplate(productTemplate, { code, link: magicLink, userName, productName });
        
        await sendSmsMessage(phone, message);
        
        return { success: true };
    } catch (error: any) {
        console.error("Erreur d'envoi de la notification cadeau:", error);
        return { success: false, error: error.message };
    }
}

export async function generateAdminTempLink(userId: string) {
    if (!userId) return { success: false, error: "userId manquant." };
    
    try {
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Expire dans 24h

        const { error: insertError } = await supabaseAdmin.from("temp_links").insert({
            id: token,
            userId: userId,
            expiresAt: expiresAt.toISOString(),
            used: false,
            createdAt: new Date().toISOString()
        });
        
        if (insertError) throw insertError;

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://audiencetype.com";
        const link = `${baseUrl}/login/temp?token=${token}`;

        return { success: true, link };
    } catch (error: any) {
        console.error("Erreur lors de la génération de lien temporaire :", error);
        return { success: false, error: error.message };
    }
}

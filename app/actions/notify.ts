"use server";

import { sendWhatsAppMessage, formatMessageTemplate } from "@/lib/whatsapp";
import { getAdminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";

export async function sendGiftNotification(
    userId: string,
    phone: string,
    userName: string,
    productName: string
) {
    if (!phone) return { success: false, error: "Aucun numéro de téléphone fourni." };
    if (!userId) return { success: false, error: "userId manquant." };
    
    try {
        const adminDb = getAdminDb();

        // 1. Check if user already has an active (unused) temp link
        const existingLinks = await adminDb.collection("temp_links")
            .where("userId", "==", userId)
            .where("used", "==", false)
            .limit(1)
            .get();

        let token = "";
        let code = "";

        if (existingLinks.empty) {
            token = uuidv4();
            code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
            
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 100);

            // Store in temp_links collection
            await adminDb.collection("temp_links").doc(token).set({
                userId: userId,
                code: code,
                expiresAt: Timestamp.fromDate(expiresAt),
                used: false,
                createdAt: Timestamp.now()
            });
        } else {
            const existingDoc = existingLinks.docs[0];
            token = existingDoc.id;
            code = existingDoc.data().code;
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://audiencetype.com";
        const link = `${baseUrl}/login/temp?token=${token}`;

        const productTemplate = process.env.TWILIO_TEMPLATE_PRODUCT || 
            "Bonjour, votre commande est prête. Utilisez ce code *{{code}}* pour avoir accès. - Connecte-toi ici : {{link}}";

        const message = formatMessageTemplate(productTemplate, { code, link, userName, productName });
        
        const productTemplateSid = process.env.TWILIO_TEMPLATE_PRODUCT_SID || process.env.TWILIO_GIFT_CONTENT_SID;
        if (productTemplateSid) {
            // Send using Content API (Buttons)
            await sendWhatsAppMessage(phone, "", productTemplateSid, {
                "1": code,
                "2": token,
                "3": link.replace(/^https?:\/\//, ''),
                "4": productName,
                "5": userName
            });
        } else {
            // Send standard text fallback
            await sendWhatsAppMessage(phone, message);
        }
        return { success: true };
    } catch (error: any) {
        console.error("Erreur d'envoi de la notification cadeau:", error);
        return { success: false, error: error.message };
    }
}

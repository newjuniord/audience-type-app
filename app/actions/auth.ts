"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Envoie un SMS de vérification via Prelude pour lier un numéro de téléphone à un utilisateur.
 */
export async function sendPreludeVerificationAction(userId: string, fullPhone: string) {
    if (!userId || !fullPhone) {
        return { error: "Paramètres manquants." };
    }

    try {
        const contactClean = fullPhone.replace(/^whatsapp:/i, '').trim();

        // 1. Vérifier si le numéro n'est pas déjà associé à un autre utilisateur
        const { data: duplicatePhone } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("phone", contactClean)
            .neq("id", userId)
            .limit(1);

        const { data: duplicatePhoneNum } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("phoneNumber", contactClean)
            .neq("id", userId)
            .limit(1);

        if ((duplicatePhone && duplicatePhone.length > 0) || (duplicatePhoneNum && duplicatePhoneNum.length > 0)) {
            return { error: "Nimewo sa a deja itilize pa yon lòt kont." };
        }

        // 2. Envoyer la demande de vérification via Prelude API
        const preludeApiKey = process.env.PRELUDE_API_KEY;
        if (!preludeApiKey) {
            console.error("PRELUDE_API_KEY is missing from environment variables.");
            return { error: "Erreur: Konfigirasyon Prelude la pa kòrèk sou sèvè a." };
        }

        const response = await fetch("https://api.prelude.dev/v2/verification", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${preludeApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                target: {
                    type: "phone_number",
                    value: contactClean
                },
                options: {
                    preferred_channel: "sms"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ [Prelude API Error] Status:", response.status, "Body:", errorText);
            return { error: `Erè nan voye SMS la. (API Error: ${response.status}).` };
        }

        const resData = await response.json();
        if (resData.status === "success" || resData.status === "retry") {
            return { success: true };
        } else {
            return { error: `Erè nan voye SMS la (Status: ${resData.status}).` };
        }
    } catch (error: any) {
        console.error("Error in sendPreludeVerificationAction:", error);
        return { error: error.message || "Erreur lors de l'envoi du SMS." };
    }
}

/**
 * Vérifie le code de vérification SMS Prelude et lie le numéro au compte utilisateur.
 */
export async function verifyPreludeAndLinkPhoneAction(userId: string, fullPhone: string, code: string) {
    if (!userId || !fullPhone || !code) {
        return { error: "Paramètres manquants." };
    }

    try {
        const contactClean = fullPhone.replace(/^whatsapp:/i, '').trim();

        // 1. Appeler l'API Prelude pour valider le code
        const preludeApiKey = process.env.PRELUDE_API_KEY;
        if (!preludeApiKey) {
            console.error("PRELUDE_API_KEY is missing from environment variables.");
            return { error: "Erreur: Konfigirasyon Prelude la pa kòrèk sou sèvè a." };
        }

        const response = await fetch("https://api.prelude.dev/v2/verification/check", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${preludeApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                target: {
                    type: "phone_number",
                    value: contactClean
                },
                code: code.trim()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ [Prelude Check Error] Status:", response.status, "Body:", errorText);
            return { error: "Kòd la ekspire oswa li pa korèk." };
        }

        const resData = await response.json();
        if (resData.status !== "success") {
            return { error: "Kòd la ekspire oswa li pa korèk." };
        }

        // 2. Vérifier à nouveau si le numéro n'a pas été associé entre-temps à un autre utilisateur
        const { data: duplicatePhone } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("phone", contactClean)
            .neq("id", userId)
            .limit(1);

        const { data: duplicatePhoneNum } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("phoneNumber", contactClean)
            .neq("id", userId)
            .limit(1);

        if ((duplicatePhone && duplicatePhone.length > 0) || (duplicatePhoneNum && duplicatePhoneNum.length > 0)) {
            return { error: "Nimewo sa a deja itilize pa yon lòt kont." };
        }

        // 3. Mettre à jour l'utilisateur dans Supabase
        const { error: updateError } = await supabaseAdmin
            .from("users")
            .update({
                phone: contactClean,
                phoneNumber: contactClean
            })
            .eq("id", userId);
            
        if (updateError) throw updateError;

        return { success: true };
    } catch (error: any) {
        console.error("Error in verifyPreludeAndLinkPhoneAction:", error);
        return { error: error.message || "Erreur de serveur lors de la validation." };
    }
}


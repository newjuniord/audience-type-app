"use server";

export async function sendGiftNotification(
    userId: string,
    phone: string,
    userName: string,
    productName: string
) {
    if (!phone) return { success: false, error: "Aucun numéro de téléphone fourni." };
    if (!userId) return { success: false, error: "userId manquant." };
    return { success: true };
}

export async function generateAdminTempLink(userId: string) {
    if (!userId) return { success: false, error: "userId manquant." };
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://djrakademi.net";
    const link = `${baseUrl}/login/temp?token=${crypto.randomUUID()}`;
    return { success: true, link };
}

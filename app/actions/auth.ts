"use server";

export async function sendPreludeVerificationAction(userId: string, fullPhone: string) {
    if (!userId || !fullPhone) {
        return { error: "Paramètres manquants." };
    }
    return { success: true };
}

export async function verifyPreludeAndLinkPhoneAction(userId: string, fullPhone: string, code: string) {
    if (!userId || !fullPhone || !code) {
        return { error: "Paramètres manquants." };
    }
    return { success: true };
}

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
    try {
        const { userId, whatsappNumber, contactMethod, email } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: "userId manquant" }, { status: 400 });
        }

        const adminDb = getAdminDb();

        // 1. Vérifier si l'utilisateur existe
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
        }

        // 2. Générer le token UUID et un code à 6 chiffres
        const token = uuidv4();
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Le lien n'expire pas (validité de 100 ans) et est à usage unique
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);

        const tempLinkData = {
            userId: userId,
            code: code,
            expiresAt: Timestamp.fromDate(expiresAt),
            used: false,
            createdAt: Timestamp.now()
        };

        // 3. Sauvegarder dans la collection temp_links
        await adminDb.collection("temp_links").doc(token).set(tempLinkData);

        const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "audiencetype.com";
        const protocol = host.includes("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}`;
        const link = `${baseUrl}/login/temp?token=${token}`;

        // 4. Envoyer le code de vérification et le lien sécurisé par WhatsApp via Twilio si c'est par téléphone
        const finalPhone = whatsappNumber || userDoc.data()?.whatsappNumber;
        if (contactMethod === 'phone' && finalPhone) {
            const message = `🔑 *VÉRIFICATION AUDIENCETYPE*\n\nVoici ton code de vérification pour accéder à ton cours : *${code}*\n\nTu peux également te connecter directement en cliquant sur ce lien sécurisé : ${link}\n\nNe partage jamais ce code.`;
            try {
                await sendWhatsAppMessage(finalPhone, message);
                console.log(`📩 [WHATSAPP] Code de vérification envoyé à ${finalPhone}`);
            } catch (err) {
                console.error("Erreur lors de l'envoi du message WhatsApp Twilio:", err);
            }
        } else if (contactMethod === 'email') {
            // Optionnel : si le contact est par e-mail, on peut lui envoyer le code, 
            // mais l'e-mail standard Firebase Link est déjà envoyé par le client.
            console.log(`📩 [EMAIL] Code de vérification généré pour ${email || userDoc.data()?.email} : ${code}`);
        }

        // ⚠️ TRÈS IMPORTANT pour la sécurité : on ne renvoie PAS le token, le code ou le lien au navigateur de l'utilisateur !
        // L'utilisateur doit saisir le code reçu par WhatsApp/Email pour déverrouiller l'accès.
        return NextResponse.json({ success: true, userId });
    } catch (error: any) {
        console.error("Error generating anonymous temp link:", error);
        return NextResponse.json({ error: "Erreur lors de la génération du lien" }, { status: 500 });
    }
}

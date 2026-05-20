import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";
import { sendWhatsAppMessage, sendSmsMessage, formatMessageTemplate } from "@/lib/whatsapp";
import { upstashSession, upstashSpamShield } from "@/lib/upstashAuth";

export async function POST(req: Request) {
    try {
        const { userId, whatsappNumber, contactMethod, email, channel } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: "userId manquant" }, { status: 400 });
        }

        const adminDb = getAdminDb();

        // 1. Vérifier si l'utilisateur existe
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
        }

        const finalPhone = whatsappNumber || userDoc.data()?.whatsappNumber || userDoc.data()?.smsNumber;
        const type = channel || 'whatsapp'; // 'whatsapp' ou 'sms'

        // 2. Si c'est par téléphone, vérifier le bouclier anti-spam et la session de 20 heures
        if (contactMethod === 'phone' && finalPhone) {
            // A. Anti-spam check
            const spamCheck = await upstashSpamShield.checkAndIncrement(finalPhone, type);
            if (spamCheck.isBlocked) {
                return NextResponse.json({ 
                    error: `Trop de tentatives de connexion par ${type === 'whatsapp' ? 'WhatsApp' : 'SMS'}. Veuillez réessayer dans 24 heures.`,
                    isBlocked: true 
                }, { status: 429 });
            }

            // B. WhatsApp 20-hour session check
            if (type === 'whatsapp') {
                const isSessionActive = await upstashSession.checkActive(finalPhone, 'whatsapp');
                if (!isSessionActive) {
                    return NextResponse.json({ 
                        error: "La session de communication WhatsApp a expiré ou n'est pas ouverte. Veuillez envoyer 'metem' sur WhatsApp pour l'ouvrir.",
                        isSessionInactive: true 
                    }, { status: 403 });
                }
            }
        }

        // 3. Générer le token UUID et un code à 4 chiffres
        const token = uuidv4();
        const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 chiffres

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

        // 4. Sauvegarder dans la collection temp_links
        await adminDb.collection("temp_links").doc(token).set(tempLinkData);

        const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "audiencetype.com";
        const protocol = host.includes("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}`;
        const link = `${baseUrl}/login/temp?token=${token}`;

        // Formater le code sans espace
        const formattedCode = `*${code}*`;
        const rawFormattedCode = `${code}`;

        const authTemplate = process.env.TWILIO_TEMPLATE_AUTH || 
            "🔑 *VÉRIFICATION DRJ AKADEMI*\n\nVoici ton code de vérification pour accéder à ton cours : {{code}}\n\nTu peux également te connecter directement en cliquant sur ce lien sécurisé : {{link}}\n\nNe partage jamais ce code.";

        // 5. Envoyer le code
        if (contactMethod === 'phone' && finalPhone) {
            const userName = userDoc.data()?.name || "Client";
            const authTemplateSid = process.env.TWILIO_TEMPLATE_AUTH_SID;

            if (type === 'whatsapp') {
                try {
                    if (authTemplateSid) {
                        // Utiliser le template Twilio Content
                        await sendWhatsAppMessage(finalPhone, "", authTemplateSid, {
                            "1": code,
                            "2": token,
                            "3": link,
                            "4": userName
                        });
                        console.log(`📩 [WHATSAPP TEMPLATE] Envoyé avec succès à ${finalPhone}`);
                    } else {
                        // Fallback text
                        const message = formatMessageTemplate(authTemplate, { code: formattedCode, link, userName });
                        await sendWhatsAppMessage(finalPhone, message);
                        console.log(`📩 [WHATSAPP TEXT] Code de vérification envoyé à ${finalPhone}`);
                    }
                } catch (err) {
                    console.error("Erreur lors de l'envoi du message WhatsApp Twilio:", err);
                }
            } else {
                // SMS
                const message = formatMessageTemplate(authTemplate, { code: rawFormattedCode, link, userName });
                try {
                    await sendSmsMessage(finalPhone, message);
                    console.log(`📩 [SMS] Code de vérification envoyé à ${finalPhone}`);
                } catch (err) {
                    console.error("Erreur lors de l'envoi du SMS Twilio:", err);
                }
            }
        } else if (contactMethod === 'email') {
            console.log(`📩 [EMAIL] Code de vérification généré pour ${email || userDoc.data()?.email} : ${code}`);
        }

        return NextResponse.json({ success: true, userId });
    } catch (error: any) {
        console.error("Error generating anonymous temp link:", error);
        return NextResponse.json({ error: "Erreur lors de la génération du lien" }, { status: 500 });
    }
}

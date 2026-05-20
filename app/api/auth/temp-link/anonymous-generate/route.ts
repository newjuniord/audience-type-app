import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";
import { sendWhatsAppMessage, sendSmsMessage, formatMessageTemplate } from "@/lib/whatsapp";
import { getOrCreateUserMagicToken } from "@/lib/magicLink";

export async function POST(req: Request) {
    try {
        const { userId, whatsappNumber, contactMethod, email, channel, turnstileToken } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: "userId manquant" }, { status: 400 });
        }

        const adminDb = getAdminDb();

        // 1. Vérifier si l'utilisateur existe
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
        }

        const finalPhone = whatsappNumber || userDoc.data()?.whatsappNumber || userDoc.data()?.smsNumber;
        const type = channel || 'whatsapp'; // 'whatsapp' ou 'sms'

        // 2. Si c'est par téléphone, valider Turnstile et appliquer les limites de taux via Firestore
        if (contactMethod === 'phone' && finalPhone) {
            // A. Validation Cloudflare Turnstile
            const turnstileSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "1x00000000000000000000000000000000";
            if (!turnstileToken) {
                return NextResponse.json({ error: "Validation de sécurité Turnstile manquante." }, { status: 400 });
            }
            
            try {
                const ip = req.headers.get("x-forwarded-for") || "";
                const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `secret=${encodeURIComponent(turnstileSecret)}&response=${encodeURIComponent(turnstileToken)}&remoteip=${encodeURIComponent(ip)}`
                });
                
                const turnstileData = await turnstileRes.json();
                if (!turnstileData.success) {
                    return NextResponse.json({ error: "Échec de la validation de sécurité Turnstile. Veuillez réessayer." }, { status: 400 });
                }
            } catch (err) {
                console.error("Turnstile verification error:", err);
                return NextResponse.json({ error: "Erreur de validation de sécurité." }, { status: 500 });
            }

            // B. Limite de taux Firestore (Spam Shield et Cooldown)
            const now = new Date();
            const userData = userDoc.data() || {};
            
            // 1. Cooldown de 60 secondes entre les requêtes
            const lastSent = userData.otpLastSentAt?.toDate();
            if (lastSent && (now.getTime() - lastSent.getTime() < 60 * 1000)) {
                return NextResponse.json({
                    error: "Veuillez patienter 60 secondes entre chaque demande de code."
                }, { status: 429 });
            }

            // 2. Limite par 24 heures (5 pour WhatsApp, 3 pour SMS)
            const firstRequest = userData.otpFirstRequestAt?.toDate();
            let otpCount = userData.otpCount24h || 0;
            let resetWindow = false;

            if (!firstRequest || (now.getTime() - firstRequest.getTime() > 24 * 60 * 60 * 1000)) {
                resetWindow = true;
                otpCount = 0;
            }

            const maxLimit = type === 'whatsapp' ? 5 : 3;
            if (otpCount >= maxLimit) {
                return NextResponse.json({
                    error: `Trop de tentatives de connexion par ${type === 'whatsapp' ? 'WhatsApp' : 'SMS'}. (Limite de ${maxLimit}/24h dépassée).`,
                    isBlocked: true
                }, { status: 429 });
            }

            // Mettre à jour les compteurs dans le document de l'utilisateur
            const updateData: any = {
                otpLastSentAt: Timestamp.fromDate(now),
                otpCount24h: otpCount + 1
            };
            if (resetWindow) {
                updateData.otpFirstRequestAt = Timestamp.fromDate(now);
            }
            await userRef.update(updateData);

            // C. Vérification de la session active WhatsApp (20 heures)
            if (type === 'whatsapp') {
                const sessionLastOpen = userData.whatsappSessionLastOpen?.toDate();
                const isSessionActive = sessionLastOpen && (now.getTime() - sessionLastOpen.getTime()) < 20 * 60 * 60 * 1000;
                
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

        const formattedCode = `*${code}*`;
        const rawFormattedCode = `${code}`;

        const authTemplate = process.env.TWILIO_TEMPLATE_AUTH || 
            "🔑 *VÉRIFICATION DJR AKADEMI*\n\nVoici ton code de vérification pour accéder à ton cours : {{code}}\n\nTu peux également te connecter directement en cliquant sur ce lien sécurisé : {{link}}\n\nNe partage jamais ce code.";

        // 5. Envoyer le code
        if (contactMethod === 'phone' && finalPhone) {
            const userName = userDoc.data()?.name || "Client";
            const authTemplateSid = process.env.TWILIO_TEMPLATE_AUTH_SID;

            if (type === 'whatsapp') {
                try {
                    const magicToken = await getOrCreateUserMagicToken(userId);
                    const magicLink = `${baseUrl}/login/magic?token=${magicToken}`;

                    if (authTemplateSid) {
                        await sendWhatsAppMessage(finalPhone, "", authTemplateSid, {
                            "1": code,
                            "2": token,
                            "3": magicLink.replace(/^https?:\/\//, ''),
                            "4": userName
                        });
                        console.log(`📩 [WHATSAPP TEMPLATE] Envoyé avec succès à ${finalPhone}`);
                    } else {
                        const message = formatMessageTemplate(authTemplate, { code: formattedCode, link: magicLink, userName });
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

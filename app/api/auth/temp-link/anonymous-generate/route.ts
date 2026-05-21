import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";
import { sendSmsMessage, formatMessageTemplate } from "@/lib/whatsapp";
import { getOrCreateUserMagicToken } from "@/lib/magicLink";

export async function POST(req: Request) {
    try {
        const { userId, phone, contactMethod, email } = await req.json();
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

        const finalPhone = phone || userDoc.data()?.phone;

        // 2. Si c'est par téléphone, appliquer les limites de taux via Firestore
        if (contactMethod === 'phone' && finalPhone) {
            const now = new Date();
            const userData = userDoc.data() || {};
            
            // 1. Cooldown de 60 secondes entre les requêtes
            const lastSent = userData.otpLastSentAt?.toDate();
            if (lastSent && (now.getTime() - lastSent.getTime() < 60 * 1000)) {
                return NextResponse.json({
                    error: "Veuillez patienter 60 secondes entre chaque demande de code."
                }, { status: 429 });
            }

            // 2. Limite par 24 heures (3 pour SMS)
            const firstRequest = userData.otpFirstRequestAt?.toDate();
            let otpCount = userData.otpCount24h || 0;
            let resetWindow = false;

            if (!firstRequest || (now.getTime() - firstRequest.getTime() > 24 * 60 * 60 * 1000)) {
                resetWindow = true;
                otpCount = 0;
            }

            const maxLimit = 3;
            if (otpCount >= maxLimit) {
                return NextResponse.json({
                    error: `Trop de tentatives de connexion par SMS. (Limite de ${maxLimit}/24h dépassée).`,
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

        const rawFormattedCode = `${code}`;

        const authTemplate = process.env.TWILIO_TEMPLATE_AUTH || 
            "🔑 *VÉRIFICATION DJR AKADEMI*\n\nVoici ton code de vérification pour accéder à ton cours : {{code}}\n\nTu peux également te connecter directement en cliquant sur ce lien sécurisé : {{link}}\n\nNe partage jamais ce code.";

        // 5. Envoyer le code
        if (contactMethod === 'phone' && finalPhone) {
            const userName = userDoc.data()?.name || "Client";
            // SMS
            const message = formatMessageTemplate(authTemplate, { code: rawFormattedCode, link, userName });
            try {
                await sendSmsMessage(finalPhone, message);
                console.log(`📩 [SMS] Code de vérification envoyé à ${finalPhone}`);
            } catch (err) {
                console.error("Erreur lors de l'envoi du SMS Twilio:", err);
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

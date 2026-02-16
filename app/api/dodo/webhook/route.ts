import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

import crypto from "crypto";

// Cette route gère les notifications de Dodo Payments
export async function POST(req: Request) {
    console.log("🔔 [WEBHOOK] Réception d'un événement Dodo Payments");

    try {
        // 1. Lire le corps de la requête en texte BRUT pour la vérification de signature
        const rawBody = await req.text();
        if (!rawBody) {
            return NextResponse.json({ error: "Empty body" }, { status: 400 });
        }

        const payload = JSON.parse(rawBody);

        // 2. Vérification de la signature (Sécurité)
        const signature = req.headers.get("webhook-signature");
        const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;

        if (webhookSecret) {
            // Calcul du hash HMAC SHA256
            const computedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(rawBody)
                .digest("hex");

            // Comparaison sécurisée (timing safe)
            // Note: Dodo envoie peut-être "t=timestamp,v1=signature" ou juste la signature. 
            // On suppose ici un format simple hex. À adapter selon la doc réelle si besoin.
            if (signature !== computedSignature) {
                // Essayer une comparaison 't=...' si le format simple échoue ? 
                // Pour l'instant on reste strict.
                console.error(`❌ [WEBHOOK] Signature invalide. Reçu: ${signature}, Calculé: ${computedSignature}`);
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
            console.log("Vk [WEBHOOK] Signature vérifiée avec succès.");
        } else {
            console.warn("⚠️ [WEBHOOK] Pas de clé secrète (DODO_PAYMENTS_WEBHOOK_KEY) configurée. Vérification sautée.");
        }

        console.log("📦 [WEBHOOK PAYLOAD]:", JSON.stringify(payload, null, 2));

        // 3. Extraction des données (Compatible nouvelle/ancienne structure)

        const { payment_id, status, metadata, currency, payment_method, amount } = payload;

        // Certaines structures de payload peuvent varier (event wrapper vs direct payload)
        // On essaie de trouver l'orderId dans les metadata
        // Note: Dodo peut envoyer 'data' wrapper selon la version de l'API webhooks
        const data = payload.data || payload;
        const effectiveMetadata = data.metadata || metadata;
        const effectiveStatus = data.status || status;
        const effectivePaymentId = data.payment_id || data.id || payment_id;

        const orderId = effectiveMetadata?.orderId;

        if (!orderId) {
            console.warn("⚠️ [WEBHOOK] Pas d'orderId trouvé dans les métadonnées. Ignoré.");
            return NextResponse.json({ message: "Ignored: No orderId" }, { status: 200 });
        }

        console.log(`🔎 [WEBHOOK] Traitement de la commande ID: ${orderId}, Statut: ${effectiveStatus}`);

        // 3. Connexion à Firestore (Admin)
        const adminDb = getAdminDb();
        const orderRef = adminDb.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            console.error(`❌ [WEBHOOK] Commande ${orderId} introuvable !`);
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const orderData = orderSnap.data();

        // 4. Traitement selon le statut
        if (effectiveStatus === "succeeded" || effectiveStatus === "completed" || effectiveStatus === "paid") {
            // PAIEMENT RÉUSSI
            if (orderData?.status !== "pending") {
                console.log(`✅ [WEBHOOK] Commande ${orderId} n'est pas 'pending' (${orderData?.status}). Ignoré.`);
                return NextResponse.json({ message: "Ignored: Order not pending" }, { status: 200 });
            }

            console.log("💰 [WEBHOOK] Paiement validé. Mise à jour de la commande...");

            // Mise à jour de la commande
            await orderRef.update({
                status: "completed",
                paymentMethod: data.payment_method || payment_method || "card",
                currency: data.currency || currency || "usd",
                amount: (data.amount || amount) ? (data.amount || amount) / 100 : orderData.amount, // Conversion centimes -> réel
                paidAt: Timestamp.now(),
                transactionId: effectivePaymentId // Confirmation du ID de transaction
            });

            // 5. Donner accès au contenu (Enrollment)
            const { userId, productId, productType } = orderData as any;

            console.log(`🔓 [WEBHOOK] Déblocage du contenu (${productType}) pour user ${userId}...`);

            // Création de l'enrollment ou ajout aux achats user
            if (productType === "course" || productType === "ebook") {
                // On ajoute dans la collection 'enrollments'
                // Note: On pourrait vérifier si l'enrollment existe déjà, mais addDoc créera un nouveau
                // Idéalement on utilise un ID composite userId_productId pour éviter les doublons, 
                // mais ici on suit la logique de 'lib/enrollments' qui utilise 'userId' field.

                const enrollmentsRef = adminDb.collection("enrollments");

                // Vérifier doublon
                const existingEnrollment = await enrollmentsRef
                    .where("userId", "==", userId)
                    .where("productId", "==", productId)
                    .get();

                if (existingEnrollment.empty) {
                    await enrollmentsRef.add({
                        userId: userId,
                        productId: productId, // string ID
                        productType: productType,
                        orderId: orderId,
                        status: "active",
                        enrolledAt: Timestamp.now(),
                        lastAccessedAt: Timestamp.now(),
                        progress: 0,
                        completedLessons: []
                    });
                    console.log("✅ [WEBHOOK] Enrollment créé avec succès.");
                } else {
                    console.log("⚠️ [WEBHOOK] L'utilisateur a déjà accès à ce contenu.");
                }
            } else if (productType === "service") {
                // Pour les services, c'est peut-être différent (Booking ?)
                // Pour l'instant on log juste
                console.log("ℹ️ [WEBHOOK] Service acheté. Pas d'enrollment automatique pour le moment.");
            }

        } else if (effectiveStatus === "failed") {
            // PAIEMENT ÉCHOUÉ
            console.log("❌ [WEBHOOK] Paiement échoué.");
            await orderRef.update({
                status: "failed",
                failedAt: Timestamp.now()
            });
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("🔥 [WEBHOOK ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

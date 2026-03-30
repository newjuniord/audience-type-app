import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

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
            // 1. Gestion de la clé Svix (whsec_...)
            let key = webhookSecret;
            if (webhookSecret.startsWith("whsec_")) {
                key = webhookSecret.substring(6); // Remove 'whsec_'
                // Note: Si la clé est en base64, il faudrait peut-être la décoder.
                // Svix keys are usually base64 encoded.
                // Mais crypto.createHmac gère les strings ou buffers.
                // Essayons d'abord de l'utiliser telle quelle ou décodée selon la doc Svix standard.
            }

            // Svix Standard Verification:
            // Payload = ${msgId}.${timestamp}.${body}
            const msgId = req.headers.get("webhook-id");
            const msgTimestamp = req.headers.get("webhook-timestamp");

            if (!msgId || !msgTimestamp) {
                console.error("❌ [WEBHOOK] Manque webhook-id ou webhook-timestamp");
                return NextResponse.json({ error: "Missing headers" }, { status: 400 });
            }

            // Construction du contenu à signer
            // IMPORTANT: Dodo/Svix signe "msgId.timestamp.body"
            const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;

            // Pour la clé : si c'est whsec_, c'est souvent du Base64.
            const secretBytes = webhookSecret.startsWith("whsec_")
                ? Buffer.from(webhookSecret.substring(6), "base64")
                : Buffer.from(webhookSecret); // Fallback

            const computedSignature = crypto
                .createHmac("sha256", secretBytes)
                .update(signedContent)
                .digest("base64");

            // Dodo envoie "v1,signature_en_base64"
            const receivedSignature = signature?.startsWith("v1,") ? signature.split(",")[1] : signature;

            if (receivedSignature !== computedSignature) {
                console.error(`❌ [WEBHOOK] Signature invalide.`);
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
            console.log("✅ [WEBHOOK] Signature Svix vérifiée avec succès.");
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
            const finalCurrency = (data.currency || currency || orderData?.currency || "usd").toLowerCase();
            const totalFromApi = data.total_amount || data.amount || amount;
            
            let finalAmount = orderData?.amount || 0;
            if (totalFromApi !== undefined && totalFromApi !== null) {
                finalAmount = finalCurrency === "usd" ? (totalFromApi / 100) : totalFromApi;
            }

            await orderRef.update({
                status: "completed",
                paymentMethod: data.payment_method || payment_method || "card",
                currency: finalCurrency,
                amount: finalAmount,
                paidAt: Timestamp.now(),
                transactionId: effectivePaymentId, // Confirmation du ID de transaction
                expiresAt: FieldValue.delete() // Plus d'expiration nécessaire
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

                // Déterminer la collection produit
                const productCollection = productType === "course" ? "courses" : "ebooks";
                const safeUserId = userId.id || userId;
                const safeProductId = productId.id || productId;

                const userRef = adminDb.collection("users").doc(safeUserId);
                const productRef = adminDb.collection(productCollection).doc(safeProductId);

                // Vérifier doublon (Correction: Utiliser des références dans la query)
                const existingEnrollment = await enrollmentsRef
                    .where("userId", "==", userRef)
                    .where("productId", "==", productRef)
                    .get();

                if (existingEnrollment.empty) {
                    const [pSnap, uSnap] = await Promise.all([productRef.get(), userRef.get()]);
                    const pData = pSnap.exists ? pSnap.data() : {};
                    const uData = uSnap.exists ? uSnap.data() : {};

                    await enrollmentsRef.add({
                        userId: userRef,
                        productId: productRef,
                        productType: productType,
                        orderId: orderId,
                        status: "active",
                        accessGranted: true,
                        enrolledAt: Timestamp.now(),
                        lastAccessedAt: Timestamp.now(),
                        progress: 0,
                        completedLessons: [],
                        currentLessonId: "",
                        downloadCount: "0",
                        totalLessons: pData?.totalLessons || 0,
                        productTitle: pData?.title || orderData?.productTitle || "",
                        productThumbnailUrl: pData?.thumbnail || pData?.coverImage || orderData?.productThumbnailUrl || "",
                        userEmail: uData?.email || orderData?.userEmail || "",
                        userName: uData?.name || orderData?.userName || ""
                    });
                    console.log("✅ [WEBHOOK] Enrollment créé avec succès, avec titre et image.");
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
                failedAt: Timestamp.now(),
                transactionId: effectivePaymentId
            });
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("🔥 [WEBHOOK ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

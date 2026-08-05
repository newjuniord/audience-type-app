import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createEnrollment } from '@/lib/enrollments';
import { Gift } from '@/lib/types';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { reference_id } = body;

        if (!reference_id) {
            return NextResponse.json({ error: "reference_id manquant" }, { status: 400 });
        }

        // 1. Récupérer la commande dans Firestore
        const orderRef = doc(db, "orders", reference_id);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
        }

        const orderData = orderSnap.data();

        if (orderData.status === "paid") {
            return NextResponse.json({
                success: true,
                message: "Commande déjà validée",
                status: "paid",
                bookingId: orderData.bookingId || null,
                orderId: reference_id
            });
        }

        // 2. Vérifier auprès de l'API Plopplop
        const clientId = process.env.PLOPPLOP_CLIENT_ID;
        const apiKey = process.env.PLOPPLOP_KEY_API;

        if (!clientId || !apiKey) {
            return NextResponse.json({ error: "Erreur de configuration serveur" }, { status: 500 });
        }

        const verifyPayload = {
            client_id: clientId,
            refference_id: reference_id
        };

        const response = await fetch("https://plopplop.solutionip.app/api/paiement-verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(verifyPayload)
        });

        const data = await response.json();

        // 3. Traiter la réponse
        if (response.ok && data.status && data.trans_status === "ok") {
            // Le paiement a réussi
            
            // a) Mettre à jour la commande
            await updateDoc(orderRef, {
                status: "paid",
                providerTransactionId: data.id_transaction || null,
                transactionId: data.id_transaction || null,
                paymentDate: data.date || null
            });

            // b) Donner l'accès au produit
            await createEnrollment({
                userId: orderData.userId,
                userEmail: orderData.userEmail,
                userName: orderData.userName,
                productId: orderData.productId,
                productTitle: orderData.productTitle,
                productType: orderData.productType,
                productThumbnailUrl: orderData.productThumbnailUrl,
                status: "active",
                accessGranted: true,
                progress: 0,
                totalLessons: 0,
                completedLessons: [],
                currentLessonId: "",
                downloadCount: "0"
            });

            // c) Vérifier les cadeaux (Gifts) comme dans le Webhook Lemon Squeezy
            const giftsRef = collection(db, "gifts");
            const q = query(giftsRef, where("triggerProductId", "==", orderData.productId), where("isActive", "==", true));
            const snapshot = await getDocs(q);

            for (const giftDoc of snapshot.docs) {
                const gift = giftDoc.data() as Gift;
                let conditionsMet = true;

                if (gift.expirationDate) {
                    const expiry = new Date(gift.expirationDate);
                    if (expiry < new Date()) conditionsMet = false;
                }

                if (conditionsMet && gift.maxUses !== null && gift.maxUses !== undefined) {
                    if ((gift.currentUsesCount || 0) >= gift.maxUses) conditionsMet = false;
                }

                if (conditionsMet && !gift.requiresInvitation) {
                    await createEnrollment({
                        userId: orderData.userId,
                        userEmail: orderData.userEmail,
                        userName: orderData.userName,
                        productId: gift.giftProductId,
                        productTitle: gift.giftProductTitle,
                        productType: gift.giftProductType,
                        productThumbnailUrl: gift.giftProductThumbnailUrl || "",
                        status: "active",
                        accessGranted: true,
                        progress: 0,
                        totalLessons: 0,
                        completedLessons: [],
                        currentLessonId: "",
                        downloadCount: "0"
                    });

                    const giftRef = doc(db, "gifts", giftDoc.id);
                    await updateDoc(giftRef, {
                        currentUsesCount: (gift.currentUsesCount || 0) + 1
                    });
                }
            }

            return NextResponse.json({
                success: true,
                status: "paid",
                bookingId: orderData.bookingId || null,
                orderId: reference_id
            });
        } else {
            // Le paiement n'est pas encore confirmé ou a échoué
            return NextResponse.json({ success: true, status: "pending", detail: data });
        }

    } catch (error) {
        console.error("Erreur verify-order Plopplop:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

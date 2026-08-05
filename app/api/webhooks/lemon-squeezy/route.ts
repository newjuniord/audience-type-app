import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createEnrollment } from '@/lib/enrollments';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, setDoc, updateDoc, doc } from 'firebase/firestore';
import { Gift } from '@/lib/types';

export async function POST(req: Request) {
    try {
        // 1. Check Lemon Squeezy Signature for security
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
        if (!secret) {
            console.error('LEMON_SQUEEZY_WEBHOOK_SECRET is not set');
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        const signature = req.headers.get('x-signature');
        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        const rawBody = await req.text();
        const hmac = crypto.createHmac('sha256', secret);
        const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
        const signatureBuffer = Buffer.from(signature, 'utf8');

        if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;

        // 2. Handle successful order creation
        if (eventName === 'order_created') {
            const order = payload.data.attributes;
            const customData = payload.meta.custom_data; // This is where we pass userId and productId when creating checkout

            if (!customData || !customData.userId || !customData.productId) {
                console.error("Missing custom_data (userId or productId)");
                return NextResponse.json({ error: 'Missing custom data' }, { status: 400 });
            }

            const userId = customData.userId;
            const productId = customData.productId;
            const userEmail = order.user_email;
            const userName = order.user_name;

            // -- A. Grant access to the primary product --
            await createEnrollment({
                userId,
                userEmail,
                userName,
                productId,
                productTitle: order.first_order_item?.product_name || "Produit",
                productType: customData.productType || "course",
                productThumbnailUrl: customData.productThumbnailUrl || "",
                status: "active",
                accessGranted: true,
                progress: 0,
                totalLessons: 0,
                completedLessons: [],
                currentLessonId: "",
                downloadCount: "0"
            });

            // -- B. Mettre à jour la commande dans la collection orders --
            try {
                const targetOrderId = customData.orderId || `LS-${payload.data.id || Date.now()}`;
                const orderRef = doc(db, "orders", targetOrderId);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    await updateDoc(orderRef, {
                        status: "paid",
                        transactionId: payload.data.id || "",
                        paidAt: new Date().toISOString()
                    });
                } else {
                    await setDoc(orderRef, {
                        id: targetOrderId,
                        userId,
                        userEmail,
                        userName,
                        productId,
                        productType: customData.productType || "course",
                        productTitle: order.first_order_item?.product_name || "Produit",
                        productThumbnailUrl: customData.productThumbnailUrl || "",
                        amountUSD: (order.total || 0) / 100,
                        method: "lemonsqueezy",
                        status: "paid",
                        transactionId: payload.data.id || "",
                        createdAt: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error("Erreur enregistrement order Lemon Squeezy:", err);
            }

            // -- B. Check for active Gifts linked to this product (Conditions & Grant) --
            const giftsRef = collection(db, "gifts");
            const q = query(giftsRef, where("triggerProductId", "==", productId), where("isActive", "==", true));
            const snapshot = await getDocs(q);

            for (const giftDoc of snapshot.docs) {
                const gift = giftDoc.data() as Gift;
                let conditionsMet = true;

                // Condition 1: Expiration Date
                if (gift.expirationDate) {
                    const expiry = new Date(gift.expirationDate);
                    if (expiry < new Date()) {
                        conditionsMet = false; // Le cadeau a expiré
                    }
                }

                // Condition 2: Max Uses limit
                if (conditionsMet && gift.maxUses !== null && gift.maxUses !== undefined) {
                    if ((gift.currentUsesCount || 0) >= gift.maxUses) {
                        conditionsMet = false; // Limite atteinte
                    }
                }

                // Condition 3: Invitation Code (If the gift requires it, we'd need it in custom_data)
                if (conditionsMet && gift.requiresInvitation) {
                    if (customData.invitationCode !== gift.invitationCode) {
                        conditionsMet = false; // Code invalide ou manquant
                    }
                }

                // If all conditions are met, grant the gift!
                if (conditionsMet) {
                    await createEnrollment({
                        userId,
                        userEmail,
                        userName,
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

                    // Update the gift's usage count
                    const giftRef = doc(db, "gifts", giftDoc.id);
                    await updateDoc(giftRef, {
                        currentUsesCount: (gift.currentUsesCount || 0) + 1
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit, updateDoc } from 'firebase/firestore';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { productId, productType, userId, userEmail, userName, bookingId } = body;

        if (!productId || !userId) {
            return NextResponse.json({ error: "Paramètres manquants (productId, userId)" }, { status: 400 });
        }

        // 1. Récupérer le produit et son prix en USD
        let collectionName = "courses";
        if (productType === "ebook") collectionName = "ebooks";
        if (productType === "service") collectionName = "services";

        const productRef = doc(db, collectionName, productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
        }

        const productData = productSnap.data();
        const rawPrice = typeof productData.price === 'number' ? productData.price : parseFloat(productData.price || "0");
        const variantId = productData.lemonSqueezyProductId || productData.lemonSqueezyId;

        if (!variantId) {
            return NextResponse.json({ error: "ID de variante Lemon Squeezy non configuré pour ce produit." }, { status: 400 });
        }

        if (isNaN(rawPrice) || rawPrice <= 0) {
            return NextResponse.json({ error: "Prix du produit invalide." }, { status: 400 });
        }

        const priceInCents = Math.round(rawPrice * 100);

        const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;

        if (!apiKey || !storeId) {
            console.error("LEMON_SQUEEZY_API_KEY ou LEMON_SQUEEZY_STORE_ID non configuré.");
            return NextResponse.json({ error: "Erreur de configuration serveur (Clés Lemon Squeezy manquantes)." }, { status: 500 });
        }

        const orderId = `LS-ORD-${Date.now()}-${userId.slice(0, 5)}`;

        // La commande est créée dès maintenant : sans elle, la page de retour de paiement
        // n'a rien à vérifier et le rendez-vous associé ne peut pas être confirmé.
        await setDoc(doc(db, "orders", orderId), {
            id: orderId,
            userId,
            userEmail: userEmail || "",
            userName: userName || "",
            productId,
            productType: productType || "course",
            productTitle: productData.title || "Produit",
            productThumbnailUrl: productData.thumbnail || productData.coverImage || productData.imageUrl || "",
            amountUSD: rawPrice,
            method: "lemonsqueezy",
            status: "pending",
            bookingId: bookingId || null,
            createdAt: new Date().toISOString()
        });

        // 3. Appeler l'API Lemon Squeezy pour créer le Checkout
        const payload = {
            data: {
                type: "checkouts",
                attributes: {
                    custom_price: priceInCents,
                    product_options: {
                        enabled_variants: [variantId.toString()]
                    },
                    checkout_data: {
                        email: userEmail || undefined,
                        name: userName || undefined,
                        custom: {
                            orderId: orderId,
                            userId: userId.toString(),
                            productId: productId.toString(),
                            productType: (productType || "course").toString(),
                            productThumbnailUrl: (productData.thumbnail || productData.coverImage || productData.imageUrl || "").toString(),
                            ...(bookingId ? { bookingId: bookingId.toString() } : {})
                        }
                    }
                },
                relationships: {
                    store: {
                        data: {
                            type: "stores",
                            id: storeId.toString()
                        }
                    },
                    variant: {
                        data: {
                            type: "variants",
                            id: variantId.toString()
                        }
                    }
                }
            }
        };

        const lsResponse = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
            method: "POST",
            headers: {
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const lsData = await lsResponse.json();

        if (!lsResponse.ok || !lsData?.data?.attributes?.url) {
            console.error("Erreur Lemon Squeezy API:", lsData);
            return NextResponse.json({ error: lsData?.errors?.[0]?.detail || "Erreur lors de la génération du lien de paiement." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            checkoutUrl: lsData.data.attributes.url,
            orderId
        });

    } catch (error) {
        console.error("Erreur Lemon Squeezy create-checkout:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

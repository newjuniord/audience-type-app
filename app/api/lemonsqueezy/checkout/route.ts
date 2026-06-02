import { NextResponse } from "next/server";

/**
 * API Route: /api/lemonsqueezy/checkout
 * Crée une session de paiement Lemon Squeezy.
 */
export async function POST(req: Request) {
    console.log("🍋 [API] Démarrage du processus de paiement Lemon Squeezy...");

    try {
        const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;

        if (!apiKey || !storeId) {
            console.error("❌ [ERREUR CONFIG] Clés Lemon Squeezy manquantes !");
            return NextResponse.json({ error: "Erreur de configuration serveur" }, { status: 500 });
        }

        const body = await req.json();
        const { productId, userId, userEmail, userName } = body;

        if (!productId || !userId) {
            console.error("❌ [ERREUR REQUÊTE] Paramètres manquants");
            return NextResponse.json({ error: "Information manquante" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/lib/supabase/admin");

        // RECHERCHE DU PRODUIT (Comme pour Dodo)
        console.log("🔍 [RECHERCHE] Recherche du produit...");
        const collections = ["products", "courses", "ebooks", "services"];
        
        let productData: any = null;
        let productCollection = "";

        for (const name of collections) {
            const { data } = await supabaseAdmin
                .from(name)
                .select('*')
                .eq('id', productId)
                .maybeSingle();
                
            if (data) {
                productData = data;
                productCollection = name;
                console.log(`✅ [TROUVÉ] Produit trouvé dans "${productCollection}"`);
                break;
            }
        }

        if (!productData) {
            return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
        }

        const variantId = productData.lemonSqueezyProductId;
        if (!variantId) {
            return NextResponse.json({ error: "Configuration Lemon Squeezy manquante sur le produit" }, { status: 400 });
        }

        // CRÉATION DE L'ORDRE DANS SUPABASE
        const orderId = crypto.randomUUID();

        // Fetch user document to check for existing customer ID
        let lemonSqueezyCustomerId = "";
        try {
            const { data: userDoc } = await supabaseAdmin
                .from("users")
                .select("lemonSqueezyCustomerId")
                .eq("id", userId)
                .single();
                
            if (userDoc) {
                lemonSqueezyCustomerId = userDoc.lemonSqueezyCustomerId || "";
                if (lemonSqueezyCustomerId) {
                    console.log(`🔗 [CHECKOUT] Found existing lemonSqueezyCustomerId: ${lemonSqueezyCustomerId}`);
                }
            }
        } catch (e: any) {
            console.warn("⚠️ [CHECKOUT] Could not fetch user profile for customer ID:", e.message);
        }

        const orderData = {
            id: orderId,
            userId,
            productId,
            productType: productCollection === "courses" ? "course" : (productCollection === "ebooks" ? "ebook" : "service"),
            productTitle: productData.title,
            productThumbnailUrl: productData.thumbnail || productData.coverImage || "",
            amount: parseFloat(productData.price),
            currency: "usd",
            status: "pending",
            paymentMethod: "card",
            provider: "lemonsqueezy",
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            userEmail: userEmail || "unknown",
            userName: userName || "unknown"
        };

        const { error: orderError } = await supabaseAdmin.from("orders").insert(orderData);
        if (orderError) {
            console.error("❌ [ERREUR DB] Erreur de création de commande", orderError);
            return NextResponse.json({ error: "Erreur lors de l'initialisation de la commande" }, { status: 500 });
        }

        // APPEL API LEMON SQUEEZY (Fetch)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const isSandbox = process.env.LEMON_SQUEEZY_ENVIRONMENT === "sandbox";

        let returnUrl = `${baseUrl}/dashboard?payment=success`;

        const relationships: any = {
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
        };

        // Lemon Squeezy Checkout API does not support 'customer' relationship directly.
        // It associates the checkout to a customer based on the email address used.
        if (lemonSqueezyCustomerId) {
            console.log(`🔗 [CHECKOUT] User has existing customer ID: ${lemonSqueezyCustomerId}, but it's not supported in checkout relationships.`);
        }

        const checkoutData: any = {
            name: userName || "Client",
            custom: {
                orderId: orderId,
                userId: userId,
                productId: productId
            }
        };

        // Rétablissement de l'e-mail pré-rempli systématique avec repli robuste
        if (userEmail && userEmail.includes("@")) {
            checkoutData.email = userEmail;
            console.log(`📧 [CHECKOUT] Pré-remplissage avec l'e-mail : ${userEmail}`);
        } else {
            checkoutData.email = "client@example.com";
            console.log(`📧 [CHECKOUT] Aucun e-mail valide trouvé, utilisation du repli par défaut.`);
        }

        // Expiration de la session : 20 minutes pour les consultations (services), 60 minutes pour le reste
        const expirationMinutes = productCollection === "services" ? 20 : 60;
        const sessionExpiresAtMs = Date.now() + expirationMinutes * 60 * 1000;

        const payload = {
            data: {
                type: "checkouts",
                attributes: {
                    test_mode: isSandbox,
                    checkout_data: checkoutData,
                    product_options: {
                        redirect_url: returnUrl
                    },
                    expires_at: new Date(sessionExpiresAtMs).toISOString()
                },
                relationships
            }
        };

        const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
            method: "POST",
            headers: {
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorData = await res.text();
            console.error("❌ [ERREUR LEMON SQUEEZY]", errorData);
            await supabaseAdmin.from("orders").update({ status: "failed_api", failedReason: errorData }).eq("id", orderId);
            
            // On renvoie l'erreur détaillée pour comprendre exactement ce qui bloque
            let errorMsg = "Erreur lors de la création du checkout Lemon Squeezy";
            try {
                const parsed = JSON.parse(errorData);
                if (parsed.errors && parsed.errors[0]) {
                    errorMsg = parsed.errors[0].detail || parsed.errors[0].title;
                }
            } catch(e) {}
            
            return NextResponse.json({ error: `LemonSqueezy refusé : ${errorMsg}` }, { status: 500 });
        }

        const lsData = await res.json();
        const checkoutUrl = lsData.data.attributes.url;

        // Met à jour la transaction ID de façon asynchrone
        supabaseAdmin.from("orders").update({ transactionId: lsData.data.id }).eq("id", orderId).then(({ error }) => { if (error) console.error(error); });

        console.log(`🚀 [SUCCESS] Redirection LemonSqueezy vers : ${checkoutUrl}`);
        return NextResponse.json({ checkoutUrl, sessionExpiresAtMs });

    } catch (error: any) {
        console.error("🔥 [ERREUR CRITIQUE]", error);
        return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
    }
}

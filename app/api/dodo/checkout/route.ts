import { NextResponse } from "next/server";
import dodo from "@/lib/dodo";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * API Route: /api/dodo/checkout
 * Cette fonction gère la création d'une session de paiement Dodo Payments de manière optimisée pour la rapidité.
 */
export async function POST(req: Request) {
    console.log("🚀 [API] Démarrage du processus de paiement Dodo (Optimisé)...");

    try {
        // ÉTAPE 1 : VÉRIFICATION DE LA CONFIGURATION
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        if (!apiKey) {
            console.error("❌ [ERREUR CONFIG] La clé DODO_PAYMENTS_API_KEY est introuvable !");
            return NextResponse.json({ error: "Erreur de configuration serveur" }, { status: 500 });
        }

        // ÉTAPE 2 : RÉCUPÉRATION DES PARAMÈTRES REÇUS
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { productId, userId, userEmail, userName, referenceCode } = body;

        if (!productId || !userId) {
            console.error("❌ [ERREUR REQUÊTE] Paramètres manquants");
            return NextResponse.json({ error: "Information manquante" }, { status: 400 });
        }

        // ... (rest of the code stays same until orderData)

        // ÉTAPE 3 : RÉCUPÉRATION DU PRODUIT DEPUIS FIRESTORE (PARALLÈLE)
        console.log("🔍 [RECHERCHE] Recherche du produit dans toutes les collections...");
        const collections = ["products", "courses", "ebooks", "services"];
        
        // On effectue toutes les lectures Firestore en même temps (Gain de temps important)
        const snapshots = await Promise.all(
            collections.map(name => getDoc(doc(db, name, productId)))
        );

        let productData: any = null;
        let productCollection = "";

        for (let i = 0; i < snapshots.length; i++) {
            if (snapshots[i].exists()) {
                productData = snapshots[i].data();
                productCollection = collections[i];
                console.log(`✅ [TROUVÉ] Produit trouvé dans "${productCollection}"`);
                break;
            }
        }

        if (!productData) {
            console.error(`❌ [ERREUR] Produit ${productId} introuvable.`);
            return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
        }

        // ÉTAPE 4 : OPÉRATIONS CONCURRENTES (ORDRE + CLIENT)
        // On lance la préparation de la commande et la gestion du client Dodo en parallèle
        console.log("⚡ [PROFIL/ORDRE] Lancement des opérations concurrentes...");

        const { getAdminDb } = await import("@/lib/firebase-admin");
        const adminDb = getAdminDb();

        const ordersRef = adminDb.collection("orders");
        const newOrderRef = ordersRef.doc();
        const orderId = newOrderRef.id;

        const orderData = {
            userId,
            productId,
            productType: productCollection === "courses" ? "course" : (productCollection === "ebooks" ? "ebook" : "service"),
            productTitle: productData.title,
            productThumbnailUrl: productData.thumbnail || productData.coverImage || "",
            amount: parseFloat(productData.price),
            currency: "usd",
            status: "pending",
            paymentMethod: "card",
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            userEmail: userEmail || "unknown",
            userName: userName || "unknown",
            referenceCode: referenceCode || ""
        };

        // Opération A : Sauvegarder la commande initiale (Firebase Admin write)
        const saveOrderPromise = newOrderRef.set(orderData);

        // Opération B : Gérer le client Dodo (Lecture Firestore + API Dodo si nécessaire)
        const getCustomerPromise = (async () => {
            const userRef = adminDb.collection("users").doc(userId);
            const userSnap = await userRef.get();
            let dodoCustomerId = userSnap.data()?.dodoCustomerId;

            if (!dodoCustomerId) {
                console.log("👤 [DODO] Création d'un nouveau profil client...");
                const dodoBaseUrl = apiKey.includes('test') ? "https://test.dodopayments.com" : "https://api.dodopayments.com";
                try {
                    const res = await fetch(`${dodoBaseUrl}/customers`, {
                        method: "POST",
                        headers: { 
                            "Authorization": `Bearer ${apiKey}`, 
                            "Content-Type": "application/json" 
                        },
                        body: JSON.stringify({ email: userEmail, name: userName }),
                    });
                    if (res.ok) {
                        const newCustomer = await res.json();
                        dodoCustomerId = newCustomer.id;
                        // On update en arrière-plan sans bloquer
                        userRef.update({ dodoCustomerId }).catch(e => console.error("User update error:", e));
                    }
                } catch (err) {
                    console.error("⚠️ Erreur création client Dodo (non-bloquant):", err);
                }
            }
            return dodoCustomerId;
        })();

        // On attend que l'ordre soit enregistré ET qu'on ait l'ID client (ou non)
        const [_, dodoCustomerId] = await Promise.all([saveOrderPromise, getCustomerPromise]);

        // ÉTAPE 5 : CRÉATION DE LA SESSION DE PAIEMENT DODO
        const dodoProductId = productData.dodoProductId;
        if (!dodoProductId) {
            return NextResponse.json({ error: "Configuration Dodo manquante sur le produit" }, { status: 400 });
        }

        try {
            const payload = {
                customerId: dodoCustomerId,
                customer: {
                    email: userEmail || "client@example.com",
                    name: userName || "Client"
                },
                product_cart: [{ product_id: dodoProductId, quantity: 1 }],
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment-success?orderId=${orderId}&amount=${productData.price}&currency=USD`,
                metadata: { orderId, userId, productId, referenceCode }
            };

            // Appel API Dodo
            const session = await (dodo as any).checkoutSessions.create(payload);
            const checkoutUrl = session.checkout_url || (session as any).payment_link;

            if (!checkoutUrl) {
                await newOrderRef.update({ status: "failed_no_url" });
                return NextResponse.json({ error: "Pas d'URL de paiement retournée" }, { status: 500 });
            }

            // Mise à jour finale du transactionId en arrière-plan (TOTALEMENT NON-BLOQUANT)
            if (session.session_id) {
                newOrderRef.update({ transactionId: session.session_id }).catch(e => console.error("Order final update error:", e));
            }

            console.log(`🚀 [SUCCESS] Redirection immédiate vers : ${checkoutUrl}`);
            return NextResponse.json({ checkoutUrl });

        } catch (dodoError: any) {
            console.error("❌ [ERREUR DODO PAYMENTS] Impossible de créer la session :", dodoError);
            return NextResponse.json({ error: `Erreur Dodo : ${dodoError.message}` }, { status: 500 });
        }

    } catch (error: any) {
        console.error("🔥 [ERREUR CRITIQUE] Exception non gérée :", error);
        return NextResponse.json({ error: error.message || "Erreur interne du serveur" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import dodo from "@/lib/dodo";
// ✅ ON UTILISE LE CLIENT SDK AU LIEU DU ADMIN SDK (Plus simple, pas besoin de clés compliquées)
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * API Route: /api/dodo/checkout
 * Cette fonction gère la création d'une session de paiement Dodo Payments.
 * Elle est appelée par le frontend lorsqu'un utilisateur clique sur "Acheter".
 */
export async function POST(req: Request) {
    console.log("🚀 [API] Démarrage du processus de paiement Dodo...");

    try {
        // ÉTAPE 1 : VÉRIFICATION DE LA CONFIGURATION
        // On s'assure que la clé API Dodo est bien configurée dans le fichier .env.local
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        if (!apiKey) {
            console.error("❌ [ERREUR CONFIG] La clé DODO_PAYMENTS_API_KEY est introuvable !");
            return NextResponse.json({ error: "Erreur de configuration serveur (Clé API manquante)" }, { status: 500 });
        }

        // ÉTAPE 2 : RÉCUPÉRATION DES PARAMÈTRES REÇUS
        // Le frontend nous envoie l'ID du produit (productId) et l'ID de l'utilisateur (userId)
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { productId, userId, userEmail, userName } = body;

        if (!productId || !userId) {
            console.error("❌ [ERREUR REQUÊTE] Paramètres manquants :", { productId, userId });
            return NextResponse.json({ error: "Information manquante (productId ou userId)" }, { status: 400 });
        }
        console.log(`📦 [INFO] Traitement de l'achat : Produit=${productId}, Utilisateur=${userId}, Email=${userEmail}`);

        // ÉTAPE 3 : RÉCUPÉRATION DU PRODUIT DEPUIS FIRESTORE (CLIENT SDK - Lecture Publique)
        // Les produits peuvent être dans différentes collections : products, courses, ebooks, services
        // On va chercher dans toutes jusqu'à trouver le bon
        console.log("🔍 [RECHERCHE] Recherche du produit dans les collections...");

        let productData: any = null;
        let productCollection = "";

        // Liste des collections à vérifier
        const collections = ["products", "courses", "ebooks", "services"];

        for (const collectionName of collections) {
            const productRef = doc(db, collectionName, productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                productData = productSnap.data();
                productCollection = collectionName;
                console.log(`✅ [TROUVÉ] Produit trouvé dans la collection "${collectionName}"`);
                break;
            }
        }

        if (!productData) {
            console.error(`❌ [ERREUR INTROUVABLE] Le produit avec l'ID ${productId} n'existe dans aucune collection.`);
            return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
        }

        // ÉTAPE 4 : CRÉATION DE LA COMMANDE (ORDER) EN BASE DE DONNÉES (STATUS: PENDING)
        // On utilise Firebase Admin pour écrire dans la collection 'orders' de manière sécurisée.
        console.log("📝 [DB] Création de la commande 'pending'...");

        // Import dynamique pour éviter les erreurs d'initialisation si on n'en a pas besoin
        const { getAdminDb } = await import("@/lib/firebase-admin");
        const adminDb = getAdminDb(); // Initialisation hors du try pour l'avoir après

        let orderId = "";
        let newOrderRef;

        try {
            const ordersRef = adminDb.collection("orders");

            // On génère un ID de commande
            newOrderRef = ordersRef.doc();
            orderId = newOrderRef.id;

            const orderData = {
                userId: userId,
                productId: productId,
                productType: productCollection === "courses" ? "course" : (productCollection === "ebooks" ? "ebook" : "service"),
                productTitle: productData.title,
                productThumbnailUrl: productData.thumbnail || productData.coverImage || "",
                amount: parseFloat(productData.price), // Montant réel (ex: 9.99) sans conversion en centimes
                currency: "usd", // Par défaut
                status: "pending", // STATUT INITIAL IMPORTANT
                paymentMethod: "card", // Valeur par défaut, sera mise à jour par le webhook
                createdAt: new Date(), // Timestamp actuel (Admin SDK utilise Date ou Firestore Timestamp)
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // +48 heures pour l'expiration auto
                userEmail: userEmail || "unknown",
                userName: userName || "unknown"
            };

            await newOrderRef.set(orderData);
            console.log(`✅ [DB] Commande créée avec ID: ${orderId}`);

        } catch (dbError: any) {
            console.error("🔥 [ERREUR FIREBASE ADMIN] Impossible de créer la commande :", dbError);
            console.error("💡 INDICE : Vérifiez FIREBASE_PRIVATE_KEY dans .env.local (Erreur 16 = Credentials invalides)");
            if (dbError.code === 16 || dbError.message?.includes("UNAUTHENTICATED")) {
                return NextResponse.json({
                    error: "Erreur d'authentification serveur (Firebase Admin)",
                    details: "Votre clé privée Firebase est invalide. Vérifiez .env.local et les sauts de ligne."
                }, { status: 500 });
            }
            throw dbError; // On laisse monter les autres erreurs
        }

        // ÉTAPE 5 : VALIDATION DE L'ID DODO (MANUEL)
        // Important : Nous ne créons plus les produits automatiquement.
        // Vous devez avoir ajouté manuellement le champ 'dodoProductId' dans votre base Firestore
        // avec l'ID correspondant au produit créé sur le tableau de bord Dodo Payments.
        const dodoProductId = productData.dodoProductId;

        if (!dodoProductId) {
            const errorMessage = `Le produit "${productData.title}" n'a pas d'ID Dodo configuré.`;
            console.error(`❌ [ERREUR CONFIG PRODUIT] ${errorMessage}`);

            // On renvoie un message très clair pour vous aider à corriger le problème rapidement
            return NextResponse.json({
                error: `CONFIGURATION MANQUANTE : Veuillez ajouter le champ 'dodoProductId' au document produit dans Firestore. ID attendu depuis le tableau de bord Dodo.`
            }, { status: 400 });
        }

        console.log(`✅ [SUCCÈS] ID Dodo trouvé : ${dodoProductId}`);

        // ÉTAPE 5.1 : GESTION DU CLIENT DODO (CUSTOMER)
        // On vérifie si l'utilisateur a déjà un ID client Dodo dans Firestore
        const userRef = adminDb.collection("users").doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        let dodoCustomerId = userData?.dodoCustomerId;

        // Si pas d'ID client, on le crée chez Dodo
        if (!dodoCustomerId) {
            console.log("👤 [DODO] Création d'un nouveau client Dodo...");
            try {
                // Utilisation de l'API Dodo pour créer le client
                // Note: Le SDK peut ne pas avoir cette méthode explicite selon la version, on utilise fetch pour être sûr
                // ou on verifie si (dodo as any).customers.create existe.
                // Pour l'instant, faisons confiance à la création implicite OU implémentons la création explicite si demandée.
                // L'utilisateur a fourni un exemple avec fetch sur /customers, intégrons cette logique.

                const dodoBaseUrl = apiKey.includes('test') ? "https://test.dodopayments.com" : "https://api.dodopayments.com";
                const createCustomerRes = await fetch(`${dodoBaseUrl}/customers`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: userEmail,
                        name: userName
                    }),
                });

                if (createCustomerRes.ok) {
                    const newCustomer = await createCustomerRes.json();
                    dodoCustomerId = newCustomer.id;

                    // Sauvegarde immédiate dans Firestore
                    await userRef.update({ dodoCustomerId: dodoCustomerId });
                    console.log(`✅ [DODO] Nouveau client créé et sauvegardé : ${dodoCustomerId}`);
                } else {
                    console.warn("⚠️ [DODO] Échec création client explicite, on continuera avec les détails client dans la session.");
                    const errorText = await createCustomerRes.text();
                    console.warn("Dodo Customer Error:", errorText);
                }
            } catch (err) {
                console.error("❌ [DODO] Erreur lors de la création du client :", err);
            }
        } else {
            console.log(`👤 [DODO] Client existant identifié : ${dodoCustomerId}`);
        }

        // ÉTAPE 5 : CRÉATION DE LA SESSION DE PAIEMENT CHEZ DODO
        // On utilise le SDK Dodo pour générer le lien de paiement sécurisé.
        console.log("🔄 [DODO] Génération du lien de paiement...");

        try {
            const payload = {
                billing_address: {
                    city: "New York",     // Valeurs par défaut pour l'instant
                    country: "US",        // Dodo requiert une adresse valide
                    state: "NY",
                    street: "123 Street",
                    zipcode: "10001"
                },
                customer: {
                    // Si on a l'ID, Dodo l'utilisera pour lier. Sinon il utilisera email/name pour créer/lier.
                    // L'API create session accepte customer_id OU customer object.
                    // Pour être sûr, on passe l'ID s'il existe dans l'objet customer ou via customer_id field selon la doc.
                    // D'après la structure habituelle :
                    customerId: dodoCustomerId, // Essai d'injection directe de l'ID
                    email: userEmail || "client@example.com",
                    name: userName || "Client Name"
                },
                product_cart: [
                    {
                        product_id: dodoProductId,
                        quantity: 1
                    }
                ],
                // URL de retour avec paramètres dynamiques pour la page de succès
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment-success?orderId=${orderId}&amount=${productData.price}&currency=USD`,
                metadata: {
                    orderId: orderId, // REQUIS pour le Webhook
                    userId: userId,
                    productId: productId
                }
            };

            console.log("📦 [DODO REQUEST PAYLOAD]:", JSON.stringify(payload, null, 2));

            // Use checkoutSessions.create instead of payments.create
            // Typings might vary based on SDK version, we'll cast to any if needed to bypass strict checks for now
            // or simply use the property if it exists on the SDK instance
            const session = await (dodo as any).checkoutSessions.create(payload); // Force cast to avoid TS errors if types are outdated

            console.log("PAYMENT RESPONSE:", JSON.stringify(session, null, 2));

            // Mise à jour de la commande avec l'ID de session Dodo
            if (session.session_id) {
                await newOrderRef.update({ transactionId: session.session_id });
            }

            // ÉTAPE 6 : RÉPONSE AU FRONTEND
            // On renvoie l'URL de paiement au site web pour rediriger l'utilisateur
            // Dodo says: "API returns checkout_url"
            const checkoutUrl = session.checkout_url || (session as any).payment_link;

            console.log(`🎉 [SUCCÈS] URL de paiement extraite : ${checkoutUrl}`);

            if (!checkoutUrl) {
                console.error("❌ CHECKSUM URL MANQUANTE DANS LA RÉPONSE DODO:", session);
                // On met à jour le statut en 'failed' si on n'a pas d'URL (techniquement un échec)
                await newOrderRef.update({ status: "failed_no_url" });
                return NextResponse.json({ error: "Pas d'URL de paiement retournée par Dodo", debug: session }, { status: 500 });
            }

            return NextResponse.json({ checkoutUrl });

        } catch (dodoError: any) {
            console.error("❌ [ERREUR DODO PAYMENTS] Impossible de créer le paiement :", dodoError);
            // On renvoie l'erreur brute pour faciliter le débogage si Dodo rejette la requête
            return NextResponse.json({ error: `Erreur Dodo : ${dodoError.message}` }, { status: 500 });
        }

    } catch (error: any) {
        // Erreur générale (bug de code, problème réseau, etc.)
        console.error("🔥 [ERREUR CRITIQUE] Exception non gérée :", error);
        return NextResponse.json({ error: error.message || "Erreur interne du serveur" }, { status: 500 });
    }
}

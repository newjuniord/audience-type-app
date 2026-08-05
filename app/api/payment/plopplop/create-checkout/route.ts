import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, limit, updateDoc } from 'firebase/firestore';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { productId, productType, method, userId, userEmail, userName, bookingId } = body;

        if (!productId || !method || !userId) {
            return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
        }

        // 1. Récupérer le prix réel du produit (Sécurité)
        let collectionName = "courses";
        if (productType === "ebook") collectionName = "ebooks";
        if (productType === "service") collectionName = "services";

        const productRef = doc(db, collectionName, productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
        }

        const productData = productSnap.data();
        const priceHTG = productData.priceHTG;

        if (!priceHTG || priceHTG < 20) {
            return NextResponse.json({ error: "Le prix en HTG n'est pas configuré ou est invalide (< 20 HTG)." }, { status: 400 });
        }

        // 1.5 Vérifier si l'utilisateur possède déjà ce produit
        const enrollmentsRef = collection(db, "enrollments");
        const enrollmentsQ = query(
            enrollmentsRef,
            where("userId", "==", userId),
            where("productId", "==", productId),
            limit(1)
        );
        const enrollmentsSnap = await getDocs(enrollmentsQ);
        
        if (!enrollmentsSnap.empty) {
            return NextResponse.json({ error: "Vous possédez déjà ce produit. Inutile de l'acheter à nouveau." }, { status: 400 });
        }

        // 2. Vérifier si une commande "pending" existe déjà pour cet utilisateur, produit et méthode
        const ordersRef = collection(db, "orders");
        const q = query(
            ordersRef,
            where("userId", "==", userId),
            where("productId", "==", productId),
            where("status", "==", "pending"),
            where("method", "==", method),
            limit(1)
        );
        const existingSnap = await getDocs(q);

        let refference_id: string;

        if (!existingSnap.empty) {
            const existingDoc = existingSnap.docs[0];
            const existingData = existingDoc.data();
            refference_id = existingDoc.id;

            // Si la commande pending possède déjà un ID de transaction prestataire enregistré, on réutilise le lien m-autre-paiement
            const savedTxId = existingData.providerTransactionId || existingData.plopplopTransactionId || existingData.id_transaction || existingData.transactionId;
            if (savedTxId) {
                const reuseUrl = `https://plopplop.solutionip.app/m-autre-paiement?id_transaction=${savedTxId}`;
                await updateDoc(doc(db, "orders", refference_id), {
                    updatedAt: serverTimestamp(),
                    userEmail: userEmail || existingData.userEmail,
                    userName: userName || existingData.userName,
                    amountHTG: priceHTG,
                    bookingId: bookingId || existingData.bookingId || null,
                });
                return NextResponse.json({
                    success: true,
                    checkoutUrl: reuseUrl,
                    orderId: refference_id
                });
            }

            await updateDoc(doc(db, "orders", refference_id), {
                createdAt: serverTimestamp(),
                userEmail: userEmail || existingData.userEmail,
                userName: userName || existingData.userName,
                amountHTG: priceHTG,
                bookingId: bookingId || existingData.bookingId || null,
            });
        } else {
            refference_id = `ORD-${Date.now()}-${userId.slice(0, 5)}`;
            const orderRef = doc(db, "orders", refference_id);
            await setDoc(orderRef, {
                id: refference_id,
                userId,
                userEmail,
                userName,
                productId,
                productType,
                productTitle: productData.title || "Produit",
                productThumbnailUrl: productData.thumbnail || productData.coverImage || productData.imageUrl || "",
                amountHTG: priceHTG,
                method,
                status: "pending",
                // Permet de retrouver le rendez-vous à confirmer au retour du paiement.
                bookingId: bookingId || null,
                createdAt: serverTimestamp()
            });
        }

        // 4. Appeler l'API Plopplop
        const clientId = process.env.PLOPPLOP_CLIENT_ID;
        const apiKey = process.env.PLOPPLOP_KEY_API;

        if (!clientId || !apiKey) {
            console.error("Clés Plopplop non configurées.");
            return NextResponse.json({ error: "Erreur de configuration serveur" }, { status: 500 });
        }

        const plopplopPayload = {
            client_id: clientId,
            refference_id,
            montant: priceHTG,
            payment_method: method // "moncash" ou "natcash"
        };

        const response = await fetch("https://plopplop.solutionip.app/api/paiement-marchand", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(plopplopPayload)
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            console.error("Erreur de l'API Plopplop:", data);
            return NextResponse.json({ error: "Erreur lors de la création du paiement côté prestataire." }, { status: 500 });
        }

        // Enregistrer l'ID de transaction prestataire pour réutilisation future
        const providerTransactionId = data.id_transaction || data.id || data.transaction_id || data.transactionId;
        await updateDoc(doc(db, "orders", refference_id), {
            providerTransactionId: providerTransactionId || null,
            plopplopTransactionId: providerTransactionId || null,
            plopplopUrl: data.url || null,
            updatedAt: serverTimestamp()
        });

        // 5. Retourner l'URL au frontend
        return NextResponse.json({ 
            success: true, 
            checkoutUrl: data.url,
            orderId: refference_id
        });

    } catch (error) {
        console.error("Erreur create-checkout Plopplop:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

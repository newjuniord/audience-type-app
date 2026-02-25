
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
    try {
        const { paymentId, orderId: clientOrderId } = await req.json();

        if (!paymentId) {
            return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
        }

        console.log(`🔍[VERIFY] Vérification du paiement Dodo: ${paymentId} `);



        // 1. Appel à l'API Dodo pour vérifier le statut réel
        const dodoRes = await fetch(`https://test.dodopayments.com/payments/${paymentId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
                "Content-Type": "application/json",
            },
        });

        if (!dodoRes.ok) {
            const errorText = await dodoRes.text();
            console.error("❌ [VERIFY] Erreur API Dodo :", errorText);
            return NextResponse.json({ error: "Failed to verify payment with Dodo" }, { status: 500 });
        }

        const paymentData = await dodoRes.json();
        const dodoStatus = paymentData.status; // succeeded, failed, etc.

        console.log(`✅ [VERIFY] Statut Dodo reçu : ${dodoStatus}`);

        // 2. Identification de la commande (Order)
        // Priorité : Metadata Dodo > Paramètre client
        const orderId = paymentData.metadata?.orderId || clientOrderId;

        if (!orderId) {
            console.warn("⚠️ [VERIFY] Impossible de trouver l'orderId (ni dans metadata, ni dans la requête client).");
            return NextResponse.json({ status: dodoStatus, warning: "No orderId found to update" });
        }
        const adminDb = getAdminDb();
        const orderRef = adminDb.collection("orders").doc(orderId);

        // TRANSACTION ATOMIQUE : Pour éviter les conflits entre Webhook et Vérification Client
        await adminDb.runTransaction(async (t) => {
            const orderSnap = await t.get(orderRef);

            if (!orderSnap.exists) {
                throw new Error("Order not found");
            }

            const orderData = orderSnap.data();

            // Si déjà complété, on ne fait RIEN (Idempotence)
            if (orderData?.status === "completed") {
                console.log(`✅ [VERIFY - TRANSACTION] Commande ${orderId} déjà complétée. Stop.`);
                return;
            }

            // Si le Dodo status est success, on valide tout
            if (dodoStatus === "succeeded") {
                // 1. Update Order
                t.update(orderRef, {
                    status: "completed",
                    paymentMethod: paymentData.payment_method || "card",
                    currency: paymentData.currency || "usd",
                    paidAt: Timestamp.now(),
                    amount: paymentData.amount ? paymentData.amount / 100 : orderData?.amount,
                    expiresAt: FieldValue.delete(),
                    transactionId: paymentId
                });

                // 2. Create Enrollment (if not exists)
                const { userId, productId, productType } = orderData as any;
                if (productType === "course" || productType === "ebook") {
                    const enrollmentsRef = adminDb.collection("enrollments");
                    const productCollection = productType === "course" ? "courses" : "ebooks";

                    // Note: Dans une transaction, on doit utiliser t.get() pour les lectures
                    // Mais Firestore ne permet pas facilement de requêter (where) dans une transaction sur une AUTRE collection 
                    // sans connaître l'ID du document à l'avance.
                    // Astuce : On utilise un ID déterministe pour l'enrollment ou on accepte le risque minime ici
                    // PUISQUE nous vérifions orderData.status === "completed" juste avant, et que nous sommes les SEULS à le passer à "completed" dans cette transaction,
                    // nous avons la garantie que nous sommes le premier processus à traiter ce succès.

                    const newEnrollmentRef = enrollmentsRef.doc(); // Nouvel ID auto
                    t.set(newEnrollmentRef, {
                        userId: adminDb.collection("users").doc(userId),
                        productId: adminDb.collection(productCollection).doc(productId),
                        productType: productType,
                        orderId: orderId,
                        status: "active",
                        enrolledAt: Timestamp.now(),
                        lastAccessedAt: Timestamp.now(),
                        progress: 0,
                        completedLessons: []
                    });
                    console.log("🔓 [VERIFY - TRANSACTION] Enrollment planifié.");
                }
            } else if (dodoStatus === "failed") {
                t.update(orderRef, {
                    status: "failed",
                    failedAt: Timestamp.now(),
                    transactionId: paymentId
                });
            }
        });

        // Relire les données fraîches pour le frontend
        const updatedOrderSnap = await orderRef.get();
        const updatedOrderData = updatedOrderSnap.data();

        // On renvoie les données de la commande pour l'affichage frontend
        return NextResponse.json({
            status: dodoStatus, // "succeeded", "failed", "pending"
            updated: true,
            order: {
                ...updatedOrderData,
                id: orderId,
                status: updatedOrderData?.status || dodoStatus, // Retourner le vrai nouveau statut
                transactionId: paymentId
            }
        });

    } catch (error: any) {
        console.error("🔥 [VERIFY ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

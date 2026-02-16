
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const orderData = orderSnap.data();

        // Si le statut est "succeeded", on met à jour en "completed"
        // Si "failed", on met à jour en "failed"
        // On force la mise à jour pour être sûr que tout est synchro
        let newStatus = orderData?.status;
        if (dodoStatus === "succeeded") newStatus = "completed";
        else if (dodoStatus === "failed") newStatus = "failed";

        console.log(`💰 [VERIFY] Mise à jour commande ${orderId} : ${orderData?.status} -> ${newStatus}`);

        await orderRef.update({
            status: newStatus,
            paymentMethod: paymentData.payment_method || "card",
            currency: paymentData.currency || "usd",
            // On met à jour la date de paiement si succès
            ...(dodoStatus === "succeeded" ? { paidAt: Timestamp.now() } : {}),
            transactionId: paymentId
        });

        // 3. Débloquer l'accès (Enrollment)
        const { userId, productId, productType } = orderData as any;

        // Only enroll if payment succeeded
        if (dodoStatus === "succeeded" && (productType === "course" || productType === "ebook")) {
            const enrollmentsRef = adminDb.collection("enrollments");
            const existingEnrollment = await enrollmentsRef
                .where("userId", "==", userId)
                .where("productId", "==", productId)
                .get();

            if (existingEnrollment.empty) {
                await enrollmentsRef.add({
                    userId: userId,
                    productId: productId,
                    productType: productType,
                    orderId: orderId,
                    status: "active",
                    enrolledAt: Timestamp.now(),
                    lastAccessedAt: Timestamp.now(),
                    progress: 0,
                    completedLessons: []
                });
                console.log("🔓 [VERIFY] Enrollment créé.");
            }
        }

        // On renvoie les données de la commande pour l'affichage frontend
        return NextResponse.json({
            status: dodoStatus, // "succeeded", "failed", "pending"
            updated: true,
            order: {
                ...orderData,
                id: orderId,
                status: newStatus || orderData?.status, // Retourner le vrai nouveau statut
                transactionId: paymentId
            }
        });

    } catch (error: any) {
        console.error("🔥 [VERIFY ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

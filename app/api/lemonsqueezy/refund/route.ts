import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-signature") || "";
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

        if (!secret) {
            console.error("❌ [REFUND WEBHOOK] Lemon Squeezy webhook secret is missing.");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        // Vérification de la signature
        const hmac = crypto.createHmac("sha256", secret);
        const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
        const signatureBuffer = Buffer.from(signature, "utf8");

        if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
            console.error("❌ [REFUND WEBHOOK] Invalid signature.");
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;
        
        console.log(`🔔 [REFUND WEBHOOK] Event received: ${eventName}`);

        // On gère uniquement les commandes remboursées
        if (eventName !== "order_refunded") {
            return NextResponse.json({ message: "Event ignored, expected order_refunded" }, { status: 200 });
        }

        const internalOrderId = payload.meta.custom_data?.orderId;
        
        if (!internalOrderId) {
            console.warn("⚠️ [REFUND WEBHOOK] No internal orderId provided in custom_data.");
            return NextResponse.json({ message: "Missing internal orderId" }, { status: 200 });
        }
        
        // Initialisation de Firestore
        const { getAdminDb } = await import("@/lib/firebase-admin");
        const adminDb = getAdminDb();

        const orderRef = adminDb.collection("orders").doc(internalOrderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            console.error(`❌ [REFUND WEBHOOK] Order ${internalOrderId} not found.`);
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const orderData = orderSnap.data();

        // Eviter de traiter deux fois le même remboursement
        if (orderData?.status === "refunded") {
            console.log(`✅ [REFUND WEBHOOK] Order ${internalOrderId} already marked as refunded.`);
            return NextResponse.json({ message: "Already processed" }, { status: 200 });
        }

        const now = new Date();
        await orderRef.update({
            status: "refunded",
            updatedAt: now
        });
        console.log(`ℹ️ [REFUND WEBHOOK] Order ${internalOrderId} marked as refunded.`);

        try {
            const { userId, productId, productType, productTitle } = orderData as any;
            
            // 1. Alert User
            let productLabel = "Pwodwi a";
            if (productType === "course") productLabel = "Kou a";
            else if (productType === "ebook") productLabel = "Ebook la";
            else if (productType === "service" || productType === "booking") productLabel = "Konsiltasyon an";

            await adminDb.collection("alerts").add({
                userId: userId,
                category: "utility",
                type: "payment_refunded",
                title: `💸 Ranbousman konfime`,
                body: `Yo ranbouse w pou ${productLabel.toLowerCase()} (${productTitle || "pwodwi a"}). Ou pa gen aksè avè l ankò.`,
                isRead: false,
                icon: "payments",
                iconColor: "text-amber-400",
                iconBg: "bg-amber-500/10",
                actionUrl: "/dashboard",
                actionLabel: "Retounen nan dashboard",
                createdAt: now,
            });

            // 2. Revoke Course/Ebook Access
            if (productType === "course" || productType === "ebook") {
                const enrollmentsRef = adminDb.collection("enrollments");
                const existingEnrollment = await enrollmentsRef
                    .where("userId", "==", userId)
                    .where("productId", "==", productId)
                    .limit(1)
                    .get();

                if (!existingEnrollment.empty) {
                    const enrollmentDoc = existingEnrollment.docs[0];
                    await enrollmentDoc.ref.update({
                        accessGranted: false,
                        status: "refunded"
                    });
                    console.log(`🔒 [REFUND WEBHOOK] Access revoked for user ${userId} on product ${productId}`);
                }
            }

            // 3. Cancel Consultation
            if (productType === "service" || productType === "booking") {
                const bookingSnap = await adminDb.collection("bookingApplications")
                    .where("usersId", "==", userId)
                    .where("bookingsId", "==", productId)
                    .where("orderId", "==", internalOrderId)
                    .get();

                if (!bookingSnap.empty) {
                    const batch = adminDb.batch();
                    bookingSnap.docs.forEach((doc) => {
                        batch.update(doc.ref, {
                            status: "cancelled",
                            updatedAt: now
                        });
                    });
                    await batch.commit();
                    console.log(`🚫 [REFUND WEBHOOK] Consultation cancelled for user ${userId} on service ${productId}`);
                }
            }
        } catch (e) {
            console.error("❌ [REFUND WEBHOOK] Error handling refund logic:", e);
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("🔥 [REFUND WEBHOOK] Error processing webhook:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

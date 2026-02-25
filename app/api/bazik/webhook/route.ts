import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
    console.log("🔔 [BAZIK WEBHOOK] Event received");

    try {
        const rawBody = await req.text();
        console.log("📝 [BAZIK WEBHOOK RAW BODY]:", rawBody);

        if (!rawBody) {
            return NextResponse.json({ error: "Empty body" }, { status: 400 });
        }

        const payload = JSON.parse(rawBody);
        console.log("📦 [BAZIK PAYLOAD]:", JSON.stringify(payload, null, 2));

        // Bazik Payload Structure Analysis (Assumed/Generic)
        // We look for referenceId or metadata.referenceId
        const orderId = payload.referenceId || payload.reference_id || payload.order_id || payload.metadata?.referenceId || payload.metadata?.orderId;
        const status = payload.status || (payload.success ? "completed" : "failed");
        const transactionId = payload.transactionId || payload.transaction_id || payload.id;

        if (!orderId) {
            console.warn("⚠️ [BAZIK WEBHOOK] Missing order identifier in payload. Raw payload above.");
            return NextResponse.json({ message: "Ignored: No order identifier" }, { status: 200 });
        }

        console.log(`🔎 [BAZIK WEBHOOK] Processing Order ID: ${orderId}, Status: ${status}`);

        const adminDb = getAdminDb();
        const orderRef = adminDb.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            console.error(`❌ [BAZIK WEBHOOK] Order ${orderId} not found!`);
            // Return 200 to stop retries if order doesn't exist
            return NextResponse.json({ message: "Order not found" }, { status: 200 });
        }

        const orderData = orderSnap.data();

        // Check if already processed
        if (orderData?.status === "completed") {
            console.log(`✅ [BAZIK WEBHOOK] Order ${orderId} already completed. Ignored.`);
            return NextResponse.json({ message: "Already completed" }, { status: 200 });
        }

        if (status === "completed" || status === "success" || status === "paid") {
            console.log("💰 [BAZIK WEBHOOK] Payment successful. Updating order...");

            await orderRef.update({
                status: "completed",
                paymentMethod: "moncash",
                paidAt: Timestamp.now(),
                transactionId: transactionId || "bazik_unknown",
            });

            // Create Enrollment / Unlock Content
            const { userId, productId, productType } = orderData as any;
            // Note: userId is stored as string in Order, but we need Reference for Enrollment

            console.log(`🔓 [BAZIK WEBHOOK] Unlocking content (${productType}) for user ${userId}...`);

            if (productType === "course" || productType === "ebook") {
                const enrollmentsRef = adminDb.collection("enrollments");
                const productCollection = productType === "course" ? "courses" : "ebooks";

                // Check for existing enrollment
                const userRef = adminDb.collection("users").doc(userId); // userId is string in orderData
                const productRef = adminDb.collection(productCollection).doc(productId.id || productId);
                // productId in orderData is a DocumentReference, so productId.id should work if it's a ref object, 
                // or correct path if it is stored as ref. 
                // Firestore Admin SDK returns DocumentReference objects.

                // Let's ensure we use the reference correctly.
                // In ProductDrawer, we saved productId as a DocumentReference.
                // When reading from admin SDK, it should be a reference.

                const existingEnrollment = await enrollmentsRef
                    .where("userId", "==", userRef)
                    .where("productId", "==", productRef)
                    .get();

                if (existingEnrollment.empty) {
                    await enrollmentsRef.add({
                        userId: userRef,
                        productId: productRef,
                        productType: productType,
                        orderId: orderId,
                        status: "active",
                        enrolledAt: Timestamp.now(),
                        lastAccessedAt: Timestamp.now(),
                        progress: 0,
                        completedLessons: []
                    });
                    console.log("✅ [BAZIK WEBHOOK] Enrollment created successfully.");
                } else {
                    console.log("⚠️ [BAZIK WEBHOOK] User already enrolled.");
                }
            }

        } else if (status === "failed" || status === "cancelled") {
            console.log("❌ [BAZIK WEBHOOK] Payment failed/cancelled.");
            await orderRef.update({
                status: "failed",
                failedAt: Timestamp.now(),
                transactionId: transactionId || "bazik_failed"
            });
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("🔥 [BAZIK WEBHOOK ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

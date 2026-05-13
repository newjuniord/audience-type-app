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

        // Bazik Payload Structure Analysis
        // We look for referenceId (our orderId) or others provided by Bazik
        const orderId = payload.referenceId ||
            payload.reference_id ||
            payload.metadata?.referenceId ||
            payload.orderId ||
            payload.order_id;

        const rawStatus = (payload.status || payload.state || "").toString().toLowerCase();
        const transactionId = payload.transactionId || payload.transaction_id || payload.id;

        if (!orderId) {
            console.warn("⚠️ [BAZIK WEBHOOK] Missing order identifier in payload.");
            return NextResponse.json({ message: "Ignored: No order identifier" }, { status: 200 });
        }

        console.log(`🔎 [BAZIK WEBHOOK] Processing Order ID: ${orderId}, Raw Status: ${rawStatus}`);

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

        const successStatuses = ["completed", "success", "paid", "success_payment", "successful"];
        const failureStatuses = ["failed", "cancelled", "canceled", "rejected", "error"];

        if (successStatuses.includes(rawStatus) || payload.success === true) {
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

                const userRef = adminDb.collection("users").doc(userId);
                const productRef = adminDb.collection(productCollection).doc(productId.id || productId);

                // Fetch extra metadata for enrollment
                const [productSnap, userSnap] = await Promise.all([
                    productRef.get(),
                    userRef.get()
                ]);

                const pData = productSnap.exists ? productSnap.data() : {};
                const uData = userSnap.exists ? userSnap.data() : {};

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
                        accessGranted: true,
                        enrolledAt: Timestamp.now(),
                        lastAccessedAt: Timestamp.now(),
                        progress: 0,
                        completedLessons: [],
                        currentLessonId: "",
                        downloadCount: "0",
                        // Metadata fields for dashboard
                        totalLessons: pData?.totalLessons || 0,
                        productTitle: pData?.title || orderData?.productTitle || "",
                        productThumbnailUrl: pData?.thumbnail || pData?.coverImage || orderData?.productThumbnailUrl || "",
                        userEmail: uData?.email || orderData?.userEmail || "",
                        userName: uData?.name || orderData?.userName || ""
                    });
                    console.log("✅ [BAZIK WEBHOOK] Enrollment created successfully with full metadata.");
                } else {
                    console.log("⚠️ [BAZIK WEBHOOK] User already enrolled.");
                }
            }

        } else if (failureStatuses.includes(rawStatus)) {
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

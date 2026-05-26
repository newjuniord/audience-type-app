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

                // Create alert for course/ebook
                try {
                    const typeLabel = productType === "course" ? "Kou" : "Ebook";
                    await adminDb.collection("alerts").add({
                        userId: userId,
                        category: "utility",
                        type: "payment_success",
                        title: `✅ Peman ou an pase !`,
                        body: `Ou gen aksè ak ${typeLabel.toLowerCase()} ou an kounye a: ${pData?.title || orderData?.productTitle || ""}.`,
                        isRead: false,
                        icon: "check_circle",
                        iconColor: "text-emerald-400",
                        iconBg: "bg-emerald-500/10",
                        actionUrl: "/dashboard",
                        actionLabel: "Wè pwodwi m yo",
                        createdAt: Timestamp.now(),
                    });
                } catch (e) {
                    console.error("❌ [BAZIK WEBHOOK] Error creating alert:", e);
                }

            } else if (productType === "service" || productType === "booking") {
                try {
                    const svcId = productId.id || productId;
                    const bookingSnap = await adminDb.collection("bookingApplications")
                        .where("usersId", "==", userId)
                        .where("bookingsId", "==", svcId)
                        .where("status", "==", "pending")
                        .get();

                    if (!bookingSnap.empty) {
                        const sorted = bookingSnap.docs.sort((a, b) => {
                            const aMs = a.data().createdAt?.toMillis?.() || 0;
                            const bMs = b.data().createdAt?.toMillis?.() || 0;
                            return bMs - aMs;
                        });
                        const bookingDoc = sorted[0];
                        const bookingData = bookingDoc.data();

                        await bookingDoc.ref.update({
                            status: "accepted",
                            paidAt: Timestamp.now(),
                            orderId: orderId,
                        });

                        const bookingDate = bookingData.bookingDate || "";
                        const bookingTime = bookingData.bookingTime || "";
                        let dateLabel = bookingDate;
                        let timeLabel = bookingTime;

                        if (bookingDate) {
                            const [y, m, d] = bookingDate.split("-").map(Number);
                            const MOIS = ["Janvye","Fevriye","Mas","Avril","Me","Jen","Jiyè","Out","Septanm","Oktòb","Novanm","Desanm"];
                            dateLabel = `${d} ${MOIS[m - 1]} ${y}`;
                        }

                        if (bookingTime) {
                            const [h, m] = bookingTime.split(":").map(Number);
                            const period = h >= 12 ? "PM" : "AM";
                            let h12 = h % 12;
                            if (h12 === 0) h12 = 12;
                            const mm = m > 0 ? `:${String(m).padStart(2, "0")}` : "";
                            timeLabel = `${h12}${mm} ${period}`;
                        }

                        const alertBody = bookingDate && bookingTime
                            ? `Konsiltasyon ou a konfime pou ${dateLabel} a ${timeLabel}. Nou pral kontakte w pa WhatsApp.`
                            : `Konsiltasyon ou a konfime. Nou pral kontakte w pa WhatsApp.`;

                        await adminDb.collection("alerts").add({
                            userId: userId,
                            category: "utility",
                            type: "booking_reminder",
                            title: "✅ Konsiltasyon ou konfime !",
                            body: alertBody,
                            isRead: false,
                            icon: "event_available",
                            iconColor: "text-emerald-400",
                            iconBg: "bg-emerald-500/10",
                            actionUrl: "/dashboard",
                            actionLabel: "Wè detay",
                            createdAt: Timestamp.now(),
                        });
                    }
                } catch (e) {
                    console.error("❌ [BAZIK WEBHOOK] Error confirming booking:", e);
                }
            }

        } else if (failureStatuses.includes(rawStatus)) {
            console.log("❌ [BAZIK WEBHOOK] Payment failed/cancelled.");
            await orderRef.update({
                status: "failed",
                failedAt: Timestamp.now(),
                transactionId: transactionId || "bazik_failed"
            });
            
            try {
                const { userId, productType } = orderData as any;
                let productLabel = "Pwodwi a";
                if (productType === "course") productLabel = "Kou a";
                else if (productType === "ebook") productLabel = "Ebook la";
                else if (productType === "service" || productType === "booking") productLabel = "Konsiltasyon an";

                await adminDb.collection("alerts").add({
                    userId: userId,
                    category: "utility",
                    type: "payment_failed",
                    title: `❌ Peman an echwe`,
                    body: `Peman ou te fè pou ${productLabel.toLowerCase()} pa reyisi. Tanpri re-eseye ankò, ou byen kontakte nou si w bezwen èd.`,
                    isRead: false,
                    icon: "error",
                    iconColor: "text-red-400",
                    iconBg: "bg-red-500/10",
                    actionUrl: "/dashboard/chat",
                    actionLabel: "Kontakte nou",
                    createdAt: Timestamp.now(),
                });
            } catch (e) {
                console.error("❌ [BAZIK WEBHOOK] Error creating failure alert:", e);
            }
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("🔥 [BAZIK WEBHOOK ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: Request) {
    try {
        const { orderId, bzkOrderId } = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
        }

        const BAZIK_USER_ID = process.env.BAZIK_USER_ID?.trim();
        const BAZIK_SECRET_KEY = process.env.BAZIK_SECRET_KEY?.trim();

        if (!BAZIK_USER_ID || !BAZIK_SECRET_KEY) {
            console.error("Missing Bazik credentials");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // 1. Get Access Token
        const tokenResponse = await fetch("https://api.bazik.io/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userID: BAZIK_USER_ID,
                secretKey: BAZIK_SECRET_KEY,
            }),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.token) {
            return NextResponse.json({ error: "Failed to authenticate with provider" }, { status: 502 });
        }

        const accessToken = tokenData.token;

        // 2. Check Order Status on Bazik
        const verificationId = bzkOrderId || orderId;
        console.log(`🚀 [BAZIK VERIFY] Fetching from Bazik API: https://api.bazik.io/order/${verificationId}`);

        const statusResponse = await fetch(`https://api.bazik.io/order/${verificationId}`, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        const statusData = await statusResponse.json();
        console.log(`📦 [BAZIK VERIFY] Status Data for ${verificationId}:`, JSON.stringify(statusData, null, 2));

        const adminDb = getAdminDb();
        const orderRef = adminDb.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const orderData = orderSnap.data();
        const normalizedStatus = (statusData.status || "").toLowerCase();
        const successStatuses = ["completed", "success", "paid", "success_payment", "successful", "succeeded"];

        if (orderData?.status === "completed" || successStatuses.includes(normalizedStatus)) {
            if (orderData?.status !== "completed") {
                console.log("✅ [BAZIK VERIFY] Payment confirmed manually. Updating order...");
                await orderRef.update({
                    status: "completed",
                    paymentMethod: "moncash",
                    paidAt: Timestamp.now(),
                    transactionId: statusData.transactionId || `manual_verify_${verificationId}`,
                });

                // Unlock Content
                const { userId, productId, productType } = orderData as any;
                if (productType === "course" || productType === "ebook") {
                    const userRef = adminDb.collection("users").doc(userId);
                    const productCollection = productType === "course" ? "courses" : "ebooks";
                    const productRef = adminDb.collection(productCollection).doc(productId.id || productId);

                    const [productSnap, userSnap] = await Promise.all([
                        productRef.get(),
                        userRef.get()
                    ]);

                    const pData = productSnap.exists ? productSnap.data() : {};
                    const uData = userSnap.exists ? userSnap.data() : {};

                    const enrollmentsRef = adminDb.collection("enrollments");
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
                            totalLessons: pData?.totalLessons || 0,
                            productTitle: pData?.title || orderData?.productTitle || "",
                            productThumbnailUrl: pData?.thumbnail || pData?.coverImage || orderData?.productThumbnailUrl || "",
                            userEmail: uData?.email || orderData?.userEmail || "",
                            userName: uData?.name || orderData?.userName || ""
                        });
                    }
                }
            }

            return NextResponse.json({ status: "succeeded", order: (await orderRef.get()).data() });
        }

        return NextResponse.json({
            status: normalizedStatus === "failed" ? "failed" : "pending",
            order: orderSnap.data()
        });

    } catch (error: any) {
        console.error("Bazik Verify Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

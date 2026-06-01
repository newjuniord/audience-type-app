import { NextResponse } from "next/server";

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

        const { supabaseAdmin } = await import("@/lib/supabase/admin");
        const { data: orderData } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();

        if (!orderData) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const normalizedStatus = (statusData.status || "").toLowerCase();
        const successStatuses = ["completed", "success", "paid", "success_payment", "successful", "succeeded"];

        const now = new Date().toISOString();

        if (orderData?.status === "completed" || successStatuses.includes(normalizedStatus)) {
            if (orderData?.status !== "completed") {
                console.log("✅ [BAZIK VERIFY] Payment confirmed manually. Updating order...");
                
                const transactionId = statusData.transactionId || `manual_verify_${verificationId}`;
                await supabaseAdmin.from("orders").update({
                    status: "completed",
                    paymentMethod: "moncash",
                    paidAt: now,
                    transactionId: transactionId,
                }).eq("id", orderId);

                // Unlock Content
                const { userId, productId, productType } = orderData;
                if (productType === "course" || productType === "ebook") {
                    const productCollection = productType === "course" ? "courses" : "ebooks";

                    const { data: pData } = await supabaseAdmin.from(productCollection).select("*").eq("id", productId).maybeSingle();
                    const { data: uData } = await supabaseAdmin.from("users").select("*").eq("id", userId).maybeSingle();

                    const { data: existingEnrollment } = await supabaseAdmin.from("enrollments")
                        .select("id")
                        .eq("userId", userId)
                        .eq("productId", productId)
                        .maybeSingle();

                    if (!existingEnrollment) {
                        await supabaseAdmin.from("enrollments").insert({
                            id: crypto.randomUUID(),
                            userId: userId,
                            productId: productId,
                            productType: productType,
                            orderId: orderId,
                            status: "active",
                            accessGranted: true,
                            enrolledAt: now,
                            lastAccessedAt: now,
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

            const { data: updatedOrder } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
            return NextResponse.json({ status: "succeeded", order: updatedOrder });
        }

        return NextResponse.json({
            status: normalizedStatus === "failed" ? "failed" : "pending",
            order: orderData
        });

    } catch (error: any) {
        console.error("Bazik Verify Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

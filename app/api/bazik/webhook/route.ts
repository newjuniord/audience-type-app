import { NextResponse } from "next/server";

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

        const { supabaseAdmin } = await import("@/lib/supabase/admin");

        const { data: orderData, error: orderError } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();

        if (orderError || !orderData) {
            console.error(`❌ [BAZIK WEBHOOK] Order ${orderId} not found!`);
            // Return 200 to stop retries if order doesn't exist
            return NextResponse.json({ message: "Order not found" }, { status: 200 });
        }

        // Check if already processed
        if (orderData?.status === "completed") {
            console.log(`✅ [BAZIK WEBHOOK] Order ${orderId} already completed. Ignored.`);
            return NextResponse.json({ message: "Already completed" }, { status: 200 });
        }

        const successStatuses = ["completed", "success", "paid", "success_payment", "successful"];
        const failureStatuses = ["failed", "cancelled", "canceled", "rejected", "error"];
        
        const now = new Date().toISOString();

        if (successStatuses.includes(rawStatus) || payload.success === true) {
            console.log("💰 [BAZIK WEBHOOK] Payment successful. Updating order...");

            await supabaseAdmin.from("orders").update({
                status: "completed",
                paymentMethod: "moncash",
                paidAt: now,
                transactionId: transactionId || "bazik_unknown",
            }).eq("id", orderId);

            // Create Enrollment / Unlock Content
            const { userId, productId, productType } = orderData as any;

            console.log(`🔓 [BAZIK WEBHOOK] Unlocking content (${productType}) for user ${userId}...`);

            if (productType === "course" || productType === "ebook") {
                const productCollection = productType === "course" ? "courses" : "ebooks";

                // Fetch extra metadata for enrollment
                const { data: pData } = await supabaseAdmin.from(productCollection).select("*").eq("id", productId).maybeSingle();
                const { data: uData } = await supabaseAdmin.from("users").select("*").eq("id", userId).maybeSingle();

                const { data: existingEnrollment } = await supabaseAdmin
                    .from("enrollments")
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
                    await supabaseAdmin.from("alerts").insert({
                        id: crypto.randomUUID(),
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
                        createdAt: now,
                    });
                } catch (e) {
                    console.error("❌ [BAZIK WEBHOOK] Error creating alert:", e);
                }

            } else if (productType === "service" || productType === "booking") {
                try {
                    const { data: bookingDocs, error: bookingErr } = await supabaseAdmin.from("bookingApplications")
                        .select("*")
                        .eq("usersId", userId)
                        .eq("bookingsId", productId)
                        .eq("status", "pending")
                        .order("createdAt", { ascending: false });

                    if (bookingDocs && bookingDocs.length > 0) {
                        const bookingDoc = bookingDocs[0];
                        const bookingData = bookingDoc;

                        await supabaseAdmin.from("bookingApplications").update({
                            status: "accepted",
                            paidAt: now,
                            orderId: orderId,
                        }).eq("id", bookingDoc.id);

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

                        await supabaseAdmin.from("alerts").insert({
                            id: crypto.randomUUID(),
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
                            createdAt: now,
                        });
                    }
                } catch (e) {
                    console.error("❌ [BAZIK WEBHOOK] Error confirming booking:", e);
                }
            }

        } else if (failureStatuses.includes(rawStatus)) {
            console.log("❌ [BAZIK WEBHOOK] Payment failed/cancelled.");
            await supabaseAdmin.from("orders").update({
                status: "failed",
                failedAt: now,
                transactionId: transactionId || "bazik_failed"
            }).eq("id", orderId);
            
            try {
                const { userId, productType } = orderData as any;
                let productLabel = "Pwodwi a";
                if (productType === "course") productLabel = "Kou a";
                else if (productType === "ebook") productLabel = "Ebook la";
                else if (productType === "service" || productType === "booking") productLabel = "Konsiltasyon an";

                await supabaseAdmin.from("alerts").insert({
                    id: crypto.randomUUID(),
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
                    createdAt: now,
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

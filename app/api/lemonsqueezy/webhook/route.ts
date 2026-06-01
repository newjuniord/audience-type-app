import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-signature") || "";
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

        if (!secret) {
            console.error("❌ [WEBHOOK] Lemon Squeezy webhook secret is missing.");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        // Vérification de la signature
        const hmac = crypto.createHmac("sha256", secret);
        const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
        const signatureBuffer = Buffer.from(signature, "utf8");

        if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
            console.error("❌ [WEBHOOK] Invalid signature.");
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;
        
        console.log(`🔔 [WEBHOOK] Event received: ${eventName}`);

        // On gère uniquement les commandes créées (payées)
        if (eventName !== "order_created") {
            return NextResponse.json({ message: "Event ignored" }, { status: 200 });
        }

        const lsOrderId = payload.data.id;
        const attributes = payload.data.attributes;
        const customData = payload.meta.custom_data || {};
        
        const internalOrderId = customData.orderId;
        
        if (!internalOrderId) {
            console.warn("⚠️ [WEBHOOK] No internal orderId provided in custom_data.");
            return NextResponse.json({ message: "Missing internal orderId" }, { status: 200 });
        }

        const lsStatus = attributes.status?.toLowerCase();
        
        // Initialisation de Supabase Admin
        const { supabaseAdmin } = await import("@/lib/supabase/admin");

        const { data: orderData, error: orderError } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("id", internalOrderId)
            .single();

        if (orderError || !orderData) {
            console.error(`❌ [WEBHOOK] Order ${internalOrderId} not found.`);
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Eviter de traiter deux fois la même commande
        if (orderData?.status === "paid") {
            console.log(`✅ [WEBHOOK] Order ${internalOrderId} already marked as paid.`);
            return NextResponse.json({ message: "Already processed" }, { status: 200 });
        }

        if (lsStatus === "paid" || lsStatus === "succeeded") {
            const finalAmount = (attributes.total || 0) / 100;
            const customerEmail = attributes.user_email || "";
            const lemonSqueezyCustomerId = attributes.customer_id?.toString() || "";

            let finalUserEmail = orderData?.userEmail || customerEmail;

            // Self-healing: Update user profile with real email & customer ID
            if (orderData?.userId) {
                try {
                    const { data: userData } = await supabaseAdmin
                        .from("users")
                        .select("*")
                        .eq("id", orderData.userId)
                        .single();

                    if (userData) {
                        const currentEmail = userData.email || "";
                        const isFakeEmail = !currentEmail || currentEmail.endsWith("@audiencetype.com");

                        const userUpdates: any = {};
                        if (lemonSqueezyCustomerId) {
                            userUpdates.lemonSqueezyCustomerId = lemonSqueezyCustomerId;
                        }

                        if (isFakeEmail && customerEmail && !customerEmail.endsWith("@audiencetype.com")) {
                            console.log(`🌟 [WEBHOOK] Promoting virtual email "${currentEmail}" to real email "${customerEmail}" for user ${orderData.userId}`);
                            userUpdates.email = customerEmail;
                            finalUserEmail = customerEmail;

                            try {
                                await supabaseAdmin.auth.admin.updateUserById(orderData.userId, { email: customerEmail });
                            } catch (authErr: any) {
                                console.warn(`⚠️ [WEBHOOK] Failed to update email in Supabase Auth:`, authErr.message);
                            }
                        }

                        if (Object.keys(userUpdates).length > 0) {
                            await supabaseAdmin.from("users").update(userUpdates).eq("id", orderData.userId);
                        }
                    }
                } catch (userErr: any) {
                    console.error(`❌ [WEBHOOK] Error updating user profile:`, userErr.message);
                }
            }

            const now = new Date().toISOString();
            const updateData: any = {
                status: "paid",
                amount: finalAmount,
                transactionId: lsOrderId,
                updatedAt: now
            };
            
            if (finalUserEmail && finalUserEmail !== orderData?.userEmail) {
                updateData.userEmail = finalUserEmail;
            }
            
            await supabaseAdmin.from("orders").update(updateData).eq("id", internalOrderId);

            // ── COURS / EBOOK : Création de l'inscription ──────────────────────
            if (orderData && orderData.productType !== "service" && orderData.productType !== "booking") {
                const { data: existingEnrollment } = await supabaseAdmin
                    .from("enrollments")
                    .select("id")
                    .eq("userId", orderData.userId)
                    .eq("productId", orderData.productId)
                    .limit(1)
                    .maybeSingle();

                if (!existingEnrollment) {
                    console.log(`📚 [WEBHOOK] Création de l'inscription pour ${finalUserEmail}`);
                    
                    const newEnrollment = {
                        id: crypto.randomUUID(),
                        accessGranted: true,
                        completedLessons: [],
                        currentLessonId: "",
                        downloadCount: "0",
                        enrolledAt: now,
                        lastAccessedAt: now,
                        orderId: internalOrderId,
                        productId: orderData.productId,
                        productThumbnailUrl: orderData.productThumbnailUrl,
                        productTitle: orderData.productTitle,
                        productType: orderData.productType,
                        progress: 0,
                        status: "active",
                        totalLessons: 0,
                        userEmail: finalUserEmail,
                        userId: orderData.userId,
                        userName: orderData.userName || "Étudiant"
                    };

                    await supabaseAdmin.from("enrollments").insert(newEnrollment);
                }

                try {
                    const typeLabel = orderData?.productType === "course" ? "Kou" : "Ebook";
                    await supabaseAdmin.from("alerts").insert({
                        id: crypto.randomUUID(),
                        userId: orderData?.userId,
                        category: "utility",
                        type: "payment_success",
                        title: `✅ Peman ou an pase !`,
                        body: `Ou gen aksè ak ${typeLabel.toLowerCase()} ou an kounye a: ${orderData?.productTitle || ""}.`,
                        isRead: false,
                        icon: "check_circle",
                        iconColor: "text-emerald-400",
                        iconBg: "bg-emerald-500/10",
                        actionUrl: "/dashboard",
                        actionLabel: "Wè pwodwi m yo",
                        createdAt: now,
                    });
                } catch (e) {
                    console.error("❌ [WEBHOOK] Error creating course/ebook alert:", e);
                }
            }

            // ── SERVICE / CONSULTATION : Confirmation de la réservation ────────
            if (orderData && (orderData.productType === "service" || orderData.productType === "booking")) {
                try {
                    console.log(`📅 [WEBHOOK] Recherche du bookingApplication pour userId=${orderData.userId} / serviceId=${orderData.productId}`);

                    // Chercher toutes les réservations pending de cet utilisateur pour ce service
                    const { data: bookingDocs, error: bookingErr } = await supabaseAdmin
                        .from("bookingApplications")
                        .select("*")
                        .eq("usersId", orderData.userId)
                        .eq("bookingsId", orderData.productId)
                        .eq("status", "pending")
                        .order("createdAt", { ascending: false });

                    if (bookingErr || !bookingDocs || bookingDocs.length === 0) {
                        console.warn(`⚠️ [WEBHOOK] Aucun bookingApplication pending trouvé pour userId=${orderData.userId} / serviceId=${orderData.productId}`);
                    } else {
                        const bookingDoc = bookingDocs[0];
                        const bookingData = bookingDoc;

                        await supabaseAdmin.from("bookingApplications").update({
                            status: "accepted",
                            paidAt: now,
                            orderId: internalOrderId,
                        }).eq("id", bookingDoc.id);

                        console.log(`✅ [WEBHOOK] bookingApplication ${bookingDoc.id} → status: accepted`);

                        // ── Alerte in-app pour l'utilisateur ──────────────────
                        try {
                            const bookingDate: string = bookingData.bookingDate || "";
                            const bookingTime: string = bookingData.bookingTime || "";

                            // Formater date et heure en AM/PM pour l'alerte
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
                                ? `Konsiltasyon ou a konfime pou ${dateLabel} a ${timeLabel}. Nou pral kontakte w pa WhatsApp pou konfime detay yo.`
                                : `Konsiltasyon ou a konfime. Nou pral kontakte w pa WhatsApp pou planifye lè egzak la.`;

                            await supabaseAdmin.from("alerts").insert({
                                id: crypto.randomUUID(),
                                userId: orderData.userId,
                                category: "utility",
                                type: "booking_reminder",
                                title: "✅ Konsiltasyon ou konfime !",
                                body: alertBody,
                                isRead: false,
                                icon: "event_available",
                                iconColor: "text-emerald-400",
                                iconBg: "bg-emerald-500/10",
                                actionUrl: "/consultation",
                                actionLabel: "Wè detay",
                                createdAt: now,
                            });

                            console.log(`🔔 [WEBHOOK] Alerte de confirmation envoyée à userId=${orderData.userId}`);
                        } catch (alertErr: any) {
                            console.error(`❌ [WEBHOOK] Erreur lors de l'envoi de l'alerte:`, alertErr.message);
                        }
                    }
                } catch (bookingErr: any) {
                    console.error(`❌ [WEBHOOK] Erreur lors de la confirmation du bookingApplication:`, bookingErr.message);
                }
            }
            
            console.log(`✅ [WEBHOOK] Successfully processed order ${internalOrderId}.`);

        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("🔥 [WEBHOOK] Error processing webhook:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

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
        
        // Initialisation de Firestore
        const { getAdminDb, getAdminAuth } = await import("@/lib/firebase-admin");
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        const orderRef = adminDb.collection("orders").doc(internalOrderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            console.error(`❌ [WEBHOOK] Order ${internalOrderId} not found.`);
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        let orderData = orderSnap.data();

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
                    const userRef = adminDb.collection("users").doc(orderData.userId);
                    const userSnap = await userRef.get();

                    if (userSnap.exists) {
                        const userData = userSnap.data();
                        const currentEmail = userData?.email || "";
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
                                await adminAuth.updateUser(orderData.userId, { email: customerEmail });
                            } catch (authErr: any) {
                                console.warn(`⚠️ [WEBHOOK] Failed to update email in Firebase Auth:`, authErr.message);
                            }
                        }

                        if (Object.keys(userUpdates).length > 0) {
                            await userRef.update(userUpdates);
                        }
                    }
                } catch (userErr: any) {
                    console.error(`❌ [WEBHOOK] Error updating user profile:`, userErr.message);
                }
            }

            const now = new Date();
            const updateData: any = {
                status: "paid",
                amount: finalAmount,
                transactionId: lsOrderId,
                updatedAt: now
            };
            
            if (finalUserEmail && finalUserEmail !== orderData?.userEmail) {
                updateData.userEmail = finalUserEmail;
            }
            
            await orderRef.update(updateData);

            // ── COURS / EBOOK : Création de l'inscription ──────────────────────
            if (orderData && orderData.productType !== "service" && orderData.productType !== "booking") {
                const enrollmentsRef = adminDb.collection("enrollments");

                const existingEnrollment = await enrollmentsRef
                    .where("userId", "==", orderData?.userId)
                    .where("productId", "==", orderData?.productId)
                    .limit(1)
                    .get();

                if (existingEnrollment.empty) {
                    console.log(`📚 [WEBHOOK] Création de l'inscription pour ${finalUserEmail}`);
                    await enrollmentsRef.add({
                        accessGranted: true,
                        completedLessons: [],
                        currentLessonId: "",
                        downloadCount: "0",
                        enrolledAt: now,
                        lastAccessedAt: now,
                        orderId: internalOrderId,
                        productId: orderData?.productId,
                        productThumbnailUrl: orderData?.productThumbnailUrl,
                        productTitle: orderData?.productTitle,
                        productType: orderData?.productType,
                        progress: 0,
                        status: "active",
                        totalLessons: 0,
                        userEmail: finalUserEmail,
                        userId: orderData?.userId,
                        userName: orderData?.userName || "Étudiant"
                    });
                }

                try {
                    const typeLabel = orderData?.productType === "course" ? "Kou" : "Ebook";
                    await adminDb.collection("alerts").add({
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
                        createdAt: Timestamp.now(),
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
                    const bookingSnap = await adminDb.collection("bookingApplications")
                        .where("usersId", "==", orderData.userId)
                        .where("bookingsId", "==", orderData.productId)
                        .where("status", "==", "pending")
                        .get();

                    if (bookingSnap.empty) {
                        console.warn(`⚠️ [WEBHOOK] Aucun bookingApplication pending trouvé pour userId=${orderData.userId} / serviceId=${orderData.productId}`);
                    } else {
                        // Trier par createdAt pour confirmer le plus récent
                        const sorted = bookingSnap.docs.sort((a, b) => {
                            const aMs = a.data().createdAt?.toMillis?.() || 0;
                            const bMs = b.data().createdAt?.toMillis?.() || 0;
                            return bMs - aMs; // plus récent en premier
                        });

                        const bookingDoc = sorted[0];
                        const bookingData = bookingDoc.data();

                        await bookingDoc.ref.update({
                            status: "accepted",
                            paidAt: now,
                            orderId: internalOrderId,
                        });

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

                            await adminDb.collection("alerts").add({
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
        } else if (lsStatus === "refunded") {
            await orderRef.update({
                status: "refunded",
                updatedAt: new Date()
            });
            console.log(`ℹ️ [WEBHOOK] Order ${internalOrderId} marked as refunded.`);
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("🔥 [WEBHOOK] Error processing webhook:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

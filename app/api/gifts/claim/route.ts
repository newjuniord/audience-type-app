import { NextResponse } from "next/server";

/**
 * POST /api/gifts/claim
 * Body: { giftId, userId, userEmail, userName, invitationCode? }
 * Retourne { result: ClaimResult }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { giftId, userId, userEmail, userName, invitationCode } = body;

        if (!giftId || !userId) {
            return NextResponse.json({ error: "giftId et userId sont requis" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/lib/supabase/admin");

        const { data: giftData, error: giftError } = await supabaseAdmin
            .from("gifts")
            .select("*")
            .eq("id", giftId)
            .single();

        if (giftError || !giftData) {
            throw new Error("Cadeau introuvable");
        }

        const gift = giftData;

        // 1. Vérifications de base
        if (!gift.isActive) return NextResponse.json({ result: "inactive" });

        if (gift.expirationDate && new Date(gift.expirationDate).getTime() < Date.now()) {
            return NextResponse.json({ result: "expired" });
        }

        if (gift.maxUses !== null && gift.currentUsesCount >= gift.maxUses) {
            return NextResponse.json({ result: "max_uses_reached" });
        }

        // 2. Vérifier si l'utilisateur possède le produit déclencheur
        let hasTriggerProduct = false;
        
        if (gift.triggerProductId) {
            const { data: triggerSnap } = await supabaseAdmin
                .from("enrollments")
                .select("id")
                .eq("userId", userId)
                .eq("productId", gift.triggerProductId)
                .limit(1);

            if (triggerSnap && triggerSnap.length > 0) {
                hasTriggerProduct = true;
            }
        }

        if (gift.requiresInvitation && gift.invitationCode && !hasTriggerProduct) {
            if (!invitationCode || invitationCode.trim() === "") {
                return NextResponse.json({ result: "missing_code" });
            }
            if (invitationCode.trim().toUpperCase() !== gift.invitationCode.trim().toUpperCase()) {
                return NextResponse.json({ result: "invalid_code" });
            }
        }

        // 3. Vérifier si l'utilisateur est déjà inscrit à ce cadeau
        const { data: existingSnap } = await supabaseAdmin
            .from("enrollments")
            .select("id")
            .eq("userId", userId)
            .eq("productId", gift.giftProductId)
            .limit(1)
            .maybeSingle();

        if (existingSnap) {
            return NextResponse.json({ result: "already_enrolled" });
        }

        const now = new Date().toISOString();

        // 4. Créer l'enrollment
        const enrollmentData = {
            id: crypto.randomUUID(),
            userId,
            userEmail,
            userName,
            productId: gift.giftProductId,
            productTitle: gift.giftProductTitle,
            productType: gift.giftProductType,
            productThumbnailUrl: gift.giftProductThumbnailUrl || "",
            accessGranted: true,
            enrolledAt: now,
            lastAccessedAt: now,
            status: "active",
            progress: 0,
            completedLessons: [],
            currentLessonId: "",
            totalLessons: 0,
            downloadCount: "0",
            isGift: true,
            giftId: giftId
        };

        const { error: enrollError } = await supabaseAdmin.from("enrollments").insert(enrollmentData);
        if (enrollError) throw enrollError;

        // 5. Incrémenter le compteur du cadeau
        await supabaseAdmin
            .from("gifts")
            .update({ currentUsesCount: gift.currentUsesCount + 1 })
            .eq("id", giftId);

        // 6. Incrémenter le compteur d'enrollments de l'utilisateur
        const { data: user } = await supabaseAdmin.from("users").select("enrollmentCount").eq("id", userId).maybeSingle();
        if (user) {
            await supabaseAdmin
                .from("users")
                .update({ enrollmentCount: (user.enrollmentCount || 0) + 1 })
                .eq("id", userId);
        } else {
            // User not found in public.users, create stub if necessary?
            // Fallback: we assume user exists or we don't care if enrollment count update fails
        }

        return NextResponse.json({ result: "success" });

    } catch (err: any) {
        console.error("❌ [gifts/claim]", err);
        return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

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

        const adminDb = getAdminDb();
        const giftRef = adminDb.collection("gifts").doc(giftId);

        const result = await adminDb.runTransaction(async (txn) => {
            const giftSnap = await txn.get(giftRef);
            if (!giftSnap.exists) throw new Error("Cadeau introuvable");

            const gift = { id: giftSnap.id, ...giftSnap.data() } as any;

            // 1. Vérifications de base
            if (!gift.isActive) return "inactive";

            if (gift.expirationDate && gift.expirationDate.toMillis() < Date.now()) {
                return "expired";
            }

            if (gift.maxUses !== null && gift.currentUsesCount >= gift.maxUses) {
                return "max_uses_reached";
            }

            if (gift.requiresInvitation && gift.invitationCode) {
                if (!invitationCode || invitationCode.trim().toUpperCase() !== gift.invitationCode.trim().toUpperCase()) {
                    return "invalid_code";
                }
            }

            // 2. Vérifier si l'utilisateur est déjà inscrit
            const enrollmentsRef = adminDb.collection("enrollments");
            const qString = enrollmentsRef.where("userId", "==", userId).where("productId", "==", gift.giftProductId);
            const existingSnap = await txn.get(qString);
            if (!existingSnap.empty) return "already_enrolled";

            // 3. Créer l'enrollment
            const enrollmentData = {
                userId,
                userEmail,
                userName,
                productId: gift.giftProductId,
                productTitle: gift.giftProductTitle,
                productType: gift.giftProductType,
                productThumbnailUrl: gift.giftProductThumbnailUrl || "",
                accessGranted: true,
                enrolledAt: Timestamp.now(),
                lastAccessedAt: Timestamp.now(),
                status: "active",
                progress: 0,
                completedLessons: [],
                currentLessonId: "",
                totalLessons: 0,
                downloadCount: "0",
                isGift: true,
                giftId: giftId
            };

            const newEnrollRef = enrollmentsRef.doc();
            txn.set(newEnrollRef, enrollmentData);

            // 4. Incrémenter le compteur du cadeau
            txn.update(giftRef, { currentUsesCount: FieldValue.increment(1) });

            // 5. Incrémenter le compteur d'enrollments de l'utilisateur
            const userRef = adminDb.collection("users").doc(userId);
            // We use set with merge in case the user doc doesn't exist yet, to be safe.
            txn.set(userRef, { enrollmentCount: FieldValue.increment(1) }, { merge: true });

            return "success";
        });

        return NextResponse.json({ result });
    } catch (err: any) {
        console.error("❌ [gifts/claim]", err);
        return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
    }
}

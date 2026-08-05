import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { createEnrollment, getEnrollmentsByUser } from '@/lib/enrollments';
import { Gift } from '@/lib/types';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { giftId, userId, userEmail, userName, invitationCode } = body;

        if (!giftId || !userId) {
            return NextResponse.json({ error: 'Missing required fields (giftId, userId)' }, { status: 400 });
        }

        // 1. Fetch the gift
        const giftRef = doc(db, 'gifts', giftId);
        const giftSnap = await getDoc(giftRef);

        if (!giftSnap.exists()) {
            return NextResponse.json({ error: 'Cadeau introuvable.' }, { status: 404 });
        }

        const gift = giftSnap.data() as Gift;

        // 2. Validate conditions
        if (!gift.isActive) {
            return NextResponse.json({ error: 'Ce cadeau n\'est plus actif.' }, { status: 403 });
        }

        if (gift.expirationDate) {
            const expiry = new Date(gift.expirationDate);
            if (expiry < new Date()) {
                return NextResponse.json({ error: 'Ce cadeau a expiré.' }, { status: 403 });
            }
        }

        if (gift.maxUses !== null && gift.maxUses !== undefined) {
            if ((gift.currentUsesCount || 0) >= gift.maxUses) {
                return NextResponse.json({ error: 'La limite d\'utilisation pour ce cadeau a été atteinte.' }, { status: 403 });
            }
        }

        if (gift.requiresInvitation) {
            if (!invitationCode || invitationCode.toUpperCase() !== gift.invitationCode) {
                return NextResponse.json({ error: 'Code d\'invitation invalide.' }, { status: 403 });
            }
        }

        // 3. Verify user hasn't already claimed this specific gift product
        const userEnrollments = await getEnrollmentsByUser(userId);
        const alreadyClaimed = userEnrollments.some(e => e.productId === gift.giftProductId);
        
        if (alreadyClaimed) {
            return NextResponse.json({ error: 'Vous possédez déjà ce cadeau.' }, { status: 400 });
        }

        // 4. Grant the gift (Create Enrollment)
        await createEnrollment({
            userId,
            userEmail: userEmail || "inconnu",
            userName: userName || "Utilisateur",
            productId: gift.giftProductId,
            productTitle: gift.giftProductTitle,
            productType: gift.giftProductType,
            productThumbnailUrl: gift.giftProductThumbnailUrl || "",
            status: "active",
            accessGranted: true,
            progress: 0,
            totalLessons: 0,
            completedLessons: [],
            currentLessonId: "",
            downloadCount: "0"
        });

        // 5. Update the gift's usage count
        await updateDoc(giftRef, {
            currentUsesCount: (gift.currentUsesCount || 0) + 1
        });

        return NextResponse.json({ success: true, message: 'Cadeau réclamé avec succès !' });
    } catch (error: any) {
        console.error("Error claiming gift:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

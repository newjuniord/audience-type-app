import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { reference_id } = body;

        if (!reference_id) {
            return NextResponse.json({ error: "reference_id manquant" }, { status: 400 });
        }

        // 1. Récupérer la commande dans Firestore
        const orderRef = doc(db, "orders", reference_id);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
        }

        const orderData = orderSnap.data();

        // `bookingId` permet au client de confirmer son rendez-vous une fois le paiement validé.
        return NextResponse.json({
            success: true,
            status: orderData.status === "paid" ? "paid" : "pending",
            bookingId: orderData.bookingId || null,
            orderId: reference_id
        });
    } catch (error) {
        console.error("Erreur verify-order Lemon Squeezy:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

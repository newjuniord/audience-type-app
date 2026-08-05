import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // TODO: Implémenter la logique pour initier un paiement Lemon Squeezy
        
        return NextResponse.json({ success: true, message: "Endpoint Lemon Squeezy prêt" });
    } catch (error) {
        console.error("Erreur Lemon Squeezy:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

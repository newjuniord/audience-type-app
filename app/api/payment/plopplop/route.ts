import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // TODO: Implémenter la logique de paiement Plopplop (Moncash / Natcash)
        
        return NextResponse.json({ success: true, message: "Endpoint Plopplop prêt" });
    } catch (error) {
        console.error("Erreur Plopplop:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

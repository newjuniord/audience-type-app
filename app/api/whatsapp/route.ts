import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, message } = body;

    if (!phone) {
      return NextResponse.json({ error: "Numéro de téléphone manquant" }, { status: 400 });
    }

    // Message par défaut si aucun n'est fourni par le client
    const textToSend = message || "🚀 *Félicitations !* Votre paiement a bien été reçu.\n\nVoici votre lien d'accès sécurisé à la plateforme :\n🔗 https://tonsite.com/dashboard\n\nSi vous avez la moindre question, répondez simplement à ce message. À tout de suite de l'autre côté ! 😉";

    // Appel à notre nouvelle fonction utilitaire
    const result = await sendWhatsAppMessage(phone, textToSend);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Erreur de l'API WhatsApp:", error);
    return NextResponse.json(
      { error: "Échec de l'envoi", details: error.message }, 
      { status: 500 }
    );
  }
}

import twilio from 'twilio';

// Assure-toi que ces variables sont définies dans ton fichier .env.local
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// On initialise le client Twilio de manière globale pour le réutiliser
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Envoie un message WhatsApp via Twilio.
 * Cette fonction peut être appelée depuis n'importe quelle API ou Server Action de ton application.
 * 
 * @param toPhone Le numéro de destination (ex: "+509 3456 7890" ou "whatsapp:+50934567890")
 * @param message Le texte du message à envoyer
 * @returns Le résultat de l'envoi (succès et SID)
 */
export async function sendWhatsAppMessage(toPhone: string, message: string) {
  if (!client) {
    console.error("Clés Twilio manquantes dans les variables d'environnement.");
    throw new Error("Configuration Twilio incomplète sur le serveur.");
  }

  // Nettoyage et formatage du numéro (Twilio attend "whatsapp:+CODE_PAYS_NUMERO")
  const cleanPhone = toPhone.replace(/\s+/g, '');
  const toWhatsAppNumber = cleanPhone.startsWith('whatsapp:') 
    ? cleanPhone 
    : cleanPhone.startsWith('+') 
      ? `whatsapp:${cleanPhone}`
      : `whatsapp:+${cleanPhone}`;

  try {
    console.log(`Envoi WhatsApp vers : ${toWhatsAppNumber}`);
    
    const response = await client.messages.create({
      body: message,
      from: twilioWhatsAppNumber,
      to: toWhatsAppNumber
    });
    
    console.log(`✅ Message WhatsApp envoyé avec succès. SID: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error: any) {
    console.error("❌ Erreur Twilio:", error);
    throw new Error(error.message || "Échec de l'envoi du message WhatsApp");
  }
}

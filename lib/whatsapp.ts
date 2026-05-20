import twilio from 'twilio';

// Assure-toi que ces variables sont définies dans ton fichier .env.local
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const envWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER;
const twilioWhatsAppNumber = envWhatsApp 
  ? (envWhatsApp.startsWith('whatsapp:') ? envWhatsApp : `whatsapp:${envWhatsApp}`)
  : 'whatsapp:+14155238886';

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
export async function sendWhatsAppMessage(
  toPhone: string, 
  message: string,
  contentSid?: string,
  contentVariables?: Record<string, string>
) {
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
    
    const params: any = {
      from: twilioWhatsAppNumber,
      to: toWhatsAppNumber
    };

    if (contentSid) {
      params.contentSid = contentSid;
      if (contentVariables) {
        params.contentVariables = JSON.stringify(contentVariables);
      }
      console.log(`Utilisation du Content SID : ${contentSid}`);
    } else {
      params.body = message;
    }
    
    const response = await client.messages.create(params);
    
    console.log(`✅ Message WhatsApp envoyé avec succès. SID: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error: any) {
    console.error("❌ Erreur Twilio:", error);
    throw new Error(error.message || "Échec de l'envoi du message WhatsApp");
  }
}

/**
 * Envoie un SMS standard via Twilio.
 */
export async function sendSmsMessage(toPhone: string, message: string) {
  if (!client) {
    console.error("Clés Twilio manquantes dans les variables d'environnement.");
    throw new Error("Configuration Twilio incomplète sur le serveur.");
  }

  const cleanPhone = toPhone.replace(/\s+/g, '').replace('whatsapp:', '');
  const toSmsNumber = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  
  // Utiliser TWILIO_SMS_NUMBER ou extraire le numéro du format whatsapp:
  const fromNumber = process.env.TWILIO_SMS_NUMBER || 
    (twilioWhatsAppNumber.replace('whatsapp:', ''));

  try {
    console.log(`Envoi SMS vers : ${toSmsNumber} depuis ${fromNumber}`);
    const response = await client.messages.create({
      from: fromNumber,
      to: toSmsNumber,
      body: message
    });
    console.log(`✅ SMS envoyé avec succès. SID: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error: any) {
    console.error("❌ Erreur Twilio SMS:", error);
    throw new Error(error.message || "Échec de l'envoi du SMS");
  }
}

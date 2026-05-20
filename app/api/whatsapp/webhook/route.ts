import { getAdminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";
import { upstashSession } from "@/lib/upstashAuth";
import { formatMessageTemplate } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let phone = "";
    let bodyText = "";
    let profileName = "";
    
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      phone = (formData.get("From") as string) || "";
      bodyText = (formData.get("Body") as string) || "";
      profileName = (formData.get("ProfileName") as string) || "";
    } else {
      const body = await req.json().catch(() => ({}));
      phone = body.phone || body.From || "";
      bodyText = body.body || body.Body || "";
      profileName = body.profileName || body.ProfileName || "";
    }

    if (!phone) {
      return new Response("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Clean phone number (from "whatsapp:+18296692914" to "+18296692914")
    const cleanPhone = phone.replace("whatsapp:", "").trim();
    const cleanBody = bodyText.trim().toLowerCase();

    if (cleanBody === "metem") {
      await upstashSession.open(cleanPhone, 'whatsapp');
    }

    const adminDb = getAdminDb();
    const usersRef = adminDb.collection("users");
    
    // Find user by phone number
    let querySnapshot = await usersRef.where("whatsappNumber", "==", cleanPhone).get();
    if (querySnapshot.empty && cleanPhone.startsWith("+")) {
      querySnapshot = await usersRef.where("whatsappNumber", "==", cleanPhone.substring(1)).get();
    }

    let userId = "";
    let userName = profileName || "Client";

    if (querySnapshot.empty) {
      // User does not exist in database
      if (cleanBody === "metem") {
        // Automatically register the user if they send "metem"
        const newUserRef = usersRef.doc();
        userId = newUserRef.id;
        
        await newUserRef.set({
          whatsappNumber: cleanPhone,
          name: userName,
          email: `${cleanPhone.replace("+", "")}@audiencetype.com`,
          role: "user",
          createdAt: Timestamp.now()
        });
        console.log(`✨ [WHATSAPP WEBHOOK] Nouvel utilisateur créé : ${userName} (${cleanPhone})`);
      } else {
        // Send a guide message if they sent something else
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Bonjour ! Envoyez le mot *metem* pour créer votre compte et recevoir votre code de connexion.</Message></Response>`;
        return new Response(twiml, {
          headers: { "Content-Type": "application/xml" },
        });
      }
    } else {
      // User exists
      const userDoc = querySnapshot.docs[0];
      userId = userDoc.id;
      userName = userDoc.data().name || profileName || "Client";
      console.log(`🔍 [WHATSAPP WEBHOOK] Utilisateur existant trouvé : ${userName} (${cleanPhone})`);
    }

    // Generate token and a 4-digit code
    const token = uuidv4();
    const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 chiffres

    // Token expires in 100 years
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);

    const tempLinkData = {
        userId: userId,
        code: code,
        expiresAt: Timestamp.fromDate(expiresAt),
        used: false,
        createdAt: Timestamp.now()
    };

    // Save to temp_links
    await adminDb.collection("temp_links").doc(token).set(tempLinkData);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "audiencetype.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;
    const link = `${baseUrl}/login/temp?token=${token}`;

    const authTemplate = process.env.TWILIO_TEMPLATE_AUTH || 
        "🔑 *VÉRIFICATION DRJ AKADEMI*\n\nVoici ton code de vérification pour accéder à ton cours : {{code}}\n\nTu peux également te connecter directement en cliquant sur ce lien sécurisé : {{link}}\n\nNe partage jamais ce code.";

    const formattedMessage = formatMessageTemplate(authTemplate, { code: `*${code}*`, link, userName });
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${formattedMessage}</Message></Response>`;

    return new Response(twiml, {
      headers: { "Content-Type": "application/xml" },
    });

  } catch (error: any) {
    console.error("Error in WhatsApp webhook:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

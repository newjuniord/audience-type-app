import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(request: Request) {
    let lockId: string | null = null;
    const db = getAdminDb();
    const auth = getAdminAuth();
    
    try {
        const bodyText = await request.text();
        const bodyParams = new URLSearchParams(bodyText);
        const From = bodyParams.get("From") || "";    // "whatsapp:+18296692914"
        const Body = bodyParams.get("Body") || "";
        const ProfileName = bodyParams.get("ProfileName") || "Client";
        
        if (!From || !Body) {
            console.warn("⚠️ [BOT WEBHOOK] Missing From or Body.");
            return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "application/xml" } });
        }
        
        const phoneNumber = From.replace("whatsapp:", "").trim(); // "+18296692914"
        const otpDocId = From.trim();                          // "whatsapp:+18296692914"
        const rawMessage = Body.trim().toLowerCase();
        const userMessage = rawMessage.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        lockId = `${phoneNumber}_${userMessage}`;
        
        // ── Verrou de sécurité contre les requêtes identiques concurrentes ─────
        const lockRef = db.collection("bot_locks").doc(lockId);
        const isLocked = await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(lockRef);
            if (doc.exists) {
                const data = doc.data();
                const now = Date.now();
                if (data && data.isProcessing && (now - data.lockedAt < 15000)) {
                    return true;
                }
            }
            transaction.set(lockRef, {
                isProcessing: true,
                lockedAt: Date.now()
            });
            return false;
        });
        
        if (isLocked) {
            console.warn(`🔒 [BOT WEBHOOK] Duplicate request blocked by isProcessing lock: ${phoneNumber} -> ${userMessage}`);
            return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "application/xml" } });
        }
        
        console.log(`📩 [BOT WEBHOOK] "${rawMessage}" (normalized: "${userMessage}") from ${phoneNumber} (${ProfileName})`);
        
        const MAX_PER_DAY = 10;
        
        // ── Helper: vérifier le rate limit ───────────────────────────────────
        const checkRateLimit = async (): Promise<{ blocked: boolean; count: number; expireAt: Date | null }> => {
            const otpDoc = await db.collection("otp_code").doc(otpDocId).get();
            const now = new Date();
            if (otpDoc.exists) {
                const data = otpDoc.data()!;
                const expireAt = data.expireAt?.toDate() as Date;
                const count = (data.count || 0) as number;
                if (expireAt && expireAt > now && count >= MAX_PER_DAY) {
                    return { blocked: true, count, expireAt };
                }
                return { blocked: false, count: (expireAt && expireAt > now) ? count : 0, expireAt: expireAt || null };
            }
            return { blocked: false, count: 0, expireAt: null };
        };
        
        // ── Helper: écrire le doc OTP (fenêtre 24h partagée) ─────────────────
        const updateOtpDoc = async (uid: string, code: string, currentCount: number, existingExpireAt: Date | null) => {
            const now = new Date();
            const newExpireAt = (existingExpireAt && existingExpireAt > now)
                ? existingExpireAt
                : new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
            await db.collection("otp_code").doc(otpDocId).set(
                { code, count: currentCount + 1, expireAt: Timestamp.fromDate(newExpireAt), type: "whatsapp", userId: uid },
                { merge: true }
            );
        };
        
        const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();
        
        // ── Helper: trouver l'utilisateur par numéro ──────────────────────────
        const findUserByPhone = async (): Promise<{ uid: string; displayName: string } | null> => {
            const snap = await db.collection("users").where("phone", "==", phoneNumber).limit(1).get();
            if (snap.empty) return null;
            const d = snap.docs[0].data();
            return { uid: snap.docs[0].id, displayName: d.displayName || d.name || "Client" };
        };
        
        // ── Helper: effacer tous les anciens temp_links non utilisés ──────────
        const clearOldTempLinks = async (uid: string) => {
            const old = await db.collection("temp_links").where("userId", "==", uid).where("used", "==", false).get();
            if (!old.empty) {
                const batch = db.batch();
                old.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
                console.log(`🗑️ [BOT WEBHOOK] Deleted ${old.size} old temp_link(s) for ${uid}`);
            }
        };
        
        // ── Helper: créer un nouveau temp_link (10h) ──────────────────────────
        const createTempLink = async (uid: string): Promise<string> => {
            const token = crypto.randomUUID();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 10 * 60 * 60 * 1000); // +10h
            await db.collection("temp_links").doc(token).set({ 
                userId: uid, 
                expiresAt: Timestamp.fromDate(expiresAt), 
                used: false, 
                createdAt: Timestamp.fromDate(now) 
            });
            return token;
        };
        
        // KEYWORD: metem
        if (userMessage === "metem") {
            const rateLimit = await checkRateLimit();
            if (rateLimit.blocked) {
                await sendWhatsAppMessage(From, `🚫 Ou te mande twòp kòd jodi a.\nEsaye ankò demen (limit ${MAX_PER_DAY} fwa pou 24 tè).`);
                return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "application/xml" } });
            }
            
            let uid = "";
            let displayName = ProfileName;
            let isNewUser = false;
            
            const existingUser = await findUserByPhone();
            
            if (existingUser) {
                uid = existingUser.uid;
                displayName = existingUser.displayName;
                console.log(`✅ [BOT WEBHOOK/metem] Existing user: ${uid}`);
            } else {
                isNewUser = true;
                try {
                    const newUser = await auth.createUser({ phoneNumber, displayName: ProfileName });
                    uid = newUser.uid;
                    console.log(`✅ [BOT WEBHOOK/metem] Auth user created: ${uid}`);
                } catch (authErr: any) {
                    if (authErr.code === "auth/phone-number-already-exists") {
                        const existingAuthUser = await auth.getUserByPhoneNumber(phoneNumber);
                        uid = existingAuthUser.uid;
                        displayName = existingAuthUser.displayName || ProfileName;
                        console.warn(`⚠️ [BOT WEBHOOK/metem] Self-healing for uid: ${uid}`);
                    } else {
                        throw authErr;
                    }
                }
                
                const now = new Date();
                await db.collection("users").doc(uid).set({
                    uid,
                    phone: phoneNumber,
                    displayName: ProfileName,
                    name: ProfileName,
                    email: `${uid}@audiencetype.com`,
                    status: "active",
                    role: "user",
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });
            }
            
            await clearOldTempLinks(uid);
            const token = await createTempLink(uid);
            const link = `https://audiencetype.com/login/temp?token=${token}`;
            const code = generateOtp();
            await updateOtpDoc(uid, code, rateLimit.count, rateLimit.expireAt);
            
            const msg = isNewUser
                ? `🎉 Kont ou a kreye avèk siksè, ${displayName}!\n\nMen lyen sekirize ou pou w konekte an (lap ekspire nan 10è tan) : 🔗 ${link}\n\nNou jenere yon kòd OTP pou ou tou : 🔑 *${code}*\n\n⚠️ Pa pataje lyen sa a — li pou ou sèlman.`
                : `Mèsi paske ou mande kont ou, li egziste deja 😊!\n\n🔐 Pou sekirite ou, tout ansyen lyen ou yo efase.\nMen nouvo lyen koneksyon rapid ou a (lap ekspire nan 10è tan) : 🔗 ${link}\n\nEpi men kòd OTP ou a si ou bezwen konekte sou yon lòt aparèy : 🔑 *${code}*\n\n⚠️ Pa pataje lyen sa a — li pou ou sèlman.`;
                
            await sendWhatsAppMessage(From, msg);
            console.log(`📤 [BOT WEBHOOK/metem] Done (isNew=${isNewUser})`);
        }
        
        // KEYWORD: kod
        else if (userMessage === "kod" || userMessage === "kòd" || userMessage === "kód" || rawMessage === "kod" || rawMessage === "kòd" || rawMessage === "kód") {
            const rateLimit = await checkRateLimit();
            if (rateLimit.blocked) {
                await sendWhatsAppMessage(From, `🚫 Ou te mande twòp kòd jodi a.\nEsaye ankò demen (limit ${MAX_PER_DAY} fwa pou 24 tè).`);
                return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "application/xml" } });
            }
            
            const existingUser = await findUserByPhone();
            if (!existingUser) {
                await sendWhatsAppMessage(From, `❌ Nou pa jwenn okenn kont pou nimewo sa a.\nTanpri, ekri mo sa a anvan : *metem*\npou w ka kreye kont ou.`);
                return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "application/xml" } });
            }
            
            const { uid } = existingUser;
            const code = generateOtp();
            await updateOtpDoc(uid, code, rateLimit.count, rateLimit.expireAt);
            await sendWhatsAppMessage(From, `🔑 KÒD OTP OU A\n\nMen kòd koneksyon ou an :\n*${code}*\n\nKòd sa a valab pou 24 èdtan.\nAntre li sou paj koneksyon DJR Akademi an.`);
            console.log(`📤 [BOT WEBHOOK/kod] OTP sent to ${phoneNumber}`);
        }
        
        // KEYWORD: bug
        else if (userMessage === "bug") {
            await sendWhatsAppMessage(From, `⚠️ SIPÒ TEKNIK\n\nSi w jwenn yon pwoblèm teknik oswa yon ensèk (bug) sou sit la, kontakte nou imedyatman nan imel sa a :\n📧 contact@audiencetype.com\n\noswa dirèkteman sou WhatsApp dans le numéro : \n📞 3094848394`);
        }
        
        // KEYWORD: kontak / contact
        else if (userMessage === "kontak" || userMessage === "contact") {
            await sendWhatsAppMessage(From, `📞 KONTAKTE NOU\n\nPou nenpòt enfòmasyon, kesyon, oswa asistans jeneral, ou ka ekri nou dirèkteman sou WhatsApp nan nimewo sa a :\n👉 3094848394`);
        }
        
        // HELP MENU
        else if (
            userMessage === "info" ||
            userMessage === "enfo" ||
            userMessage === "enfomasyon" ||
            userMessage === "information" ||
            userMessage === "edem" ||
            userMessage === "problem" ||
            userMessage === "help" ||
            userMessage === "404" ||
            userMessage === "500"
        ) {
            await sendWhatsAppMessage(From, `👋 Bonjou! Men kòmand ki disponib yo :\n\n• Tape *metem* ➜ kreye kont ou epi resevwa lyen koneksyon ou\n• Tape *kod* ➜ resevwa yon kòd koneksyon ' OTP '\n• Tape *bug* ➜ jwenn sipò teknik\n• Tape *kontak* ➜ kontakte ekip nou an.\n \n Tanpri🙏🏽🥺  tann 5 minit pou resevwa repons! avan tape yon lòt kòmand...`);
        }
        else {
            console.log(`ℹ️ [BOT WEBHOOK] Ignored unknown message: "${userMessage}" from ${phoneNumber}`);
        }
        
    } catch (error: any) {
        console.error("🔥 [BOT WEBHOOK ERROR]:", error);
    } finally {
        if (lockId) {
            try {
                await db.collection("bot_locks").doc(lockId).delete();
            } catch (err) {
                console.error("Failed to release bot lock:", err);
            }
        }
    }
    
    return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "application/xml" } });
}

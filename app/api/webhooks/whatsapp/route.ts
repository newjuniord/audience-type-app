import * as crypto from "crypto";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(request: Request) {
    let lockId: string | null = null;
    
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

        const { supabaseAdmin } = await import("@/lib/supabase/admin");
        
        // ── Verrou de sécurité contre les requêtes identiques concurrentes ─────
        // En Postgres, nous utilisons un UPSERT ou onConflictDO NOTHING
        const { data: existingLock, error: lockErr } = await supabaseAdmin
            .from("bot_locks")
            .select("isProcessing, lockedAt")
            .eq("id", lockId)
            .maybeSingle();

        const now = Date.now();
        let isLocked = false;

        if (existingLock) {
            const lockedAt = new Date(existingLock.lockedAt).getTime();
            if (existingLock.isProcessing && (now - lockedAt < 15000)) {
                isLocked = true;
            } else {
                await supabaseAdmin.from("bot_locks").update({ lockedAt: new Date(now).toISOString() }).eq("id", lockId);
            }
        } else {
            const { error: insertErr } = await supabaseAdmin.from("bot_locks").insert({
                id: lockId,
                isProcessing: true,
                lockedAt: new Date(now).toISOString()
            });
            if (insertErr && insertErr.code === '23505') { // Unique violation
                isLocked = true;
            }
        }
        
        if (isLocked) {
            console.warn(`🔒 [BOT WEBHOOK] Duplicate request blocked by isProcessing lock: ${phoneNumber} -> ${userMessage}`);
            return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "application/xml" } });
        }
        
        console.log(`📩 [BOT WEBHOOK] "${rawMessage}" (normalized: "${userMessage}") from ${phoneNumber} (${ProfileName})`);
        
        const MAX_PER_DAY = 10;
        
        // ── Helper: vérifier le rate limit ───────────────────────────────────
        const checkRateLimit = async (): Promise<{ blocked: boolean; count: number; expireAt: Date | null }> => {
            const { data: otpDoc } = await supabaseAdmin.from("otp_code").select("*").eq("id", otpDocId).maybeSingle();
            const nowTime = new Date();
            if (otpDoc) {
                const expireAt = otpDoc.expireAt ? new Date(otpDoc.expireAt) : null;
                const count = (otpDoc.count || 0) as number;
                if (expireAt && expireAt > nowTime && count >= MAX_PER_DAY) {
                    return { blocked: true, count, expireAt };
                }
                return { blocked: false, count: (expireAt && expireAt > nowTime) ? count : 0, expireAt: expireAt || null };
            }
            return { blocked: false, count: 0, expireAt: null };
        };
        
        // ── Helper: écrire le doc OTP (fenêtre 24h partagée) ─────────────────
        const updateOtpDoc = async (uid: string, code: string, currentCount: number, existingExpireAt: Date | null) => {
            const now = new Date();
            const newExpireAt = (existingExpireAt && existingExpireAt > now)
                ? existingExpireAt
                : new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
                
            await supabaseAdmin.from("otp_code").upsert({
                id: otpDocId,
                code,
                count: currentCount + 1,
                expireAt: newExpireAt.toISOString(),
                type: "whatsapp",
                userId: uid
            }, { onConflict: "id" });
        };
        
        const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();
        
        // ── Helper: trouver l'utilisateur par numéro ──────────────────────────
        const findUserByPhone = async (): Promise<{ uid: string; displayName: string } | null> => {
            const { data: user } = await supabaseAdmin.from("users").select("id, displayName, name").eq("phone", phoneNumber).maybeSingle();
            if (!user) return null;
            return { uid: user.id, displayName: user.displayName || user.name || "Client" };
        };
        
        // ── Helper: effacer tous les anciens temp_links non utilisés ──────────
        const clearOldTempLinks = async (uid: string) => {
            const { error } = await supabaseAdmin.from("temp_links").delete().eq("userId", uid).eq("used", false);
            if (error) console.error("Error clearing old temp links:", error);
        };
        
        // ── Helper: créer un nouveau temp_link (10h) ──────────────────────────
        const createTempLink = async (uid: string): Promise<string> => {
            const token = crypto.randomUUID();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 10 * 60 * 60 * 1000); // +10h
            
            await supabaseAdmin.from("temp_links").insert({ 
                id: token,
                userId: uid, 
                expiresAt: expiresAt.toISOString(), 
                used: false, 
                createdAt: now.toISOString() 
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
                const tempPassword = crypto.randomUUID() + "A1!"; // Un mot de passe fort temporaire
                try {
                    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({ 
                        phone: phoneNumber, 
                        password: tempPassword,
                        email_confirm: true,
                        phone_confirm: true,
                        user_metadata: { displayName: ProfileName } 
                    });
                    
                    if (authErr) throw authErr;
                    if (!authUser.user) throw new Error("No user created");
                    
                    uid = authUser.user.id;
                    console.log(`✅ [BOT WEBHOOK/metem] Auth user created: ${uid}`);
                } catch (authErr: any) {
                    if (authErr.message && authErr.message.includes("already registered")) {
                        // User already registered in Auth but maybe not in public.users?
                        // We will just try to find by phone again or fallback.
                        console.warn(`⚠️ [BOT WEBHOOK/metem] Phone number already registered in auth, fallback required.`);
                        const { data: usersData } = await supabaseAdmin.from("users").select("id").eq("phone", phoneNumber).limit(1);
                        if (usersData && usersData.length > 0) {
                            uid = usersData[0].id;
                        } else {
                            throw authErr;
                        }
                    } else {
                        throw authErr;
                    }
                }
                
                const now = new Date().toISOString();
                await supabaseAdmin.from("users").insert({
                    id: uid,
                    phone: phoneNumber,
                    displayName: ProfileName,
                    name: ProfileName,
                    email: `${uid}@audiencetype.com`,
                    status: "active",
                    role: "user",
                    createdAt: now,
                    updatedAt: now
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
            await sendWhatsAppMessage(From, `👋 Bonjou! Men kòmand ki disponib yo :\n\n• Tape *metem* ➜ kreye kont ou epi resevwa lyen koneksyon ou\n• Tape *kod* ➜ resevwa yon kòd koneksyon ' OTP '\n• Tanpri🙏🏽🥺 tann 5 minit pou resevwa repons! avan ou tape yon lòt kòmand...`);
        }
        else {
            console.log(`ℹ️ [BOT WEBHOOK] Ignored unknown message: "${userMessage}" from ${phoneNumber}`);
        }
        
    } catch (error: any) {
        console.error("🔥 [BOT WEBHOOK ERROR]:", error);
    } finally {
        if (lockId) {
            try {
                const { supabaseAdmin } = await import("@/lib/supabase/admin");
                await supabaseAdmin.from("bot_locks").delete().eq("id", lockId);
            } catch (err) {
                console.error("Failed to release bot lock:", err);
            }
        }
    }
    
    return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "application/xml" } });
}

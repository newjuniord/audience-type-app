import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            userId: bodyUserId,
            email,
            phone,
            contactMethod,
            targetProductId,
            productType,
            amount,
            currency,
            headline,
            videoPoster,
            paymentMethod
        } = body;

        if (!targetProductId) {
            return NextResponse.json({ error: "targetProductId manquant" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/lib/supabase/admin");
        
        let userId = "";
        let userEmail = "";
        let userName = "";
        let userDocFound = false;

        if (bodyUserId) {
            const { data: userDoc } = await supabaseAdmin.from("users").select("*").eq("id", bodyUserId).maybeSingle();
            if (userDoc) {
                userDocFound = true;
                userId = bodyUserId;
                userEmail = userDoc.email || email || "";
                userName = userDoc.name || "Client";
            }
        }

        if (!userDocFound) {
            // 1. Rechercher si l'utilisateur existe déjà par email ou téléphone
            let querySnapshot = null;
            if (contactMethod === 'email' && email) {
                const { data } = await supabaseAdmin.from("users").select("*").eq("email", email.trim().toLowerCase()).limit(1);
                querySnapshot = data;
            } else if (phone) {
                const { data } = await supabaseAdmin.from("users").select("*").eq("phone", phone.trim()).limit(1);
                querySnapshot = data;
            }

            if (querySnapshot && querySnapshot.length > 0) {
                // L'utilisateur existe déjà !
                const userDoc = querySnapshot[0];
                userId = userDoc.id;
                userEmail = userDoc.email || email || "";
                userName = userDoc.name || "Client";
                userDocFound = true;
            }
        }

        if (!userDocFound) {
            // L'utilisateur n'existe pas ! On le crée d'abord dans Supabase Auth pour obtenir l'ID officiel
            let newUserId = "";
            const rawEmail = email ? email.trim().toLowerCase() : undefined;
            const rawPhone = phone ? phone.trim() : undefined;
            userName = email ? email.split('@')[0] : "Client";

            try {
                // Essayer de créer l'utilisateur dans Supabase Auth
                const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
                    email: rawEmail,
                    phone: rawPhone,
                    email_confirm: true,
                    phone_confirm: true,
                    user_metadata: { displayName: userName },
                    password: crypto.randomUUID() + "A1!" // Mot de passe aléatoire
                });
                
                if (authErr) {
                    throw authErr;
                }
                
                if (authUser.user) {
                    newUserId = authUser.user.id;
                    console.log("👤 [AUTH] Utilisateur créé dans Supabase Auth:", newUserId);
                }
            } catch (authErr: any) {
                console.warn("⚠️ [AUTH] Erreur création Supabase Auth, tentative de récupération...", authErr.message);
                try {
                    // We check if it's already registered and try to query public.users again
                    let queryAuthData = null;
                    if (rawEmail) {
                        const { data } = await supabaseAdmin.from("users").select("id").eq("email", rawEmail).limit(1);
                        queryAuthData = data;
                    } else if (rawPhone) {
                        const { data } = await supabaseAdmin.from("users").select("id").eq("phone", rawPhone).limit(1);
                        queryAuthData = data;
                    }
                    if (queryAuthData && queryAuthData.length > 0) {
                        newUserId = queryAuthData[0].id;
                    } else {
                        // Fallback de sécurité, though Supabase requires Auth user for JWT
                        newUserId = crypto.randomUUID();
                    }
                } catch {
                    // Fallback de sécurité
                    newUserId = crypto.randomUUID();
                }
            }

            const now = new Date().toISOString();
            const newUserDoc = {
                id: newUserId,
                email: rawEmail || "",
                phone: rawPhone || "",
                name: userName,
                role: "customer",
                createdAt: now,
                updatedAt: now,
                status: "active",
                enrollmentCount: 0
            };

            await supabaseAdmin.from("users").upsert(newUserDoc, { onConflict: "id" });
            userId = newUserId;
            userEmail = rawEmail || "";
            console.log("👤 [DB] Profil utilisateur créé dans Supabase public.users:", newUserId);
        }

        // 2. Créer l'ordre (order) en attente (pending) de manière sécurisée (Server-side) uniquement pour MonCash (car Lemon Squeezy le fait déjà lui-même)
        let orderId = "";
        if (paymentMethod === 'moncash' || paymentMethod === 'bazik') {
            const newOrderId = crypto.randomUUID();
            const orderData = {
                id: newOrderId,
                userId: userId,
                userEmail: userEmail,
                productId: targetProductId,
                productThumbnailUrl: videoPoster || "",
                productTitle: headline || "Formation",
                productType: productType || "course",
                transactionId: "", // En attente
                amount: amount || 0,
                currency: currency || "HTG",
                status: "pending",
                paymentMethod: "moncash",
                createdAt: new Date().toISOString()
            };

            const { error: orderError } = await supabaseAdmin.from("orders").insert(orderData);
            if (orderError) throw orderError;
            orderId = newOrderId;
        }

        return NextResponse.json({
            userId,
            userEmail,
            userName,
            orderId
        });

    } catch (error: any) {
        console.error("Error in create-pending checkout API:", error);
        return NextResponse.json({ error: "Erreur lors de l'initialisation de la commande" }, { status: 500 });
    }
}

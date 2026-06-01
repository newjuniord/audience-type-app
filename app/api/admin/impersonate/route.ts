import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const { supabaseAdmin } = await import("@/lib/supabase/admin");

        // 1. Verify the ID token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(idToken);
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        
        const adminUid = user.id;

        // 2. Verify the user is actually an admin in the database
        const { data: adminDoc } = await supabaseAdmin.from("users").select("role").eq("id", adminUid).single();
        if (!adminDoc || adminDoc.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
        }

        // 3. Get the target user ID from request body
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // Supabase does not natively support generating arbitrary custom tokens like Firebase.
        // Impersonation requires either a custom JWT issuer, or using magic links and intercepting the token.
        // For now, it is disabled.
        return NextResponse.json({ error: "L'impersonation n'est pas encore disponible avec le nouveau système." }, { status: 501 });

    } catch (error: any) {
        console.error("Error generating custom token:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

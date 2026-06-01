import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Koneksyon obligatwa" }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    
    const { supabaseAdmin } = await import("@/lib/supabase/admin");

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Sesyon ou ekspire, tanpri rekonekte w" }, { status: 401 });
    }
    const userId = user.id;

    const body = await req.json();
    const { serviceId, serviceTitle, date, slotTime, localTimeFmt, formData } = body;

    if (!serviceId || !date || !slotTime || !formData) {
      return NextResponse.json({ error: "Done manke pou konplete rezèvasyon an" }, { status: 400 });
    }

    // 2. Deterministic ID for slot document to prevent parallel booking conflicts
    const bookingDocId = `${serviceId}_${date}_${slotTime}`;

    // 3. Check for existing booking
    const { data: existingDoc } = await supabaseAdmin
        .from("bookingApplications")
        .select("status, createdAt")
        .eq("id", bookingDocId)
        .maybeSingle();

    if (existingDoc) {
        const status = (existingDoc.status || "").toLowerCase();
        const isBooked = ["approved", "confirmed", "paid", "success", "active"].includes(status);

        let isRecent = false;
        if (existingDoc.createdAt) {
            const createdAtMs = new Date(existingDoc.createdAt).getTime();
            isRecent = (Date.now() - createdAtMs < 30 * 60 * 1000);
        }
        
        const isPendingPayment = status === "pending" && isRecent;

        if (isBooked || isPendingPayment) {
            return NextResponse.json({ error: "Lè sa a ap rezève pa yon lòt moun kounye a. Chwazi yon lòt lè oswa re-eseye nan 30 minit." }, { status: 409 });
        }
    }

    // 4. Create or Overwrite booking document
    const newApp = {
        id: bookingDocId,
        bookingsId: serviceId,
        createdAt: new Date().toISOString(),
        message: `Kategori: ${formData.kategori}\nSijè: ${formData.sujet}\nKreyo: ${slotTime} (Lè admin) / ${localTimeFmt} lè lokal`,
        status: "pending",
        userName: formData.nomPrenom,
        userPhone: formData.phone,
        usersId: userId,
        title: serviceTitle,
        serviceName: serviceTitle,
        bookingDate: date,
        bookingTime: slotTime
    };

    const { error: upsertError } = await supabaseAdmin
        .from("bookingApplications")
        .upsert(newApp, { onConflict: "id" });

    if (upsertError) {
        throw upsertError;
    }

    return NextResponse.json({ success: true, bookingId: bookingDocId });
  } catch (error: any) {
    console.error("Error creating booking application:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

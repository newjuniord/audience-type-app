import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");

    if (!date || !serviceId) {
      return NextResponse.json({ error: "date and serviceId are required" }, { status: 400 });
    }

    const { supabaseAdmin } = await import("@/lib/supabase/admin");

    // 1. Fetch booking applications for the selected date and service
    const { data: appsSnap, error } = await supabaseAdmin
      .from("bookingApplications")
      .select("*")
      .eq("bookingDate", date)
      .eq("bookingsId", serviceId);

    if (error) {
      throw error;
    }

    const apps = (appsSnap || []).map(data => {
      return {
        id: data.id,
        ...data,
        createdAtMs: data.createdAt ? new Date(data.createdAt).getTime() : 0
      } as any;
    });

    // 2. Evaluate availability for each booking application
    const occupiedSlots = apps.map(booking => {
      const time = booking.bookingTime;
      const status = (booking.status || "").toLowerCase();

      if (["canceled", "cancelled", "refused", "rejected", "failed"].includes(status)) {
        return null;
      }

      if (["approved", "confirmed", "paid", "success", "active"].includes(status)) {
        return { time, status: "booked" };
      }

      if (status === "pending") {
        const isRecent = booking.createdAtMs && (Date.now() - booking.createdAtMs < 30 * 60 * 1000);

        if (isRecent) {
          return { time, status: "pending_payment" };
        }
      }

      return null;
    }).filter(Boolean);

    return NextResponse.json({ occupiedSlots });
  } catch (error: any) {
    console.error("Error checking availability:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

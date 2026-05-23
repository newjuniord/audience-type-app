import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");

    if (!date || !serviceId) {
      return NextResponse.json({ error: "date and serviceId are required" }, { status: 400 });
    }

    const db = getAdminDb();

    // 1. Fetch booking applications for the selected date and service
    const appsSnap = await db
      .collection("bookingApplications")
      .where("bookingDate", "==", date)
      .where("bookingsId", "==", serviceId)
      .get();

    const apps = appsSnap.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        createdAtMs: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt.toDate().getTime()) : 0
      } as any;
    });

    // 2. Fetch pending orders
    const ordersSnap = await db
      .collection("orders")
      .where("status", "==", "pending")
      .get();

    const pendingOrders = ordersSnap.docs.map(doc => {
      const data = doc.data() as any;
      const userIdStr = typeof data.userId === 'string' ? data.userId : data.userId?.id;
      const productIdStr = typeof data.productId === 'string' ? data.productId : data.productId?.id;
      return {
        id: doc.id,
        ...data,
        userIdStr,
        productIdStr
      } as any;
    });

    // 3. Evaluate availability for each booking application
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
        const isRecent = booking.createdAtMs && (Date.now() - booking.createdAtMs < 20 * 60 * 1000);

        const bookingUserId = typeof booking.usersId === 'string' ? booking.usersId : booking.usersId?.id;
        const hasPendingOrder = pendingOrders.some(o => 
          o.userIdStr === bookingUserId && 
          o.productIdStr === serviceId &&
          ["service", "consultation"].includes((o.productType || "").toLowerCase())
        );

        if (isRecent || hasPendingOrder) {
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

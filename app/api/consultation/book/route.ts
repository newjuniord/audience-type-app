import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Koneksyon obligatwa" }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    let userId: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
    } catch (err) {
      return NextResponse.json({ error: "Sesyon ou ekspire, tanpri rekonekte w" }, { status: 401 });
    }

    const body = await req.json();
    const { serviceId, serviceTitle, date, slotTime, localTimeFmt, formData } = body;

    if (!serviceId || !date || !slotTime || !formData) {
      return NextResponse.json({ error: "Done manke pou konplete rezèvasyon an" }, { status: 400 });
    }

    const db = getAdminDb();

    // 2. Deterministic ID for slot document to prevent parallel booking conflicts
    const bookingDocId = `${serviceId}_${date}_${slotTime}`;
    const bookingDocRef = db.collection("bookingApplications").doc(bookingDocId);

    // 3. Run Transaction
    const success = await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(bookingDocRef);

      if (docSnap.exists) {
        const data = docSnap.data();
        const status = (data?.status || "").toLowerCase();

        const isBooked = ["approved", "confirmed", "paid", "success", "active"].includes(status);

        let createdAtMs = 0;
        if (data?.createdAt) {
          if (typeof data.createdAt.toMillis === "function") {
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            createdAtMs = data.createdAt.getTime();
          } else if (data.createdAt.seconds) {
            createdAtMs = data.createdAt.seconds * 1000;
          }
        }
        const isRecent = createdAtMs && (Date.now() - createdAtMs < 20 * 60 * 1000);
        const isPendingPayment = status === "pending" && isRecent;

        if (isBooked || isPendingPayment) {
          return false; // Already taken
        }
      }

      // Create new booking document in the transaction
      const newApp = {
        bookingsId: serviceId,
        createdAt: Timestamp.now(),
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

      transaction.set(bookingDocRef, newApp);
      return true;
    });

    if (!success) {
      return NextResponse.json({ error: "Lè sa a ap rezève pa yon lòt moun kounye a. Chwazi yon lòt lè oswa reyezi nan 20 minit." }, { status: 409 });
    }

    return NextResponse.json({ success: true, bookingId: bookingDocId });
  } catch (error: any) {
    console.error("Error creating booking application:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

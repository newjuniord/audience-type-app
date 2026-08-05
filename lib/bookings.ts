import { db } from "./firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { Booking } from "./types";

const COLLECTION = "bookings";

export async function getBookings(): Promise<Booking[]> {
    const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy("date", "desc")));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
    const snapshot = await getDoc(doc(db, COLLECTION, bookingId));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Booking) : null;
}

export async function addBooking(bookingData: Partial<Booking>): Promise<string> {
    const ref = doc(collection(db, COLLECTION));
    const newBooking: Booking = {
        id: ref.id,
        customerName: bookingData.customerName || "",
        customerEmail: bookingData.customerEmail || "",
        customerImage: bookingData.customerImage || "",
        serviceName: bookingData.serviceName || "",
        date: bookingData.date || "",
        time: bookingData.time || "",
        duration: bookingData.duration || "60 min",
        price: bookingData.price || "$0",
        status: bookingData.status || "pending",
        phone: bookingData.phone || "",
        meetingLink: bookingData.meetingLink || "",
        message: bookingData.message || "",
    };
    await setDoc(ref, newBooking);
    return ref.id;
}

export async function updateBooking(bookingId: string, bookingData: Partial<Booking>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, bookingId), { ...bookingData });
}

export async function deleteBooking(bookingId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, bookingId));
}

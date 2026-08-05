import { db } from "./firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    runTransaction,
    updateDoc,
    deleteDoc,
    writeBatch,
    onSnapshot,
    Timestamp,
    serverTimestamp,
} from "firebase/firestore";
import { BookingApplication, ServiceSlot } from "./types";
import { toDate, toMillis, toTimestamp } from "./dates";

const BOOKINGS_COLLECTION = "bookingApplications";
const SLOTS_COLLECTION = "serviceSlots";

/**
 * Durée pendant laquelle un créneau reste bloqué en attendant le paiement.
 * Passé ce délai, il redevient réservable par quelqu'un d'autre.
 */
export const HOLD_DURATION_MS = 30 * 60 * 1000;

/** Levée quand le créneau vient d'être pris par quelqu'un d'autre. */
export class SlotUnavailableError extends Error {
    constructor(
        message: string,
        /** "booked" : payé et définitif. "held" : quelqu'un est en train de payer. */
        public readonly reason: "booked" | "held"
    ) {
        super(message);
        this.name = "SlotUnavailableError";
    }
}

export interface CreateBookingHoldInput {
    serviceId: string;
    serviceName: string;
    /** Coach qui anime : recopié pour filtrer l'agenda admin sans relire le service. */
    coachId?: string;
    coachName?: string;
    slotId: string;
    startUtc: Date;
    endUtc: Date;
    durationMinutes: number;

    userId: string;
    userName: string;
    userPhone: string;
    userEmail?: string;

    /** Vue côté coach. */
    bookingDate: string;
    bookingTime: string;
    serviceTimezone: string;

    /** Vue côté client. */
    customerDate: string;
    customerTime: string;
    customerTimezone: string;
    customerCountry: string;

    category: string;
    subject: string;

    amount?: number;
    currency?: string;
}

/**
 * Bloque un créneau et enregistre la demande de réservation, avant tout paiement.
 *
 * Le blocage et l'enregistrement se font dans une transaction Firestore : deux clients
 * qui cliquent sur le même créneau à la même seconde ne peuvent pas gagner tous les deux.
 * Le perdant reçoit une SlotUnavailableError et choisit un autre horaire.
 */
export async function createBookingHold(
    input: CreateBookingHoldInput
): Promise<{ bookingId: string; slotId: string; holdExpiresAtMs: number }> {
    const slotRef = doc(db, SLOTS_COLLECTION, input.slotId);
    const bookingRef = doc(collection(db, BOOKINGS_COLLECTION));
    const now = Date.now();
    const holdExpiresAtMs = now + HOLD_DURATION_MS;
    const nowIso = new Date(now).toISOString();

    await runTransaction(db, async (tx) => {
        const slotSnap = await tx.get(slotRef);
        let staleBookingRef: ReturnType<typeof doc> | null = null;

        if (slotSnap.exists()) {
            const slot = slotSnap.data() as ServiceSlot;

            if (slot.status === "booked") {
                throw new SlotUnavailableError(
                    "Lè sa a deja rezève pa yon lòt moun. Tanpri chwazi yon lòt lè.",
                    "booked"
                );
            }

            const holdIsLive = slot.status === "held" && (toMillis(slot.holdExpiresAt) ?? 0) > now;
            if (holdIsLive && slot.heldBy !== input.userId) {
                throw new SlotUnavailableError(
                    "Yon lòt moun ap peye pou lè sa a kounye a. Chwazi yon lòt lè oswa re-eseye nan 30 minit.",
                    "held"
                );
            }

            // Le client reprend un créneau qu'il détenait déjà : on abandonne son ancienne
            // demande. On ne touche qu'aux siennes — les règles Firestore interdisent
            // d'écrire dans la demande d'un autre client, ce qui ferait échouer toute la
            // transaction et rendrait un créneau expiré définitivement inutilisable.
            if (slot.bookingId && slot.bookingId !== bookingRef.id && slot.heldBy === input.userId) {
                const candidate = doc(db, BOOKINGS_COLLECTION, slot.bookingId);
                // Toutes les lectures doivent précéder les écritures dans une transaction,
                // et `update` échoue si le document a été supprimé entre-temps.
                if ((await tx.get(candidate)).exists()) staleBookingRef = candidate;
            }
        }

        if (staleBookingRef) {
            tx.update(staleBookingRef, { status: "expired", updatedAt: nowIso });
        }

        const slotDoc: ServiceSlot = {
            serviceId: input.serviceId,
            // Timestamps natifs : requêtes de plage fiables et comparaison directe
            // avec `request.time` dans les règles Firestore.
            startUtc: toTimestamp(input.startUtc),
            endUtc: toTimestamp(input.endUtc),
            status: "held",
            heldBy: input.userId,
            holdExpiresAt: toTimestamp(new Date(holdExpiresAtMs)),
            bookingId: bookingRef.id,
            updatedAt: toTimestamp(new Date(now)),
        };
        tx.set(slotRef, slotDoc);

        const booking: BookingApplication = {
            id: bookingRef.id,
            bookingsId: input.serviceId,
            serviceName: input.serviceName,
            title: input.serviceName,
            coachId: input.coachId || "",
            coachName: input.coachName || "",
            status: "pending_payment",
            paymentStatus: "unpaid",

            usersId: input.userId,
            userName: input.userName,
            userPhone: input.userPhone,
            userEmail: input.userEmail || "",

            slotId: input.slotId,
            startUtc: toTimestamp(input.startUtc),
            endUtc: toTimestamp(input.endUtc),
            durationMinutes: input.durationMinutes,

            bookingDate: input.bookingDate,
            bookingTime: input.bookingTime,
            serviceTimezone: input.serviceTimezone,

            customerDate: input.customerDate,
            customerTime: input.customerTime,
            customerTimezone: input.customerTimezone,
            customerCountry: input.customerCountry,

            category: input.category,
            subject: input.subject,
            // Champ hérité : l'admin historique lit encore le récapitulatif dans `message`.
            message: [
                `Kategori: ${input.category}`,
                `Sijè: ${input.subject}`,
                `Kreyo: ${input.bookingTime} (${input.serviceTimezone}) / ${input.customerTime} (${input.customerTimezone})`,
            ].join("\n"),

            amount: input.amount ?? 0,
            currency: input.currency || "USD",
            holdExpiresAt: toTimestamp(new Date(holdExpiresAtMs)),
            createdAt: nowIso,
            updatedAt: nowIso,
        };
        tx.set(bookingRef, booking);
    });

    return { bookingId: bookingRef.id, slotId: input.slotId, holdExpiresAtMs };
}

/** Rattache une commande à une réservation, pour retrouver l'une depuis l'autre après paiement. */
export async function attachOrderToBooking(bookingId: string, orderId: string): Promise<void> {
    await updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), {
        orderId,
        paymentStatus: "pending",
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Confirme la réservation après paiement : la demande passe en `confirmed` et le
 * créneau devient définitivement `booked` (plus d'expiration possible).
 */
export async function confirmBookingPayment(bookingId: string, orderId?: string): Promise<void> {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) return;

    const booking = bookingSnap.data() as BookingApplication;
    if (booking.status === "confirmed") return;

    const nowIso = new Date().toISOString();
    const batch = writeBatch(db);

    batch.update(bookingRef, {
        status: "confirmed",
        paymentStatus: "paid",
        ...(orderId ? { orderId } : {}),
        updatedAt: nowIso,
    });

    if (booking.slotId) {
        batch.update(doc(db, SLOTS_COLLECTION, booking.slotId), {
            status: "booked",
            // Un créneau payé ne doit plus jamais expirer : date volontairement lointaine.
            holdExpiresAt: Timestamp.fromDate(new Date("9999-12-31T00:00:00Z")),
            updatedAt: serverTimestamp(),
        });
    }

    await batch.commit();
}

/** Libère un créneau quand le client abandonne le paiement. */
export async function releaseBookingHold(bookingId: string): Promise<void> {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) return;

    const booking = bookingSnap.data() as BookingApplication;
    // Une réservation payée ne se libère pas ici : il faut passer par une annulation.
    if (booking.status === "confirmed") return;

    const nowIso = new Date().toISOString();
    const batch = writeBatch(db);

    batch.update(bookingRef, { status: "expired", updatedAt: nowIso });
    if (booking.slotId) {
        batch.update(doc(db, SLOTS_COLLECTION, booking.slotId), {
            status: "released",
            holdExpiresAt: Timestamp.fromMillis(0),
            updatedAt: serverTimestamp(),
        });
    }

    await batch.commit();
}

/** Annule une réservation (client ou admin) et rend le créneau disponible. */
export async function cancelBooking(bookingId: string, reason?: string): Promise<void> {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) return;

    const booking = bookingSnap.data() as BookingApplication;
    const nowIso = new Date().toISOString();
    const batch = writeBatch(db);

    batch.update(bookingRef, {
        status: "cancelled",
        cancelledAt: nowIso,
        cancelReason: reason || "",
        updatedAt: nowIso,
    });

    if (booking.slotId) {
        batch.update(doc(db, SLOTS_COLLECTION, booking.slotId), {
            status: "released",
            holdExpiresAt: Timestamp.fromMillis(0),
            updatedAt: serverTimestamp(),
        });
    }

    await batch.commit();
}

export type SlotOccupancy = "booked" | "held";

/**
 * Créneaux déjà pris pour un service, sur une fenêtre de temps.
 *
 * Lit la collection publique `serviceSlots` : aucune donnée personnelle n'y transite,
 * un visiteur non connecté peut donc consulter les disponibilités.
 */
export async function getOccupiedSlots(
    serviceId: string,
    fromUtc: Date,
    toUtc: Date
): Promise<Map<string, SlotOccupancy>> {
    const occupied = new Map<string, SlotOccupancy>();
    if (!serviceId) return occupied;

    const snapshot = await getDocs(
        query(
            collection(db, SLOTS_COLLECTION),
            where("serviceId", "==", serviceId),
            where("startUtc", ">=", toTimestamp(fromUtc)),
            where("startUtc", "<=", toTimestamp(toUtc))
        )
    );

    const now = Date.now();
    for (const docSnap of snapshot.docs) {
        const slot = docSnap.data() as ServiceSlot;
        if (slot.status === "booked") {
            occupied.set(docSnap.id, "booked");
        } else if (slot.status === "held" && (toMillis(slot.holdExpiresAt) ?? 0) > now) {
            // Un blocage périmé n'occupe plus rien : le créneau est de nouveau libre.
            occupied.set(docSnap.id, "held");
        }
    }

    return occupied;
}

/**
 * Créneaux pris pour plusieurs services en une seule requête.
 * Utilisé par la page coaching, qui affiche la prochaine disponibilité de chaque offre.
 *
 * Firestore limite l'opérateur `in` à 30 valeurs : au-delà, on découpe en lots.
 */
export async function getOccupiedSlotsForServices(
    serviceIds: string[],
    fromUtc: Date,
    toUtc: Date
): Promise<Map<string, SlotOccupancy>> {
    const occupied = new Map<string, SlotOccupancy>();
    const ids = serviceIds.filter(Boolean);
    if (ids.length === 0) return occupied;

    const now = Date.now();
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) batches.push(ids.slice(i, i + 30));

    const snapshots = await Promise.all(
        batches.map((batch) =>
            getDocs(
                query(
                    collection(db, SLOTS_COLLECTION),
                    where("serviceId", "in", batch),
                    where("startUtc", ">=", toTimestamp(fromUtc)),
                    where("startUtc", "<=", toTimestamp(toUtc))
                )
            )
        )
    );

    for (const snapshot of snapshots) {
        for (const docSnap of snapshot.docs) {
            const slot = docSnap.data() as ServiceSlot;
            if (slot.status === "booked") {
                occupied.set(docSnap.id, "booked");
            } else if (slot.status === "held" && (toMillis(slot.holdExpiresAt) ?? 0) > now) {
                occupied.set(docSnap.id, "held");
            }
        }
    }

    return occupied;
}

/**
 * Écoute en direct les créneaux pris pour un service, sur une fenêtre de temps.
 * Si quelqu'un réserve pendant que le client hésite, la grille se met à jour toute seule.
 * Retourne la fonction de désabonnement.
 */
export function subscribeToOccupiedSlots(
    serviceId: string,
    fromUtc: Date,
    toUtc: Date,
    onChange: (occupied: Map<string, SlotOccupancy>) => void,
    onError?: (error: Error) => void
): () => void {
    if (!serviceId) {
        onChange(new Map());
        return () => {};
    }

    return onSnapshot(
        query(
            collection(db, SLOTS_COLLECTION),
            where("serviceId", "==", serviceId),
            where("startUtc", ">=", toTimestamp(fromUtc)),
            where("startUtc", "<=", toTimestamp(toUtc))
        ),
        (snapshot) => {
            const occupied = new Map<string, SlotOccupancy>();
            const now = Date.now();
            for (const docSnap of snapshot.docs) {
                const slot = docSnap.data() as ServiceSlot;
                if (slot.status === "booked") {
                    occupied.set(docSnap.id, "booked");
                } else if (slot.status === "held" && (toMillis(slot.holdExpiresAt) ?? 0) > now) {
                    occupied.set(docSnap.id, "held");
                }
            }
            onChange(occupied);
        },
        (error) => onError?.(error)
    );
}

export async function getBookingApplication(bookingId: string): Promise<BookingApplication | null> {
    const snapshot = await getDoc(doc(db, BOOKINGS_COLLECTION, bookingId));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as BookingApplication) : null;
}

export async function getBookingApplicationsByUser(userId: string): Promise<BookingApplication[]> {
    if (!userId) return [];
    const snapshot = await getDocs(
        query(collection(db, BOOKINGS_COLLECTION), where("usersId", "==", userId), orderBy("createdAt", "desc"))
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BookingApplication));
}

/** Retrouve une réservation depuis l'identifiant de commande (retour de paiement). */
export async function getBookingApplicationByOrder(orderId: string): Promise<BookingApplication | null> {
    if (!orderId) return null;
    const snapshot = await getDocs(
        query(collection(db, BOOKINGS_COLLECTION), where("orderId", "==", orderId), limit(1))
    );
    const first = snapshot.docs[0];
    return first ? ({ id: first.id, ...first.data() } as BookingApplication) : null;
}

/** Liste complète — réservé à l'admin par les règles Firestore. */
export async function getBookingApplications(): Promise<BookingApplication[]> {
    const snapshot = await getDocs(query(collection(db, BOOKINGS_COLLECTION), orderBy("createdAt", "desc")));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BookingApplication));
}

export async function updateBookingApplicationStatus(id: string, status: string): Promise<void> {
    if (status === "cancelled" || status === "rejected") {
        await cancelBooking(id, "Anile pa administratè a");
        return;
    }
    await updateDoc(doc(db, BOOKINGS_COLLECTION, id), { status, updatedAt: new Date().toISOString() });
}

export async function updateBookingApplication(
    id: string,
    data: Partial<BookingApplication>
): Promise<void> {
    await updateDoc(doc(db, BOOKINGS_COLLECTION, id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteBookingApplication(id: string): Promise<void> {
    const booking = await getBookingApplication(id);
    if (booking?.slotId) {
        await deleteDoc(doc(db, SLOTS_COLLECTION, booking.slotId));
    }
    await deleteDoc(doc(db, BOOKINGS_COLLECTION, id));
}

/** Compat : ancienne signature utilisée avant la connexion à Firestore. */
export const createBookingApplication = async (
    data: Omit<BookingApplication, "id">
): Promise<string> => {
    const ref = doc(collection(db, BOOKINGS_COLLECTION));
    const nowIso = new Date().toISOString();
    const { setDoc } = await import("firebase/firestore");
    await setDoc(ref, { ...data, id: ref.id, createdAt: data.createdAt || nowIso, updatedAt: nowIso });
    return ref.id;
};

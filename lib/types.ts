import { Timestamp } from "firebase/firestore";

/**
 * Adapted types for Firebase
 */

/**
 * Interface représentant un Ebook
 */
export interface Product {
    id?: string;
    title: string;
    price: string;
    type: "Course" | "Ebook" | "Service" | "Booking";
    image: string;
    description: string;
    features?: string[];
    isOwned?: boolean;
    isInvitationOnly?: boolean;
    invitationCode?: string;
    priceHTG?: number;
    availability?: {
        [key: string]: {
            enabled: boolean;
            startTime: string;
            endTime: string;
        };
    };
}

export interface Ebook {
    id?: string;
    lemonSqueezyProductId?: string;
    coverImage: string;
    createdAt: string;
    description: string;
    fileUrl: string;
    includedItems: string[];
    price: number;
    sales: number;
    status: string;
    title: string;
    updatedAt: string;
    isInvitationOnly?: boolean;
    invitationCode?: string;
    priceHTG?: number;
    authorId?: string;
    authorName?: string;
    authorImage?: string;
}

export interface Lesson {
    id: string;
    title: string;
    description?: string;
    duration: string;
    videoUrl: string;
    resourceFileUrl?: string;
    completed?: boolean;
    isFree?: boolean;
}

export interface Module {
    id?: string;
    courseId?: string;
    title: string;
    description?: string;
    lessons: Lesson[];
    lessonsCount?: number;
    duration?: string;
    order?: number;
    createdAt?: string;
}

export interface Course {
    id?: string;
    lemonSqueezyProductId?: string;
    createdAt: string;
    description: string;
    includedItems: string[];
    price: number;
    sales: number;
    statut: string;
    thumbnail: string;
    title: string;
    updatedAt: string;
    isInvitationOnly?: boolean;
    invitationCode?: string;
    priceHTG?: number;
    authorId?: string;
    authorName?: string;
    authorImage?: string;
}

export interface Review {
    id?: string;
    isVisible?: boolean;
    status?: string;
    comment: string;
    createdAt: string;
    productId?: string;
    productTitle?: string;
    rating: number;
    userId: string;
    userName: string;
    userEmail?: string;
    userAvatar?: string;
}

/** Statuts d'une demande de réservation, du panier jusqu'au rendez-vous passé. */
export type BookingStatus =
    | "pending_payment"
    | "confirmed"
    | "cancelled"
    | "expired"
    | "completed"
    | "no_show";

/**
 * Un instant lu depuis Firestore.
 *
 * Les documents écrits aujourd'hui contiennent un `Timestamp` natif ; les anciens
 * portent encore une chaîne ISO. Le type couvre les deux, et `toDate()` (lib/dates.ts)
 * normalise à la lecture.
 */
export type FirestoreInstant = Timestamp | string | Date;

export interface BookingApplication {
    id?: string;
    /** Id du service réservé (nom historique conservé pour ne pas casser l'admin). */
    bookingsId: string;
    createdAt: string;
    updatedAt?: string;
    message: string;
    serviceName?: string;
    title?: string;
    status: BookingStatus | string;
    userName: string;
    userPhone?: string;
    userEmail?: string;
    usersId: string;

    /** Créneau — identifiant partagé entre tous les fuseaux. */
    slotId?: string;
    /**
     * Début du rendez-vous, en Timestamp Firestore. Source de vérité de l'horaire :
     * un instant absolu, indépendant du fuseau de celui qui le lit ou l'écrit.
     */
    startUtc?: FirestoreInstant;
    endUtc?: FirestoreInstant;
    durationMinutes?: number;

    /** Coach concerné, recopié ici pour filtrer l'agenda admin sans relire chaque service. */
    coachId?: string;
    coachName?: string;

    /** Vue côté coach (fuseau du service), pour l'agenda admin. */
    bookingDate?: string; // YYYY-MM-DD
    bookingTime?: string; // HH:MM
    serviceTimezone?: string;

    /** Vue côté client, pour les rappels et l'historique. */
    customerDate?: string; // YYYY-MM-DD
    customerTime?: string; // HH:MM
    customerTimezone?: string;
    customerCountry?: string;

    /** Contenu du besoin. */
    category?: string;
    subject?: string;

    /** Paiement. */
    orderId?: string;
    paymentStatus?: "unpaid" | "pending" | "paid" | "failed" | "refunded";
    amount?: number;
    currency?: string;

    /** Réservation temporaire : au-delà, le créneau est rendu aux autres clients. */
    holdExpiresAt?: FirestoreInstant;

    meetingLink?: string;
    cancelledAt?: string;
    cancelReason?: string;
}

/**
 * Miroir public et sans donnée personnelle d'un créneau occupé.
 *
 * Les demandes de réservation sont privées (règles Firestore) : sans ce miroir,
 * un visiteur ne pourrait pas savoir quels créneaux sont déjà pris.
 */
export interface ServiceSlot {
    id?: string;
    serviceId: string;
    /** Début du créneau, en Timestamp Firestore : permet les requêtes de plage. */
    startUtc: FirestoreInstant;
    endUtc?: FirestoreInstant;
    status: "held" | "booked" | "released";
    /** UID du client qui détient le créneau — sert aux règles Firestore, pas à l'affichage. */
    heldBy?: string;
    /**
     * Expiration de la réservation temporaire.
     * En Timestamp, les règles Firestore peuvent le comparer directement à `request.time`.
     */
    holdExpiresAt: FirestoreInstant;
    bookingId?: string;
    updatedAt?: FirestoreInstant;
}

export interface Booking {
    id?: string;
    customerName?: string;
    customerEmail?: string;
    customerImage?: string;
    serviceName?: string;
    date?: string;
    time?: string;
    duration?: string;
    price?: string;
    status?: string;
    phone?: string;
    meetingLink?: string;
    message?: string;
}

export interface Order {
    id?: string;
    amount: number;
    currency: string;
    createdAt?: string;
    expiresAt?: string;
    failedAt?: string;
    failedReason?: string;
    productId: string;
    productThumbnailUrl: string;
    productTitle: string;
    productType: string;
    status: string;
    transactionId: string;
    userEmail: string;
    userId: string;
    userName?: string;
    paymentMethod?: string;
}

export interface Enrollment {
    id?: string;
    accessGranted: boolean;
    completedLessons: string[];
    currentLessonId: string;
    downloadCount: string;
    enrolledAt: string;
    lastAccessedAt: string;
    productId: string;
    productThumbnailUrl: string;
    productTitle: string;
    productType: string;
    progress: number;
    status: string;
    totalLessons: number;
    userEmail: string;
    userId: string;
    userName: string;
}

export interface StorageAsset {
    id?: string;
    name: string;
    type: string;
    path: string;
    size: string;
    sizeBytes: number;
    createdAt: string;
    url: string;
    contentType: string;
    metadata?: {
        width?: number;
        height?: number;
        duration?: number;
    };
}

export interface User {
    id?: string;
    uid: string;
    email: string;
    /** Nom saisi à l'inscription (écrit par LoginModal dans le document `users`). */
    name?: string;
    displayName?: string;
    fullName?: string;
    photoURL?: string;
    role?: 'admin' | 'customer';
    createdAt: string;
    lastLogin?: string;
    phoneNumber?: string;
    phone?: string;
    purchases?: string[];
    isOnline?: boolean;
    lastActive?: string;
    canGenerateTempLinks?: boolean;
    tempLinksCount?: number;
    enrollmentCount?: number;
}

export interface TempLink {
    id?: string;
    userId: string;
    expiresAt: string;
    used: boolean;
    createdAt: string;
}

export interface Service {
    id?: string;
    lemonSqueezyProductId?: string;
    title: string;
    description: string;
    price: string;
    imageUrl?: string;
    includedItems: string[];
    availability: {
        [key: string]: {
            enabled: boolean;
            startTime: string;
            endTime: string;
        };
    };
    active: boolean;
    status?: 'published' | 'draft' | 'archived';
    createdAt: string;
    updatedAt: string;
    isInvitationOnly?: boolean;
    invitationCode?: string;
    priceHTG?: number;
    phone?: string;

    /**
     * Coach qui anime cette offre.
     *
     * Les champs sont dénormalisés (nom, photo) et non résolus depuis `users` :
     * la collection `users` est privée, alors que la page coaching est publique.
     * Sans cette copie, un visiteur ne pourrait pas voir qui anime la session.
     */
    coachId?: string;
    coachName?: string;
    coachPhotoUrl?: string;
    /** Ex : « Kòch Kominikasyon », affiché sous le nom. */
    coachTitle?: string;

    /** @deprecated Offset fixe hérité — ignore l'heure d'été. Préférer `availabilityTimezone`. */
    availabilityTimezoneOffset?: number;
    /** Fuseau IANA dans lequel l'admin saisit ses disponibilités, ex: "Asia/Seoul". */
    availabilityTimezone?: string;
    /** Durée d'une session, en minutes (défaut : 60). */
    sessionDurationMinutes?: number;
    /** Délai minimum avant un rendez-vous, en heures (défaut : 24). */
    minNoticeHours?: number;
    /** Profondeur du calendrier ouvert à la réservation, en jours (défaut : 60). */
    bookingWindowDays?: number;
    /** Lien de visioconférence proposé par défaut. */
    meetingLink?: string;
}

export interface FunnelData {
    id?: string;
    linkedProductId?: string;
    linkedProductType?: 'course' | 'ebook';
    badge: string;
    headline: string;
    subheadline: string;
    videoUrl: string;
    videoPoster: string;
    ctaText: string;
    ctaSubtext: string;
    urgencyText: string;
    originalPrice: number;
    currentPrice: number;
    priceGourdes: number;
    lemonSqueezyId: string;
    currency: string;
    spotsLeft: number;
    expirationDate: string | null;
    benefits: Array<{ icon: string; text: string }>;
    testimonials: Array<{ name: string; role: string; text: string; avatar: string; stars: number }>;
    createdAt?: string;
    updatedAt?: string;
    isActive: boolean;
}

export interface Gift {
    id?: string;
    title: string;
    description: string;
    photoLink: string;
    type: 'course' | 'ebook' | 'consultation';
    triggerProductId?: string;
    giftProductId: string;
    giftProductTitle: string;
    giftProductType: 'course' | 'ebook' | 'service';
    giftProductThumbnailUrl?: string;
    isActive: boolean;
    expirationDate: string | null;
    maxUses: number | null;
    currentUsesCount: number;
    requiresInvitation: boolean;
    invitationCode: string | null;
    createdAt: string;
}

export type AlertCategory = 'utility' | 'marketing';

export type AlertType =
    | 'payment_success'
    | 'otp_login'
    | 'booking_reminder'
    | 'account_security'
    | 'course_access'
    | 'new_course'
    | 'promotion'
    | 'free_ebook'
    | 'webinar'
    | 'reactivation'
    | 'maintenance'
    | 'custom';

export interface Alert {
    id?: string;
    userId: string;
    category: AlertCategory;
    type: AlertType;
    title: string;
    body: string;
    isRead: boolean;
    icon: string;
    iconColor: string;
    iconBg: string;
    actionUrl?: string;
    actionLabel?: string;
    createdAt: string;
    expiresAt?: string;
}

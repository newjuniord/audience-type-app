/**
 * Adapted types for Supabase
 */

/**
 * Interface représentant un Ebook
 */
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
}

export interface Lesson {
    id: string;
    title: string;
    description: string;
    duration: string;
    videoUrl: string;
    resourceFileUrl?: string;
    completed?: boolean;
}

export interface Module {
    id?: string;
    title: string;
    lessons: Lesson[];
    duration?: string;
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
}

export interface Booking {
    id?: string;
    createdAt: string;
    description: string;
    price: string;
    serviceName: string;
    status: string;
    userNumber: number;
    whatIncluded: string[];
}

export interface Review {
    id?: string;
    isVisible: boolean;
    comment: string;
    createdAt: string;
    productId: string;
    productTitle: string;
    rating: number;
    userId: string;
    userName: string;
    userEmail: string;
}

export interface BookingApplication {
    id?: string;
    bookingsId: string;
    createdAt: string;
    message: string;
    serviceName?: string;
    title?: string;
    status: string;
    userName: string;
    userPhone?: string;
    usersId: string;
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
    uid: string;
    email: string;
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
    availabilityTimezoneOffset?: number;
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

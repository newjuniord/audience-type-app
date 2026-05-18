import { Timestamp } from "firebase/firestore";

/**
 * Interface représentant un Ebook dans notre collection Firestore.
 * 
 * Cette interface définit la structure des données pour un livre numérique (Ebook).
 * Chaque champ correspond à une colonne dans la base de données ou une propriété de l'objet.
 * 
 * @interface Ebook
 */
export interface Ebook {
    /**
     * L'identifiant unique du document dans Firestore.
     * Ce champ est optionnel lors de la création car il est généré par Firestore,
     * mais il est présent lorsque nous lisons les données.
     */
    id?: string;

    /**
     * ID du produit dans Lemon Squeezy (pour le paiement).
     */
    lemonSqueezyProductId?: string;

    /**
     * L'URL de l'image de couverture du livre.
     * Typiquement une URL pointant vers Firebase Storage ou un autre service d'hébergement d'images.
     */
    coverImage: string;

    /**
     * La date et l'heure de la création de l'enregistrement.
     * Utilise le type `Timestamp` de Firestore pour une gestion précise du temps.
     */
    createdAt: Timestamp;

    /**
     * Une description détaillée du contenu du livre.
     * Utile pour afficher sur la page de détail du produit pour informer le client.
     */
    description: string;

    /**
     * L'URL de téléchargement du fichier du livre (PDF, EPUB, etc.).
     * C'est le lien que l'utilisateur recevra après l'achat.
     */
    fileUrl: string;

    /**
     * Une liste des éléments inclus avec ce livre.
     * Par exemple : ["Guide PDF", "Accès vidéo", "Templates"].
     * C'est un tableau de chaînes de caractères.
     */
    includedItems: string[];

    /**
     * Le prix du livre en format numérique.
     * Utilisez un nombre (e.g., 19.99).
     */
    price: number;

    /**
     * Le nombre total de ventes pour ce livre.
     * Utile pour suivre la popularité et les performances.
     */
    sales: number;

    /**
     * Le statut actuel du livre.
     * Peut être "published" (publié), "draft" (brouillon), ou "archived" (archivé).
     * Nous utilisons le type `string` ici, mais on pourrait restreindre les valeurs avec un type union.
     */
    status: string;

    /**
     * Le titre du livre.
     * C'est le nom principal qui sera affiché partout.
     */
    title: string;

    /**
     * La date et l'heure de la dernière mise à jour de l'enregistrement.
     * Permet de savoir quand les informations ont été modifiées pour la dernière fois.
     */
    updatedAt: Timestamp;
    isInvitationOnly?: boolean;
    invitationCode?: string;
    priceHTG?: number;
}

/**
 * Interface représentant une Leçon dans un Module.
 * Fait partie de la liste `lessons` d'un Module.
 */
export interface Lesson {
    id: string;
    title: string;
    description: string;
    duration: string; // Ex: "10:00" or "10m"
    videoUrl: string;
    resourceFileUrl?: string;
    completed?: boolean;
}

/**
 * Interface représentant un Module de cours.
 * Les modules sont une SOUS-COLLECTION de chaque document `course`.
 * Chemin : /courses/{courseId}/modules/{moduleId}
 */
export interface Module {
    id?: string; // ID du document dans la sous-collection
    title: string;
    lessons: Lesson[]; // Liste des leçons contenues dans ce module
    duration?: string; // Durée totale du module (ex: "45m")
    createdAt?: Timestamp;
}

/**
 * Interface représentant un Cours (Course) dans la collection principale.
 */
export interface Course {
    id?: string;
    lemonSqueezyProductId?: string; // ID Lemon Squeezy
    createdAt: Timestamp;
    description: string;
    includedItems: string[];
    price: number;
    sales: number;
    statut: string; // "published", "draft", etc. (Note: champ nommé 'statut' dans la DB)
    thumbnail: string; // Image miniature du cours
    title: string;
    updatedAt: Timestamp;
    isInvitationOnly?: boolean;
    invitationCode?: string;
    priceHTG?: number;
}

/**
 * Interface représentant une Réservation (Booking).
 * Correspond à la collection `bookings` dans Firestore.
 */
export interface Booking {
    id?: string;
    createdAt: Timestamp;
    description: string;
    price: string; // Note: Défini comme string selon votre demande (ex: "100€" ou "100")
    serviceName: string; // Nom du service réservé
    status: string; // "pending", "confirmed", etc.
    userNumber: number; // Numéro d'utilisateur ou identifiant numérique
    whatIncluded: string[]; // Liste des éléments inclus
}

import { DocumentReference } from "firebase/firestore";

/**
 * Interface représentant un Avis (Review).
 * Correspond à la collection `reviews` dans Firestore.
 */
export interface Review {
    id?: string;
    isVisible: boolean; // Corrigé de "IsVible"
    comment: string;
    createdAt: Timestamp;
    productId: DocumentReference; // Référence au produit concerné
    productTitle: string; // Titre du produit
    rating: number; // Note (ex: 1 à 5)
    userId: DocumentReference | string; // Référence à l'utilisateur ou ID string
    userName: string; // Nom de l'utilisateur
    userEmail: string; // Email de l'utilisateur
}

/**
 * Interface représentant une Demande de Réservation (BookingApplication).
 * Correspond à la collection `bookingApplications` dans Firestore.
 */
export interface BookingApplication {
    id?: string;
    bookingsId: DocumentReference; // Référence à l'objet Booking (champ: bookingsId)
    createdAt: Timestamp;
    message: string;
    serviceName?: string; // Nom du service (explicitly requested)
    title?: string; // Titre du service (explicitly requested)
    status: string; // "pending", "accepted", "rejected", etc.
    userName: string;
    userPhone?: string;
    usersId: DocumentReference; // Référence à l'utilisateur (path: /users/{uid})
}

/**
 * Interface représentant une Commande (Order).
 * Correspond à la collection `orders` dans Firestore.
 */
export interface Order {
    id?: string;
    amount: number;
    currency: string;
    createdAt?: Timestamp; // J'ajoute ceci car c'est crucial pour trier les commandes, même si absent de votre liste immédiate
    expiresAt?: Timestamp | string;
    failedAt?: Timestamp | string;
    failedReason?: string;
    productId: DocumentReference | string; // Référence au produit (Ebook, Course, etc.)
    productThumbnailUrl: string;
    productTitle: string;
    productType: string; // Ex: "ebook", "course"
    status: string; // "paid", "failed", "refunded"
    transactionId: string;
    userEmail: string;
    userId: DocumentReference | string; // Référence à l'acheteur ou ID string
    userName?: string;
    paymentMethod?: string; // Ex: "card", "paypal"
}

/**
 * Interface représentant une Inscription (Enrollment).
 * Correspond à la collection `enrollments` dans Firestore.
 */
export interface Enrollment {
    id?: string;
    accessGranted: boolean;
    completedLessons: string[]; // Liste des IDs ou titres des leçons terminées
    currentLessonId: string;
    downloadCount: string; // Demandé en string par l'utilisateur
    enrolledAt: Timestamp;
    lastAccessedAt: Timestamp;
    productId: DocumentReference; // Référence au cours ou produit
    productThumbnailUrl: string;
    productTitle: string;
    productType: string;
    progress: number; // Pourcentage ou nombre d'étapes
    status: string; // "active", "completed", "expired"
    totalLessons: number;
    userEmail: string;
    userId: DocumentReference;
    userName: string;
}

/**
 * Interface representing a file stored in Firebase Storage and indexed in Firestore.
 * Collection: `assets`
 */
export interface StorageAsset {
    id?: string;
    name: string;
    type: string; // MIME type or extension (e.g., "JPG", "PDF")
    path: string; // Storage path (e.g., "/uploads/images/")
    size: string; // Human readable size (e.g., "1.2 MB")
    sizeBytes: number;
    createdAt: Timestamp;
    url: string; // Download URL
    contentType: string; // Full MIME type (image/jpeg)
    metadata?: {
        width?: number;
        height?: number;
        duration?: number;
    };
}

/**
 * Interface représentant un Utilisateur (User).
 * Correspond à la collection `users` dans Firestore.
 */
export interface User {
    uid: string; // Auth ID (aussi l'ID du document)
    email: string;
    displayName?: string;
    fullName?: string;
    photoURL?: string;
    role?: 'admin' | 'customer'; // Rôle simple pour l'accès dashboard
    createdAt: Timestamp;
    lastLogin?: Timestamp;
    phoneNumber?: string;
    whatsappNumber?: string;
    purchases?: string[]; // Liste des IDs produits achetés (optionnel)
    isOnline?: boolean;
    lastActive?: Timestamp;
    canGenerateTempLinks?: boolean; // Autorisation admin pour générer des liens
    tempLinksCount?: number; // Compteur de liens générés (max 2)
    enrollmentCount?: number; // Nombre total d'inscriptions (cours, ebooks, services)
}

/**
 * Interface représentant un Lien de Connexion Temporaire.
 * Correspond à la collection `temp_links` dans Firestore.
 */
export interface TempLink {
    id?: string; // Le token lui-même
    userId: string; // L'ID de l'utilisateur qui a généré le lien
    expiresAt: Timestamp; // Date d'expiration (24h)
    used: boolean; // Si le lien a déjà été utilisé
    createdAt: Timestamp;
}

/**
 * Interface représentant une Offre de Service (Service Offering).
 * Correspond à la collection `services` dans Firestore.
 * Utilisé pour créer les types de rendez-vous disponibles.
 */
export interface Service {
    id?: string;
    lemonSqueezyProductId?: string; // ID Lemon Squeezy
    title: string;
    description: string;
    price: string; // Ex: "150" ou "150$"
    imageUrl?: string; // URL de l'image de couverture
    includedItems: string[];
    // Disponibilité hebdomadaire
    availability: {
        [key: string]: {
            enabled: boolean;
            startTime: string;
            endTime: string;
        };
    };
    active: boolean; // Si le service est visible pour les clients (Legacy)
    status?: 'published' | 'draft' | 'archived'; // Nouveau champ de statut standardisé
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isInvitationOnly?: boolean;
    invitationCode?: string;
    priceHTG?: number;
}


/**
 * Interface représentant une Page de Vente Dynamique (Funnel).
 * Correspond à la collection `funnels` dans Firestore.
 */
export interface FunnelData {
    id?: string;
    
    // Liaison avec un produit existant (Course ou Ebook)
    linkedProductId?: DocumentReference | string;
    linkedProductType?: 'course' | 'ebook';

    // Textes principaux
    badge: string;
    headline: string;
    subheadline: string;
    videoUrl: string;
    videoPoster: string;
    ctaText: string;
    ctaSubtext: string;
    urgencyText: string;
    
    // Prix & Paiement (surchargés ou issus du produit)
    originalPrice: number;
    currentPrice: number;
    priceGourdes: number; // Prix spécifique pour MonCash (HTG)
    lemonSqueezyId: string; // ID de variant/produit pour carte bancaire
    currency: string;
    
    // Urgence & Disponibilité
    spotsLeft: number;
    expirationDate: Timestamp | string | null;
    
    // Éléments dynamiques (Tableaux)
    benefits: Array<{ icon: string; text: string }>;
    testimonials: Array<{ name: string; role: string; text: string; avatar: string; stars: number }>;
    
    // Metadonnées
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    isActive: boolean;
}

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
}

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
    availability?: {
        [key: string]: {
            enabled: boolean;
            startTime: string;
            endTime: string;
        };
    };
}

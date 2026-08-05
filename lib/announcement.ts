export interface Announcement {
    id: string;
    message: string;
    linkUrl?: string;
    linkText?: string;
    isActive: boolean;
    createdAt?: string;
}

export interface AnnouncementBarSettings {
    isEnabled?: boolean;
    isActive?: boolean;
    text?: string;
    messageText?: string;
    ctaText?: string;
    ctaUrl?: string;
    link?: string;
    backgroundColor?: string;
    textColor?: string;
    displayFor?: string;
    productFilter?: string;
}

export const defaultSettings: AnnouncementBarSettings = {
    isEnabled: true,
    messageText: "Byenvini sou DJR Akademi!",
    ctaText: "Kòmanse",
    ctaUrl: "/courses"
};

let settingsMemory: AnnouncementBarSettings = { ...defaultSettings };

let announcementsMemory: Announcement[] = [
    {
        id: "ann-1",
        message: "Byenvini sou nouvo platfòm DJR Akademi an!",
        linkUrl: "/admin/kado",
        linkText: "Nouvèl",
        isActive: true,
        createdAt: new Date().toISOString()
    }
];

export async function getAnnouncementSettings(): Promise<AnnouncementBarSettings> {
    return settingsMemory;
}

export async function saveAnnouncementSettings(settings: Partial<AnnouncementBarSettings>): Promise<void> {
    settingsMemory = { ...settingsMemory, ...settings };
}
export const updateAnnouncementSettings = saveAnnouncementSettings;

export async function getActiveAnnouncement(): Promise<Announcement | null> {
    return announcementsMemory.find(a => a.isActive) || null;
}

export async function getAnnouncements(): Promise<Announcement[]> {
    return announcementsMemory;
}

export async function saveAnnouncement(data: Partial<Announcement>): Promise<void> {
    if (data.id) {
        const idx = announcementsMemory.findIndex(a => a.id === data.id);
        if (idx !== -1) {
            announcementsMemory[idx] = { ...announcementsMemory[idx], ...data };
        }
    } else {
        const id = crypto.randomUUID();
        announcementsMemory.unshift({
            id,
            message: data.message || "",
            linkUrl: data.linkUrl || "",
            linkText: data.linkText || "",
            isActive: data.isActive ?? true,
            createdAt: new Date().toISOString()
        });
    }
}

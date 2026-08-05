/**
 * Gestion des coachs (plusieurs formateurs, pas un seul).
 *
 * Un coach est un utilisateur `role: 'admin'`. Son identité est recopiée sur chaque
 * service (`coachId`, `coachName`, `coachPhotoUrl`) parce que la collection `users`
 * est privée alors que la page coaching est publique : sans cette copie, un visiteur
 * ne pourrait pas savoir qui anime la session.
 */

import { Service, User } from "./types";
import { getUsers } from "./users";
import { getServiceTimezone } from "./slots";

export interface Coach {
    id: string;
    name: string;
    photoUrl: string;
    title: string;
    /** Fuseau IANA dans lequel le coach déclare ses disponibilités. */
    timezone: string;
    /** Offres actives animées par ce coach. */
    services: Service[];
}

/** Nom affichable d'un utilisateur, quel que soit le champ renseigné. */
export function displayNameOf(user: Pick<User, "fullName" | "displayName" | "name" | "email">): string {
    return user.fullName || user.displayName || user.name || user.email || "Kòch";
}

/** Utilisateurs pouvant animer une offre. */
export async function getCoachCandidates(): Promise<User[]> {
    const { users } = await getUsers();
    return users
        .filter((u) => u.role === "admin")
        .sort((a, b) => displayNameOf(a).localeCompare(displayNameOf(b), "fr"));
}

/**
 * Regroupe des services par coach.
 *
 * Les offres sans `coachId` sont rattachées à un coach « non assigné » plutôt
 * qu'ignorées : elles resteraient invisibles dans l'admin après la migration.
 */
export function groupServicesByCoach(services: Service[]): Coach[] {
    const byCoach = new Map<string, Coach>();

    for (const service of services) {
        const id = service.coachId || "__unassigned__";
        let coach = byCoach.get(id);

        if (!coach) {
            coach = {
                id,
                name: service.coachName || (id === "__unassigned__" ? "Pa asiyen" : "Kòch"),
                photoUrl: service.coachPhotoUrl || "",
                title: service.coachTitle || "",
                timezone: getServiceTimezone(service),
                services: [],
            };
            byCoach.set(id, coach);
        }

        coach.services.push(service);
    }

    return [...byCoach.values()].sort((a, b) => {
        // Le lot « non assigné » passe en dernier : c'est une anomalie à corriger, pas un coach.
        if (a.id === "__unassigned__") return 1;
        if (b.id === "__unassigned__") return -1;
        return a.name.localeCompare(b.name, "fr");
    });
}

/** Identité du coach telle qu'affichée pour une offre donnée. */
export function getServiceCoach(service: Service): { name: string; photoUrl: string; title: string; timezone: string } {
    return {
        name: service.coachName || "Kòch la",
        photoUrl: service.coachPhotoUrl || "",
        title: service.coachTitle || "",
        timezone: getServiceTimezone(service),
    };
}

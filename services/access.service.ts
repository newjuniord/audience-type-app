export class AccessService {
    async checkUserAccess(userId: string, productId: string): Promise<boolean> {
        try {
            const res = await fetch(`/api/access/check?userId=${userId}&productId=${productId}`);
            if (!res.ok) return false;
            const data = await res.json();
            return data.hasAccess || false;
        } catch {
            return false;
        }
    }
}

export const accessService = new AccessService();

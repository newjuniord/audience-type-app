import { IGiftRepository } from "./types";
import { Gift } from "@/lib/types";
import { getGifts, getGift, getGiftByTriggerProduct, createGift, updateGift, deleteGift } from "@/lib/gifts";

export class GiftRepository implements IGiftRepository {
    async getAll(): Promise<Gift[]> {
        try {
            const data = await getGifts();
            return data || [];
        } catch (error) {
            return [];
        }
    }

    async getById(id: string): Promise<Gift | null> {
        try {
            const gift = await getGift(id);
            return gift || null;
        } catch (error) {
            return null;
        }
    }

    async getByTriggerProduct(triggerProductId: string): Promise<Gift | null> {
        try {
            const gift = await getGiftByTriggerProduct(triggerProductId);
            return gift || null;
        } catch (error) {
            return null;
        }
    }

    async create(data: Omit<Gift, "id" | "createdAt" | "currentUsesCount">): Promise<string> {
        return await createGift(data);
    }

    async update(id: string, data: Partial<Gift>): Promise<void> {
        return await updateGift(id, data);
    }

    async delete(id: string): Promise<void> {
        return await deleteGift(id);
    }
}

export const giftRepository = new GiftRepository();

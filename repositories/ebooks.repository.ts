import { IEbookRepository } from "./types";
import { Ebook } from "@/lib/types";
import { getEbooks, getEbookById, addEbook, updateEbook, deleteEbook } from "@/lib/ebooks";

export class EbookRepository implements IEbookRepository {
    async getAll(): Promise<Ebook[]> {
        try {
            const data = await getEbooks();
            return data || [];
        } catch (error) {
            return [];
        }
    }

    async getById(id: string): Promise<Ebook | null> {
        try {
            const ebook = await getEbookById(id);
            return ebook || null;
        } catch (error) {
            return null;
        }
    }

    async create(data: Partial<Ebook>): Promise<string> {
        return await addEbook(data as any);
    }

    async update(id: string, data: Partial<Ebook>): Promise<void> {
        return await updateEbook(id, data);
    }

    async delete(id: string): Promise<void> {
        return await deleteEbook(id);
    }
}

export const ebookRepository = new EbookRepository();

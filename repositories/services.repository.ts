import { IServiceRepository } from "./types";
import { Service } from "@/lib/types";
import { getServices, getServiceById, addService, updateService, deleteService } from "@/lib/services";


export class ServiceRepository implements IServiceRepository {
    async getAll(): Promise<Service[]> {
        try {
            const data = await getServices();
            return data || [];
        } catch (error) {
            return [];
        }
    }

    async getById(id: string): Promise<Service | null> {
        try {
            const service = await getServiceById(id);
            return service || null;
        } catch (error) {
            return null;
        }
    }

    async create(data: Partial<Service>): Promise<string> {
        return await addService(data as any);
    }

    async update(id: string, data: Partial<Service>): Promise<void> {
        return await updateService(id, data);
    }

    async delete(id: string): Promise<void> {
        return await deleteService(id);
    }
}

export const serviceRepository = new ServiceRepository();

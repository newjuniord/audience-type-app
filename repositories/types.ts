import { Course, Ebook, Service, Gift, Module } from "@/lib/types";
import { Product } from "@/types/product";

export interface ICourseRepository {
    getAll(): Promise<Course[]>;
    getById(id: string): Promise<Course | null>;
    getModules(courseId: string): Promise<Module[]>;
    create(data: Partial<Course>): Promise<string>;
    update(id: string, data: Partial<Course>): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface IEbookRepository {
    getAll(): Promise<Ebook[]>;
    getById(id: string): Promise<Ebook | null>;
    create(data: Partial<Ebook>): Promise<string>;
    update(id: string, data: Partial<Ebook>): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface IServiceRepository {
    getAll(): Promise<Service[]>;
    getById(id: string): Promise<Service | null>;
    create(data: Partial<Service>): Promise<string>;
    update(id: string, data: Partial<Service>): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface IGiftRepository {
    getAll(): Promise<Gift[]>;
    getById(id: string): Promise<Gift | null>;
    getByTriggerProduct(triggerProductId: string): Promise<Gift | null>;
    create(data: Omit<Gift, "id" | "createdAt" | "currentUsesCount">): Promise<string>;
    update(id: string, data: Partial<Gift>): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface IProductRepository {
    getFeaturedProducts(): Promise<Product[]>;
}

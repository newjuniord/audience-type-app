import { IProductRepository } from "./types";
import { Product } from "@/types/product";
import { courseRepository } from "./courses.repository";
import { ebookRepository } from "./ebooks.repository";
import { serviceRepository } from "./services.repository";

export class ProductRepository implements IProductRepository {
    async getFeaturedProducts(): Promise<Product[]> {
        try {
            const [courses, ebooks, services] = await Promise.all([
                courseRepository.getAll().catch(err => {
                    console.error("CourseRepository fetch error:", err);
                    return [];
                }),
                ebookRepository.getAll().catch(err => {
                    console.error("EbookRepository fetch error:", err);
                    return [];
                }),
                serviceRepository.getAll().catch(err => {
                    console.error("ServiceRepository fetch error:", err);
                    return [];
                }),
            ]);

            const allProducts: Product[] = [
                ...courses.filter(c => c.statut === 'published').map(c => ({
                    id: c.id,
                    title: c.title,
                    price: `$${c.price}`,
                    type: "Course" as const,
                    image: c.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
                    description: c.description,
                    features: c.includedItems || [],
                    isOwned: false,
                    isInvitationOnly: c.isInvitationOnly || false,
                    invitationCode: c.invitationCode || "",
                    priceHTG: c.priceHTG
                })),
                ...ebooks.filter(e => e.status === 'published').map(e => ({
                    id: e.id,
                    title: e.title,
                    price: `$${e.price}`,
                    type: "Ebook" as const,
                    image: e.coverImage || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
                    description: e.description,
                    features: e.includedItems || [],
                    isOwned: false,
                    isInvitationOnly: e.isInvitationOnly || false,
                    invitationCode: e.invitationCode || "",
                    priceHTG: e.priceHTG
                })),
                ...services.filter(s => s.status === 'published' || (s.status === undefined && s.active === true)).map(s => ({
                    id: s.id,
                    title: s.title,
                    price: s.price.includes('$') || s.price.includes('€') ? s.price : `$${s.price}`,
                    type: "Service" as const,
                    image: s.imageUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80",
                    description: s.description,
                    features: s.includedItems || [],
                    isOwned: false,
                    isInvitationOnly: s.isInvitationOnly || false,
                    invitationCode: s.invitationCode || "",
                    priceHTG: s.priceHTG,
                    availability: s.availability
                }))
            ].sort(() => 0.5 - Math.random());

            if (allProducts.length > 0) return allProducts;
            return [];
        } catch (err) {
            console.error("ProductRepository getFeaturedProducts error:", err);
            return [];
        }
    }
}

export const productRepository = new ProductRepository();

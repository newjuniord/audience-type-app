import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import FeaturedProducts from "@/components/FeaturedProducts";
import { getCourses } from "@/lib/courses";
import { getEbooks } from "@/lib/ebooks";
import { getServices } from "@/lib/services";
import { Product } from "@/types/product";

export const revalidate = 3600; // Cache for 1 hour

export default async function ProductCatalog() {
    const [courses, ebooks, services] = await Promise.all([
        getCourses(),
        getEbooks(),
        getServices()
    ]);

    const initialProducts: Product[] = [
        ...courses.filter(c => c.statut === 'published').map(c => ({
            id: c.id,
            title: c.title,
            price: `$${c.price}`,
            type: "Course" as const,
            image: c.thumbnail || "/logo1.png",
            description: c.description,
            features: c.includedItems || [],
            isOwned: false
        })),
        ...ebooks.filter(e => e.status === 'published').map(e => ({
            id: e.id,
            title: e.title,
            price: `$${e.price}`,
            type: "Ebook" as const,
            image: e.coverImage || "/logo1.png",
            description: e.description,
            features: e.includedItems || [],
            isOwned: false
        })),
        ...services.filter(s => s.status === 'published' || (s.status === undefined && s.active === true)).map(s => ({
            id: s.id,
            title: s.title,
            price: s.price.includes('$') || s.price.includes('€') ? s.price : `$${s.price}`,
            type: "Service" as const,
            image: s.imageUrl || "/logo1.png",
            description: s.description,
            features: s.includedItems || [],
            isOwned: false
        }))
    ].sort(() => 0.5 - Math.random());

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors">
            <DashboardHeader />

            <main className="flex flex-col items-center pt-0 pb-20">
                <FeaturedProducts title="Katalòg Pwodui" showBorder={false} initialProducts={initialProducts} />
            </main>

            <DashboardFooter />
        </div>
    );
}

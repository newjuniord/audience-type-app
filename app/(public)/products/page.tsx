import DashboardHeader from "@/components/buyer/DashboardHeader";
import DashboardFooter from "@/components/buyer/DashboardFooter";
import FeaturedProducts from "@/components/shared/FeaturedProducts";
import { productRepository } from "@/repositories/products.repository";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Katalòg Pwodui",
    description: "Dekouvri tout kou, e-books ak fòmasyon sou Entèlijans Artifisyèl ak kreyasyon kontni sou DJR Akademi.",
};

export const dynamic = "force-dynamic";

export default async function ProductCatalog() {
    const initialProducts = await productRepository.getFeaturedProducts();

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

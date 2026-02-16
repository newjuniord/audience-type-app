"use client";

import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import FeaturedProducts from "@/components/FeaturedProducts";

export default function ProductCatalog() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors">
            <DashboardHeader />

            <main className="flex flex-col items-center pt-24 pb-20">
                <FeaturedProducts title="Catalogue de Produits" showBorder={false} />
            </main>

            <DashboardFooter />
        </div>
    );
}

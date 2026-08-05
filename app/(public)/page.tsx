import FeaturedProducts from "@/components/shared/FeaturedProducts";
import DashboardFooter from "@/components/buyer/DashboardFooter";
import DashboardHeader from "@/components/buyer/DashboardHeader";
import Hero from "@/components/shared/Hero";
import AcademyOverview from "@/components/shared/AcademyOverview";
import ReviewsSection from "@/components/shared/ReviewsSection";
import { productRepository } from "@/repositories/products.repository";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Akey",
  description: "Aprann sèvi ak Entèlijans Artifisyèl (IA) pou w ka devlope konpetans ou ak biznis ou sou DJR Akademi.",
};

export const revalidate = 0; // Force dynamic to ensure products update immediately

export default async function Home() {
  const initialProducts = await productRepository.getFeaturedProducts();

  return (
    <div className="relative flex min-h-screen flex-col bg-background-dark text-white">
      <DashboardHeader />
      <main className="flex-grow flex flex-col items-center pt-24 overflow-hidden">
        <Hero />

        <div className="w-full max-w-7xl">
          <FeaturedProducts initialProducts={initialProducts} />
        </div>
        
        <AcademyOverview />
        
        <div className="w-full">
          <ReviewsSection />
        </div>
      </main>
      <DashboardFooter />
    </div>
  );
}

import CallToAction from "../components/CallToAction";
import FeaturedProducts from "../components/FeaturedProducts";
import DashboardFooter from "../components/DashboardFooter";
import DashboardHeader from "../components/DashboardHeader";
import Hero from "../components/Hero";
import ReviewsSection from "../components/ReviewsSection";
import { getCourses } from "@/lib/courses";
import { getEbooks } from "@/lib/ebooks";
import { getServices } from "@/lib/services";
import { Product } from "@/components/ProductDrawer";

export const revalidate = 3600; // Cache for 1 hour

export default async function Home() {
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
      image: c.thumbnail || "https://images.unsplash.com/photo-1542744094-24638eff58bb?q=80&w=2071&auto=format&fit=crop",
      description: c.description,
      features: c.includedItems || [],
      isOwned: false
    })),
    ...ebooks.filter(e => e.status === 'published').map(e => ({
      id: e.id,
      title: e.title,
      price: `$${e.price}`,
      type: "Ebook" as const,
      image: e.coverImage || "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=2074&auto=format&fit=crop",
      description: e.description,
      features: e.includedItems || [],
      isOwned: false
    })),
    ...services.filter(s => s.status === 'published' || (s.status === undefined && s.active === true)).map(s => ({
      id: s.id,
      title: s.title,
      price: s.price.includes('$') || s.price.includes('€') ? s.price : `$${s.price}`,
      type: "Service" as const,
      image: s.imageUrl || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2074&auto=format&fit=crop",
      description: s.description,
      features: s.includedItems || [],
      isOwned: false
    }))
  ].sort(() => 0.5 - Math.random());

  return (
    <div className="relative flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-grow flex flex-col items-center pt-24">
        <Hero />
        <FeaturedProducts initialProducts={initialProducts} />
        <ReviewsSection />
        <CallToAction />
      </main>
      <DashboardFooter />
    </div>
  );
}

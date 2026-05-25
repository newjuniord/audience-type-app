import CallToAction from "../components/CallToAction";
import FeaturedProducts from "../components/FeaturedProducts";
import DashboardFooter from "../components/DashboardFooter";
import DashboardHeader from "../components/DashboardHeader";
import Hero from "../components/Hero";
import AcademyOverview from "../components/AcademyOverview";
import FounderSection from "../components/FounderSection";
import ReviewsSection from "../components/ReviewsSection";
import ScrollReveal from "../components/ScrollReveal";
import { getCourses } from "@/lib/courses";
import { getEbooks } from "@/lib/ebooks";
import { getServices } from "@/lib/services";
import { Product } from "@/types/product";

export const revalidate = 0; // Force dynamic to ensure products update immediately

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
      image: c.thumbnail || "/logo1.png",
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
      image: e.coverImage || "/logo1.png",
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
      image: s.imageUrl || "/logo1.png",
      description: s.description,
      features: s.includedItems || [],
      isOwned: false,
      isInvitationOnly: s.isInvitationOnly || false,
      invitationCode: s.invitationCode || "",
      priceHTG: s.priceHTG,
      availability: s.availability
    }))
  ].sort(() => 0.5 - Math.random());

  return (
    <div className="relative flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-grow flex flex-col items-center pt-24 overflow-hidden">
        <ScrollReveal delay={0.1}>
          <Hero />
        </ScrollReveal>
        
        <ScrollReveal delay={0.2}>
          <AcademyOverview />
        </ScrollReveal>
        
        <ScrollReveal delay={0.2} className="w-full max-w-7xl">
          <FeaturedProducts initialProducts={initialProducts} />
        </ScrollReveal>
        
        <ScrollReveal delay={0.2}>
          <FounderSection />
        </ScrollReveal>
        
        <ScrollReveal delay={0.2} className="w-full">
          <ReviewsSection />
        </ScrollReveal>
        
        <ScrollReveal delay={0.2} className="w-full">
          <CallToAction />
        </ScrollReveal>
      </main>
      <DashboardFooter />
    </div>
  );
}

import CallToAction from "../components/CallToAction";
import FeaturedProducts from "../components/FeaturedProducts";
import DashboardFooter from "../components/DashboardFooter";
import DashboardHeader from "../components/DashboardHeader";
import Hero from "../components/Hero";
import ReviewsSection from "../components/ReviewsSection";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-grow flex flex-col items-center pt-24">
        <Hero />
        <FeaturedProducts />
        <ReviewsSection />
        <CallToAction />
      </main>
      <DashboardFooter />
    </div>
  );
}

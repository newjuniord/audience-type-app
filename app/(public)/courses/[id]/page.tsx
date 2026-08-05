import DashboardHeader from "@/components/buyer/DashboardHeader";
import DashboardFooter from "@/components/buyer/DashboardFooter";
import ProductReviewsSection from "@/components/shared/ProductReviewsSection";
import CoursePurchaseClient from "@/components/buyer/CoursePurchaseClient";
import { courseRepository } from "@/repositories/courses.repository";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const course = await courseRepository.getById(id);
    if (!course) return { title: "Fòmasyon pa jwenn | DJR Akademi" };
    return {
        title: `${course.title} | DJR Akademi`,
        description: course.description,
    };
}

export default async function CourseOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const course = await courseRepository.getById(id);

    if (!course) {
        notFound();
    }

    const modules = await courseRepository.getModules(id).catch(() => []);

    return (
        <div className="min-h-screen bg-background-dark text-white flex flex-col">
            <DashboardHeader />

            <main className="flex-1 pt-24 pb-24 px-6">
                <div className="max-w-[1200px] mx-auto space-y-12">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest pt-6">
                        <Link href="/products" className="hover:text-primary transition-colors">Katalòg</Link>
                        <span>/</span>
                        <span className="text-primary">Fòmasyon Videyo</span>
                    </div>

                    {/* WOW Premium Course Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        {/* Left Main Content (7 cols) */}
                        <div className="lg:col-span-7 space-y-12">
                            {/* Course Header */}
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-black uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-sm">school</span>
                                    <span>Fòmasyon Entansif IA 2026</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight leading-[0.95]">
                                    {course.title}
                                </h1>
                                <div 
                                    className="text-white/70 text-base md:text-lg leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: course.description }}
                                />
                            </div>

                            {/* Instructor Card */}
                            <div className="flex items-center gap-4 p-5 bg-white/[0.02] border border-white/10 rounded-2xl">
                                {(course.authorImage || "https://firebasestorage.googleapis.com/v0/b/djrakademi.firebasestorage.app/o/images%2F1779203875602_Dumervil.png?alt=media&token=eee8ea8b-2939-4507-8223-e4d71f970f3e") ? (
                                    <img
                                        src={course.authorImage || "https://firebasestorage.googleapis.com/v0/b/djrakademi.firebasestorage.app/o/images%2F1779203875602_Dumervil.png?alt=media&token=eee8ea8b-2939-4507-8223-e4d71f970f3e"}
                                        alt={course.authorName || "Jean Ronald Dumervil"}
                                        className="size-14 rounded-full object-cover border-2 border-primary"
                                    />
                                ) : (
                                    <div className="size-14 rounded-full border-2 border-primary bg-white/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white">person</span>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Fòmatè & Mentò</p>
                                    <h3 className="text-white font-black text-base">{course.authorName || "Jean Ronald Dumervil"}</h3>
                                    <p className="text-white/40 text-xs">Fòmatè sou DJR Akademi</p>
                                </div>
                            </div>

                            {/* What You'll Learn Grid */}
                            {course.includedItems && course.includedItems.length > 0 && (
                                <div className="space-y-4 bg-white/[0.02] border border-white/10 rounded-3xl p-8">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">verified</span>
                                        <span>Sa w ap ka fè apre kou sa a :</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        {course.includedItems.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-3">
                                                <span className="material-symbols-outlined text-primary text-base mt-0.5 shrink-0">check_circle</span>
                                                <span className="text-sm text-white/80 font-medium leading-snug">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Syllabus / Modules Overview */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                                        Pwogram Fòmasyon an
                                    </h3>
                                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                                        {modules.length > 0 ? `${modules.length} Modil` : "3 Modil Prensipal"}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {modules.map((m, mIdx) => (
                                        <div key={mIdx} className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="size-8 rounded-xl bg-primary/20 text-primary font-black text-sm flex items-center justify-center">
                                                    {mIdx + 1}
                                                </span>
                                                <div>
                                                    <h4 className="text-white font-bold text-sm">{m.title}</h4>
                                                    <p className="text-white/40 text-xs mt-0.5">
                                                        {Array.isArray(m.lessons) ? m.lessons.length : 0} Leson videyo HD
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-white/30 text-base">lock</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Sticky Purchase Sidebar (5 cols) */}
                        <div className="lg:col-span-5 lg:sticky lg:top-28">
                            <CoursePurchaseClient course={course} />
                        </div>
                    </div>

                    {/* Reviews & Social Proof Section */}
                    <ProductReviewsSection productId={course.id || id} productTitle={course.title} />
                </div>
            </main>

            <DashboardFooter />
        </div>
    );
}

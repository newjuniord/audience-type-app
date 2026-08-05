import DashboardHeader from "@/components/buyer/DashboardHeader";
import DashboardFooter from "@/components/buyer/DashboardFooter";
import ProductReviewsSection from "@/components/shared/ProductReviewsSection";
import EbookPurchaseClient from "@/components/buyer/EbookPurchaseClient";
import { ebookRepository } from "@/repositories/ebooks.repository";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const ebook = await ebookRepository.getById(id);
    if (!ebook) return { title: "Ebook pa jwenn | DJR Akademi" };
    return {
        title: `${ebook.title} | DJR Akademi`,
        description: ebook.description,
    };
}

export default async function EbookDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const ebook = await ebookRepository.getById(id);

    if (!ebook) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-background-dark text-white flex flex-col">
            <DashboardHeader />

            <main className="flex-1 pt-24 pb-24 px-6">
                <div className="max-w-[1200px] mx-auto space-y-12">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest pt-6">
                        <Link href="/products" className="hover:text-primary transition-colors">Katalòg</Link>
                        <span>/</span>
                        <span className="text-primary">Ebook Dijital (PDF)</span>
                    </div>

                    {/* WOW Premium Ebook Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        {/* Left Ebook Visual & Description (7 cols) */}
                        <div className="lg:col-span-7 space-y-12">
                            {/* Ebook Cover Mockup & Title Header */}
                            <div className="flex flex-col md:flex-row items-start gap-8 bg-white/[0.02] border border-white/10 rounded-3xl p-8">
                                <div className="relative group shrink-0 mx-auto md:mx-0 w-48 md:w-56">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-primary via-orange-500 to-secondary rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition duration-500"></div>
                                    <img
                                        src={ebook.coverImage || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80"}
                                        alt={ebook.title}
                                        className="relative w-full aspect-[3/4] object-cover rounded-2xl border border-white/10 shadow-2xl"
                                    />
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-black uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-sm">auto_stories</span>
                                        <span>Gid Dijital PDF HD</span>
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-[0.95]">
                                        {ebook.title}
                                    </h1>
                                    <div className="text-white/70 text-sm md:text-base leading-relaxed">
                                        Yon gid pratik 100% dijital ki ap montre w etap pa etap kòman pou w atenn objektif ou. Ou ka telechaje l imedyatman epi li l sou telefòn, tablèt, oswa òdinatè w nenpòt ki lè, nenpòt ki kote.
                                    </div>

                                    {/* Author tag */}
                                    <div className="flex items-center gap-3 pt-2">
                                        {(ebook.authorImage || "https://firebasestorage.googleapis.com/v0/b/djrakademi.firebasestorage.app/o/images%2F1779203875602_Dumervil.png?alt=media&token=eee8ea8b-2939-4507-8223-e4d71f970f3e") ? (
                                            <img
                                                src={ebook.authorImage || "https://firebasestorage.googleapis.com/v0/b/djrakademi.firebasestorage.app/o/images%2F1779203875602_Dumervil.png?alt=media&token=eee8ea8b-2939-4507-8223-e4d71f970f3e"}
                                                alt={ebook.authorName || "Jean Ronald Dumervil"}
                                                className="size-10 rounded-full object-cover border border-primary"
                                            />
                                        ) : (
                                            <div className="size-10 rounded-full border border-primary bg-white/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-sm">person</span>
                                            </div>
                                        )}
                                        <div className="text-xs">
                                            <p className="text-white/40 font-bold uppercase tracking-wider">Otè :</p>
                                            <p className="text-white font-bold">{ebook.authorName || "Jean Ronald Dumervil"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Why Read This Ebook */}
                            <div className="space-y-4 bg-white/[0.02] border border-white/10 rounded-3xl p-8">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">menu_book</span>
                                    <span>Poukisa ou dwe li Ebook sa a ?</span>
                                </h3>
                                <div 
                                    className="space-y-3 pt-2 text-sm text-white/70 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: ebook.description }}
                                />
                            </div>
                        </div>

                        {/* Right Sticky Purchase Sidebar (5 cols) */}
                        <div className="lg:col-span-5 lg:sticky lg:top-28">
                            <EbookPurchaseClient ebook={ebook} />
                        </div>
                    </div>

                    {/* Reviews & Social Proof Section */}
                    <ProductReviewsSection productId={ebook.id || id} productTitle={ebook.title} />
                </div>
            </main>

            <DashboardFooter />
        </div>
    );
}

import Link from "next/link";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import { getCourses } from "@/lib/courses";
import { getEbooks } from "@/lib/ebooks";
import { getGifts } from "@/lib/gifts";
import { Gift } from "@/lib/types";

export const revalidate = 3600;

export const metadata = {
    title: "Kado & Resous Gratis | DJR Akademi",
    description: "Jwenn resous gratis DJR Akademi yo — ebooks, gid ak kontni pou ede w kòmanse gratis.",
};

type FreeItem = {
    id: string;
    title: string;
    description: string;
    image: string;
    type: "Ebook" | "Kou" | "Bonus";
    fileUrl?: string;
    isKado?: boolean;
    kadoId?: string;
    isExpired?: boolean;
};

export default async function KadoPage() {
    const [courses, ebooks, gifts] = await Promise.all([getCourses(), getEbooks(), getGifts()]);

    const freeItems: FreeItem[] = [
        ...ebooks
            .filter((e) => e.status === "published" && Number(e.price) === 0)
            .map((e) => ({
                id: e.id!,
                title: e.title,
                description: e.description,
                image: e.coverImage || "/logo.png",
                type: "Ebook" as const,
                fileUrl: e.fileUrl,
            })),
        ...courses
            .filter((c) => c.statut === "published" && Number(c.price) === 0)
            .map((c) => ({
                id: c.id!,
                title: c.title,
                description: c.description,
                image: c.thumbnail || "/logo.png",
                type: "Kou" as const,
            })),
        ...gifts
            .filter((g) => g.isActive)
            .map((g) => {
                const isExpired = g.expirationDate && typeof g.expirationDate.toDate === 'function'
                    ? g.expirationDate.toDate().getTime() < Date.now()
                    : false;

                return {
                    id: g.giftProductId, // On redirige vers le produit cadeau
                    title: g.title, // On affiche le titre du Kado au lieu du produit original
                    description: g.description || `Cadeau exclusif : ${g.giftProductTitle}`,
                    image: g.photoLink || g.giftProductThumbnailUrl || "/logo.png",
                    type: "Bonus" as const,
                    isKado: true,
                    kadoId: g.id,
                    isExpired
                };
            }),
    ];

    return (
        <div className="min-h-screen bg-background-dark text-white">
            <DashboardHeader />

            <main className="pt-24 pb-24">
                {/* Hero */}
                <section className="max-w-[1200px] mx-auto px-6 py-16 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 border-b border-white/5">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c0 0-1.5-2-3-2S6 2.5 6 4c0 1 .5 2 1.5 2H12m0-3c0 0 1.5-2 3-2s3 1.5 3 3c0 1-.5 2-1.5 2H12m0-3v3M4 9h16M4 9a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1M4 9h16M6 12v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8m-6 0v9" />
                            </svg>
                            <span className="text-primary text-xs font-black uppercase tracking-widest">100% Gratis</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85] text-white">
                            Kado<br />
                            <span className="text-primary">w yo.</span>
                        </h1>
                        <p className="text-white/50 text-lg leading-relaxed max-w-lg">
                            Ebooks, gid ak resous pratik que Jean Ronald kreye espesyalman pou ede w kòmanse — gratis, san kondisyon.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-4xl font-black text-white">{freeItems.length}</p>
                            <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">Resous disponib</p>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-4xl font-black text-primary">$0</p>
                            <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">Pri total</p>
                        </div>
                    </div>
                </section>

                {/* Content Grid */}
                <section className="max-w-[1200px] mx-auto px-6 py-16">
                    {freeItems.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-32 gap-6">
                            <div className="size-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c0 0-1.5-2-3-2S6 2.5 6 4c0 1 .5 2 1.5 2H12m0-3c0 0 1.5-2 3-2s3 1.5 3 3c0 1-.5 2-1.5 2H12m0-3v3M4 9h16M4 9a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1M4 9h16M6 12v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8m-6 0v9" />
                                </svg>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-white font-bold text-xl">Byento disponib</p>
                                <p className="text-white/40 text-sm max-w-sm">
                                    Nou ap prepare kado yo pou ou. Tounen byento pou jwenn resous gratis yo.
                                </p>
                            </div>
                            <Link
                                href="/products"
                                className="px-6 py-3 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary/90 transition-all"
                            >
                                Wè tout pwodui yo
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {freeItems.map((item) => (
                                <KadoCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </section>

                {/* CTA Banner */}
                <section className="max-w-[1200px] mx-auto px-6">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-10 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 size-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="relative space-y-3 max-w-lg">
                            <p className="text-primary text-xs font-black uppercase tracking-widest">Pou ale pi lwen</p>
                            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
                                Prè pou envesti nan tèt ou ?
                            </h2>
                            <p className="text-white/50 text-sm leading-relaxed">
                                Dekouvri kou konplè, ebook pwofesyonèl ak sèvis konsiltasyon pou pwogrese pi vit.
                            </p>
                        </div>
                        <Link
                            href="/products"
                            className="relative shrink-0 px-8 py-4 bg-primary text-white rounded-full font-black uppercase tracking-wide text-sm hover:bg-primary/90 transition-all active:scale-95 shadow-xl shadow-primary/30"
                        >
                            Wè Catalogue Konplè
                        </Link>
                    </div>
                </section>
            </main>

            <DashboardFooter />
        </div>
    );
}

function KadoCard({ item }: { item: FreeItem }) {
    const href = item.isExpired ? "#" : item.type === "Ebook"
        ? `/course/${item.id}?type=ebook`
        : `/course/${item.id}`;

    return (
        <Link
            href={href}
            className={`group relative flex flex-col overflow-hidden rounded-3xl border ${
                item.isExpired ? "border-red-500/20 bg-red-500/5 opacity-80 cursor-not-allowed" : "border-white/10 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.04] hover:-translate-y-1"
            } transition-all duration-300`}
        >
            {/* Image */}
            <div className={`relative aspect-[4/3] overflow-hidden bg-white/5 ${item.isExpired ? "grayscale" : ""}`}>
                <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                        GRATIS
                    </span>
                    <span className="px-3 py-1 bg-black/60 backdrop-blur text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/10">
                        {item.type}
                    </span>
                    {item.isKado && !item.isExpired && (
                        <span className="px-3 py-1 bg-orange-500/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg">
                            <span className="material-symbols-outlined text-[10px]">redeem</span>
                            Kado Spécial
                        </span>
                    )}
                    {item.isExpired && (
                        <span className="px-3 py-1 bg-red-500/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg">
                            <span className="material-symbols-outlined text-[10px]">timer_off</span>
                            Expiré
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-6 gap-4">
                <div className="flex-1 space-y-2">
                    <h3 className="font-black text-white text-lg leading-snug tracking-tight group-hover:text-primary transition-colors">
                        {item.title}
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed line-clamp-2">
                        {item.description}
                    </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-primary">$0</span>
                        <span className="text-xs text-white/30 font-medium">100% gratis</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${item.isExpired ? "text-red-500" : "text-white/40 group-hover:text-primary"} transition-colors text-xs font-bold uppercase tracking-wider`}>
                        <span>{item.isExpired ? "Expiré" : "Jwenn li"}</span>
                        {!item.isExpired && (
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

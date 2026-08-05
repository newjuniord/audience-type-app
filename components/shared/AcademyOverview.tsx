"use client";

import TypingAnimation from "@/components/shared/TypingAnimation";
import Link from "next/link";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function AcademyOverview() {
    return (
        <section className="w-full max-w-[1200px] px-6 py-20 border-t border-white/5 space-y-24">
            {/* Category Grid */}
            <div className="space-y-12">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
                        KATEGORI & SÈVIS YO
                    </h2>
                    <p className="text-white/60 max-w-2xl mx-auto text-sm md:text-base">
                        Dekouvri diferan fason nou ka ede w grandi, aprann, ak ogmante revni w gras ak teknoloji ak kominikasyon.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Kou */}
                    <ScrollReveal delay={0}>
                        <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-primary">school</span>
                                    <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Kategori 1</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white">KOU</h3>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    Fòmasyon pratik ak konplè pou aprann kijan pou w itilize AI ak zouti dijital pou devlope biznis ou oswa karyè ou.
                                </p>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Ebook */}
                    <ScrollReveal delay={0.5}>
                        <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-primary">menu_book</span>
                                    <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Kategori 2</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white">EBOOK</h3>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    Gid ak liv elektwonik ki chaje ak estrateji dirèk pou w ka kòmanse aplike sa k ap mache kounye a.
                                </p>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Konsiltasyon */}
                    <ScrollReveal delay={1.0}>
                        <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-primary">forum</span>
                                    <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Kategori 3</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white">KONSILTASYON</h3>
                                <ul className="text-white/60 text-sm space-y-2 leading-relaxed">
                                    <li className="flex items-center gap-2">✔ Brand Pèsonèl</li>
                                    <li className="flex items-center gap-2">✔ Kreyasyon Kontni</li>
                                    <li className="flex items-center gap-2">✔ Biznis Dijital</li>
                                    <li className="flex items-center gap-2">✔ Ekriti Liv/Ebook</li>
                                    <li className="flex items-center gap-2">✔ Storytelling ak Kominikasyon</li>
                                    <li className="flex items-center gap-2">✔ Estrateji AI pou travay oswa biznis</li>
                                </ul>
                                <Link href="/coaching" className="mt-4 block text-center bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-colors border border-white/10">
                                    Rezève Yon Sesyon
                                </Link>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Sèvis */}
                    <ScrollReveal delay={1.5} className="lg:col-span-2">
                        <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-primary">design_services</span>
                                    <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Kategori 4</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white">SÈVIS PRATIK</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-white/60 text-sm">
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2">⚡ Ekri script videyo</li>
                                        <li className="flex items-center gap-2">⚡ Kreye plan kontni 30 jou</li>
                                        <li className="flex items-center gap-2">⚡ Korije/òganize ebook</li>
                                        <li className="flex items-center gap-2">⚡ Ekri/korije memwa inivèsite</li>
                                    </ul>
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2">⚡ Konseptyalize ebook pou vann</li>
                                        <li className="flex items-center gap-2">⚡ Kreye estrateji brand</li>
                                        <li className="flex items-center gap-2">⚡ Prepare diskou & prezantasyon</li>
                                        <li className="flex items-center gap-2">⚡ Kreye prompt AI pou biznis</li>
                                    </ul>
                                </div>
                                <Link href="/about#services" className="mt-4 block text-center bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-colors border border-white/10">
                                    Gade Tout Sèvis Yo
                                </Link>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Coaching Prive */}
                    <ScrollReveal delay={2.0}>
                        <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-primary">settings_accessibility</span>
                                    <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Kategori 5</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white">COACHING PRIVE</h3>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    Yon pwogram pèsonalize pou pastè, pè, paran, lidè, politisyen, vandè, CEO ak enfliyansè ki vle aprann pale ak plis klète, otorite, emosyon ak konviksyon, pou yo ka enfliyanse, konvenk, dirije epi touche moun yo ap adrese yo.
                                </p>
                                <Link href="/coaching" className="mt-4 block text-center bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-colors border border-white/10">
                                    Dekouvri Pwogram Nan
                                </Link>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Kado / Gratis */}
                    <ScrollReveal delay={2.5} className="lg:col-span-3">
                        <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <svg className="w-8 h-8 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c0 0-1.5-2-3-2S6 2.5 6 4c0 1 .5 2 1.5 2H12m0-3c0 0 1.5-2 3-2s3 1.5 3 3c0 1-.5 2-1.5 2H12m0-3v3M4 9h16M4 9a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1M4 9h16M6 12v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8m-6 0v9" />
                                        </svg>
                                        <h3 className="text-xl font-bold text-white">KADO / GRATIS</h3>
                                    </div>
                                    <p className="text-white/60 text-sm max-w-3xl">
                                        Resous gratis, e-books ak gid rapid ki fèt pou ede w fè premye pa w yo nan mond kreyasyon kontni an ak entèlijans atifisyèl.
                                    </p>
                                </div>
                                <a
                                    href="/kado"
                                    className="bg-secondary text-white font-bold px-6 py-3 rounded-full hover:bg-secondary/80 transition-all text-sm whitespace-nowrap self-stretch sm:self-auto text-center"
                                >
                                    Jwenn Kado w yo
                                </a>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </div>
        </section>
    );
}

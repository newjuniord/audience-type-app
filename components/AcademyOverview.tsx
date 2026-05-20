"use client";

import TypingAnimation from "./TypingAnimation";

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
                    <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
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

                    {/* Ebook */}
                    <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
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

                    {/* Konsiltasyon */}
                    <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
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
                        </div>
                    </div>

                    {/* Sèvis */}
                    <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between lg:col-span-2">
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
                        </div>
                    </div>

                    {/* Coaching Prive */}
                    <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-4xl text-primary">settings_accessibility</span>
                                <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Kategori 5</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white">COACHING PRIVE</h3>
                            <p className="text-white/60 text-sm leading-relaxed">
                                Yon pwogram pèsonalize pou pastè, pè, paran, lidè, politisyen, vandè, CEO ak enfliyansè ki vle aprann pale ak plis klète, otorite, emosyon ak konviksyon, pou yo ka enfliyanse, konvenk, dirije epi touche moun yo ap adrese yo.
                            </p>
                        </div>
                    </div>

                    {/* Kado / Gratis */}
                    <div className="bg-white/[0.02] border border-white/10 hover:border-primary/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between lg:col-span-3">
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
                </div>
            </div>

            {/* Author Biography Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12">
                <div className="lg:col-span-5 flex justify-center">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                        <img
                            src="https://firebasestorage.googleapis.com/v0/b/audience-type.firebasestorage.app/o/images%2F1779203875602_Dumervil.png?alt=media&token=eee8ea8b-2939-4507-8223-e4d71f970f3e"
                            alt="Jean Ronald Dumervil"
                            className="relative size-72 md:size-96 rounded-2xl object-cover border border-white/10"
                            onError={(e) => {
                                e.currentTarget.src = "/logo.png";
                            }}
                        />
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-6">
                    <div className="space-y-2">
                        <span className="text-primary font-bold text-xs uppercase tracking-widest">Fondatè DJR Akademi</span>
                        <h3 className="text-3xl md:text-4xl font-black text-white uppercase">Jean Ronald Dumervil</h3>
                    </div>
                    
                    <div className="space-y-4 text-white/70 text-sm md:text-base leading-relaxed">
                        <p className="italic text-white border-l-2 border-primary pl-4 py-1">
                            “Mond lan Gen ase richès pou tout moun jwenn epi viv byen. Men sa pa anpeche gen yon gwoup moun kap viv nan richès yon lòt group ap viv nan provrete. Liy ki separe de group moun sa yo rele konesans.”
                        </p>
                        <p>
                            Apre m fin ranmase plizyè milyon vyouz, gen prèske yon milyon moun kap swiv mwen, fè plizyè dizèn milye dola benefis sou entènèt la, mwen konkli ke DJR Akademi fonde pou elimine liy sa a, men tou kraze baryè povrete sa a nan lavi tout ayisyen ki vle.
                        </p>
                        <p>
                            DJR Akademi se pou Ayisyen ki pa vle rete dèyè nan epòk AI a. Li fèt pou kreyatè kontni, antreprenè, elèv, pwofesyonèl, lidè, pastè, paran, vandè, politisyen ak tout moun ki vle aprann pale pi byen, kreye pi byen, vann pi byen, epi konstwi yon lavi ki gen plis opòtinite.
                        </p>
                        <p>
                            Sou DJR Akademi, gen kou, ebook, konsiltasyon, coaching prive, ak sèvis pratik ki ede w aprann vit, aplike fasil, epi avanse ak plis konfyans. Nou pa sèlman baze sou teyori. Se eksperyans pratik Jean Ronald Dumervil kòm otè, fòmatè, kreyatè kontni, ak oratè k ap sèvi w chak jou pou ede w devlope konpetans ou yo.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

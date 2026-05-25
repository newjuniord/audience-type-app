"use client";

export default function FounderSection() {
    return (
        <section className="w-full max-w-[1200px] px-6 py-20 border-t border-white/5">
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

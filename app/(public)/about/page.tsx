import DashboardHeader from "@/components/buyer/DashboardHeader";
import DashboardFooter from "@/components/buyer/DashboardFooter";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sou Nou & Sèvis Pratik - DJR Akademi | Jean Ronald Dumervil",
    description: "Dekouvri istwa, misyon, fondatè Jean Ronald Dumervil ak tout sèvis pratik DJR Akademi.",
};

export default function AboutPage() {
    const servicesList = [
        { title: "Ekri script videyo", desc: "Script ki kapte atansyon depi nan premye segonn yo epi pouse moun pase a l'aksyon.", icon: "movie_edit" },
        { title: "Kreye plan kontni 30 jou", desc: "Yon kalandriye pèsonalize ak lide klè pou w rete konsistan sou rezo yo san pèdi tan.", icon: "calendar_month" },
        { title: "Korije/òganize ebook", desc: "Nou mete lòd nan lide w yo, korije fòt yo, epi ba l yon estrikti ki fasil pou li.", icon: "auto_stories" },
        { title: "Ekri/korije memwa inivèsite", desc: "Akònpanyeman pwofesyonèl pou travay inivèsitè w la reponn ak tout egzijans akademik yo.", icon: "school" },
        { title: "Konseptyalize ebook pou vann", desc: "Soti nan jwenn bon tit la, pase nan konsepsyon an, pou rive nan ang maketing pou vann li.", icon: "monetization_on" },
        { title: "Kreye estrateji brand", desc: "Defini idantite w, vwa w, ak fason pou w pozisyone tèt ou kòm yon lidè nan domèn ou.", icon: "campaign" },
        { title: "Prepare diskou & prezantasyon", desc: "Tèks ki gen enpak, byen estriktire, ki fèt pou kenbe atansyon kèlkeswa gwosè odyans lan.", icon: "record_voice_over" },
        { title: "Kreye prompt AI pou biznis", desc: "Prompt spesifik sou mezi ki pèmèt ou otomatize travay ou epi double pwodiktivite w ak AI.", icon: "smart_toy" },
    ];

    return (
        <div className="min-h-screen bg-background-dark text-white flex flex-col font-display">
            <DashboardHeader />

            <main className="flex-1 pt-24 pb-24 px-6">
                <div className="max-w-[1200px] mx-auto space-y-20">
                    {/* Header Banner */}
                    <div className="text-center space-y-4 pt-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                            <span className="text-primary text-xs font-black uppercase tracking-widest">A PWOPO NOU & SÈVIS NOU YO</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white">
                            DJR <span className="text-primary">Akademi</span>
                        </h1>
                        <p className="text-white/60 max-w-2xl mx-auto text-base md:text-lg">
                            Dekouvri ki moun nou ye, misyon nou ak tout sèvis pratik nou ofri pou ede w avanse pi vit.
                        </p>
                    </div>

                    {/* Section Fondateur & Misyon */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12">
                        <div className="lg:col-span-5 flex justify-center">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                                <img
                                    src="https://firebasestorage.googleapis.com/v0/b/djrakademi.firebasestorage.app/o/images%2F1779203875602_Dumervil.png?alt=media&token=eee8ea8b-2939-4507-8223-e4d71f970f3e"
                                    alt="Jean Ronald Dumervil"
                                    className="relative size-72 md:size-96 rounded-2xl object-cover border border-white/10"
                                />
                            </div>
                        </div>

                        <div className="lg:col-span-7 space-y-6">
                            <div className="space-y-2">
                                <span className="text-primary font-bold text-xs uppercase tracking-widest">Fondatè DJR Akademi</span>
                                <h2 className="text-3xl md:text-4xl font-black text-white uppercase">Jean Ronald Dumervil</h2>
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
                    </section>

                    {/* SECTION SÈVIS PRATIK INTEGRATED */}
                    <section id="services" className="pt-8 scroll-mt-28">
                        <div className="text-center mb-12 max-w-[700px] mx-auto space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                                <span className="material-symbols-outlined text-[14px] text-primary">design_services</span>
                                <span className="text-primary text-[10px] font-black uppercase tracking-widest">Sèvis Pratik</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
                                Delege Avèk Konfyans
                            </h2>
                            <p className="text-white/60 text-sm md:text-base leading-relaxed">
                                Ou pa bezwen fè tout bagay pou kont ou. Kite yon ekip pwofesyonèl pran an chaj kreyasyon kontni w, estrateji w ak pwojè w yo.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {servicesList.map((service, i) => (
                                <div key={i} className="bg-white/[0.02] border border-white/10 p-6 rounded-3xl hover:bg-white/5 hover:border-primary/40 transition-all duration-300 group shadow-lg flex flex-col h-full">
                                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary transition-all shrink-0">
                                        <span className="material-symbols-outlined text-primary group-hover:text-white text-2xl">{service.icon}</span>
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">{service.title}</h3>
                                    <p className="text-xs text-white/50 leading-relaxed font-medium flex-1">{service.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* CTA Section */}
                    <div className="text-center bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-10 space-y-6">
                        <h3 className="text-2xl md:text-3xl font-black uppercase text-white">
                            Prè pou w kòmanse ak DJR Akademi ?
                        </h3>
                        <p className="text-white/60 max-w-xl mx-auto text-sm md:text-base">
                            Fè yon ti pale avèk nou sou chat la oswa eksplore pwodui ak fòmasyon nou yo pou w ka kòmanse san pèdi tan.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 pt-2">
                            <Link href="/coaching" className="px-8 py-4 bg-primary text-white font-black uppercase tracking-wide text-xs rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">psychology</span>
                                <span>Konsiltasyon</span>
                            </Link>
                            <Link href="/products" className="px-8 py-4 bg-white/10 text-white font-black uppercase tracking-wide text-xs rounded-full hover:bg-white/20 border border-white/10 transition-all">
                                Gade Katalòg Pwodui Yo
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <DashboardFooter />
        </div>
    );
}

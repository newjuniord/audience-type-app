import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sèvis Pratik - DJR Akademi",
  description: "Delegasyon travay: Ekri script videyo, plan kontni, ebook, ak plis ankò.",
};

export default function ServicesPage() {
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
    <div className="min-h-screen bg-background-dark text-white font-display flex flex-col">
      <DashboardHeader />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative px-6 pt-32 pb-24 overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(242,140,40,0.15),transparent_50%)]" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.02),transparent_50%)]" />
          
          <div className="max-w-[1000px] mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <span className="material-symbols-outlined text-[14px] text-primary">design_services</span>
              <span className="text-primary text-[10px] font-black uppercase tracking-widest">Kategori 4</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-white mb-6">
              Sèvis <span className="text-primary">Pratik</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-10 font-medium max-w-[800px] mx-auto">
              Ou pa bezwen fè tout bagay pou kont ou. Kite yon ekip pwofesyonèl pran an chaj kreyasyon kontni w, estrateji w ak pwojè w yo pou w ka konsantre sou sa ki pi enpòtan pou ou.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <a href="#katalòg" className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-full font-black uppercase tracking-wide text-sm hover:bg-primary/90 hover:scale-105 transition-all active:scale-95 shadow-xl shadow-primary/30">
                <span className="material-symbols-outlined">visibility</span>
                Gade Tout Sèvis Yo
              </a>
              <a href="https://wa.me/821012345678" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white/70 hover:text-white rounded-full font-black uppercase tracking-wide text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-green-500">chat</span>
                Mande Yon Pri
              </a>
            </div>
          </div>
        </section>

        {/* SERVICES GRID */}
        <section id="katalòg" className="py-24 px-5 border-b border-white/5 bg-white/[0.02]">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-16 max-w-[700px] mx-auto">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-4">Ekskizite Nou</p>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-white">Delege Avèk Konfyans</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Chwazi sèvis ou bezwen an epi kite nou fè rès la ak nivo pèfeksyon ki fè repitasyon DJR Akademi.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {servicesList.map((service, i) => (
                <div key={i} className="bg-background-dark border border-white/5 p-6 rounded-3xl hover:bg-white/5 hover:border-primary/30 transition-all duration-300 group shadow-lg flex flex-col h-full">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary transition-all shrink-0">
                    <span className="material-symbols-outlined text-primary group-hover:text-white text-2xl">{service.icon}</span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">{service.title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed font-medium flex-1">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-32 px-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-[0.03]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(242,140,40,0.05),transparent_70%)]" />
          
          <div className="max-w-[700px] mx-auto relative z-10 bg-white/5 backdrop-blur-md border border-white/10 p-10 md:p-16 rounded-[3rem] shadow-2xl">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-white leading-tight">
              Prè pou w vanse pi vit?
            </h2>
            <p className="text-white/60 mb-10 text-base md:text-lg">
              Pa kite ti detay yo ralanti gwo vizyon w genyen an. Fè yon ti pale avèk nou jodi a pou nou wè kijan nou ka ede w.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://wa.me/821012345678" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-10 py-5 bg-primary text-white rounded-full font-black uppercase tracking-wide text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-3">
                <span className="material-symbols-outlined">chat</span>
                Mande Yon Devis
              </a>
            </div>
          </div>
        </section>

      </main>

      <DashboardFooter />
    </div>
  );
}

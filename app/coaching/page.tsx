import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import Link from "next/link";
import { Metadata } from "next";
import VideoPlayer from "@/components/VideoPlayer";

export const metadata: Metadata = {
  title: "Coaching Prive - DJR Akademi",
  description: "Yon pwogram pèsonalize pou pastè, pè, paran, lidè, politisyen, vandè, CEO ak enfliyansè.",
};

export default function CoachingPage() {
  return (
    <div className="min-h-screen bg-background-dark text-white font-display flex flex-col">
      <DashboardHeader />

      <main className="flex-1">
        {/* HERO SECTION WITH VSL */}
        <section className="relative px-6 pt-32 pb-24 overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(242,140,40,0.15),transparent_50%)]" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.02),transparent_50%)]" />
          
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
            
            {/* Left Column: Text & CTA */}
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
                <span className="material-symbols-outlined text-[14px] text-primary">psychology</span>
                <span className="text-primary text-[10px] font-black uppercase tracking-widest">Kategori 5</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-white mb-6">
                Coaching <span className="text-primary">Prive</span>
              </h1>
              
              <p className="text-lg text-white/70 leading-relaxed mb-10 font-medium">
                Yon pwogram pèsonalize pou <strong className="text-white">pastè, pè, paran, lidè, politisyen, vandè, CEO ak enfliyansè</strong> ki vle aprann pale ak plis klète, otorite, emosyon ak konviksyon, pou yo ka enfliyanse, konvenk, dirije epi touche moun yo ap adrese yo.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <Link href="/consultation" className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-full font-black uppercase tracking-wide text-sm hover:bg-primary/90 hover:scale-105 transition-all active:scale-95 shadow-xl shadow-primary/30">
                  <span className="material-symbols-outlined">rocket_launch</span>
                  Kòmanse Kounye A
                </Link>

              </div>
            </div>

            {/* Right Column: Video Sales Letter (VSL) */}
            <div className="w-full relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary/30 to-white/5 rounded-[2rem] blur-xl opacity-50"></div>
              <div className="w-full rounded-3xl p-2 bg-white/5 border border-white/10 shadow-2xl shadow-primary/10 relative">
                 <VideoPlayer url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" roundedClassName="rounded-2xl" />
              </div>
              
              {/* Trust badges below video */}
              <div className="flex items-center justify-center gap-6 mt-6">
                  <div className="flex items-center gap-2 text-white/40">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Sètifye</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                      <span className="material-symbols-outlined text-[16px]">lock</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Konfidansyèl</span>
                  </div>
              </div>
            </div>

          </div>
        </section>

        {/* FEATURES / BENEFITS */}
        <section className="py-24 px-5 border-b border-white/5 bg-white/[0.02]">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-16 max-w-[700px] mx-auto">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-4">Poukisa w dwe patisipe?</p>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-white">Devlope Otorite W Ak Paròl Ou</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Aprann metriz kominikasyon ki se zouti prensipal tout gwo lidè. Metòd sa a fèt pou bay rezilta rapid ak pratik nan lavi pwofesyonèl ou.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Kominikasyon Klè", desc: "Aprann fòmile lide w yo avèk presizyon pou pèsonn pa mal konprann vizyon w. Chak mo ap gen enpak li.", icon: "record_voice_over" },
                { title: "Otorite natirèl", desc: "Pran lapawòl ak yon asirans ki fè tout moun anvi tande sa w gen pou di a. Enpoze respè san fòse.", icon: "verified_user" },
                { title: "Koneksyon emosyonèl", desc: "Touche kè moun w ap pale yo, kreye senpati epi bati konfyans rapidman avèk odyans ou.", icon: "favorite" },
                { title: "Enfliyans ak enpak", desc: "Konvenk odyans ou, dirije ekip ou ak enspire foul moun natirèlman.", icon: "moving" },
                { title: "Metriz Estrès", desc: "Jere lakrentif ak trak pou w rete poze epi klè, kèlkeswa gwosè odyans ou ap afwonte a.", icon: "self_improvement" },
                { title: "Personal Branding", desc: "Bati yon repitasyon solid ki reflete konpetans ou kòm yon vrè lidè ak vizyonè.", icon: "star" },
              ].map((feature, i) => (
                <div key={i} className="bg-background-dark border border-white/5 p-8 rounded-3xl hover:bg-white/5 hover:border-primary/30 transition-all duration-300 group shadow-lg">
                  <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary transition-all">
                    <span className="material-symbols-outlined text-primary group-hover:text-white text-3xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mb-3">{feature.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed font-medium">{feature.desc}</p>
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
              Pwofite chans lan<br />jodi a
            </h2>
            <p className="text-white/60 mb-10 text-base md:text-lg">
              Plas yo limite pou nou ka garanti bon jan kalite ak atansyon pèsonalize chak moun bezwen pandan pwogram nan.
            </p>
            <div className="flex justify-center">
              <Link href="/consultation" className="w-full sm:w-auto px-10 py-5 bg-primary text-white rounded-full font-black uppercase tracking-wide text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-3">
                <span className="material-symbols-outlined">event_available</span>
                Rezève Sesyon W La
              </Link>
            </div>
          </div>
        </section>

      </main>

      <DashboardFooter />
    </div>
  );
}

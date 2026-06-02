"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getServices } from "@/lib/services";
import { Service } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import { createClient } from "@/lib/supabase/client";
import ConsultationBookingModal from "@/components/ConsultationBookingModal";

function normalizeAvailability(avail: any) {
  const initialAvailability: any = {
    "Monday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Tuesday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Wednesday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Thursday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Friday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Saturday": { enabled: false, startTime: "09:00", endTime: "17:00" },
    "Sunday": { enabled: false, startTime: "09:00", endTime: "17:00" },
  };

  if (!avail) return initialAvailability;
  const normalized = { ...initialAvailability };
  const mapping: Record<string, string> = {
    "lundi": "Monday", "monday": "Monday",
    "mardi": "Tuesday", "tuesday": "Tuesday",
    "mercredi": "Wednesday", "wednesday": "Wednesday",
    "jeudi": "Thursday", "thursday": "Thursday",
    "vendredi": "Friday", "friday": "Friday",
    "samedi": "Saturday", "saturday": "Saturday",
    "dimanche": "Sunday", "sunday": "Sunday"
  };

  Object.entries(avail).forEach(([key, val]: [string, any]) => {
    const englishKey = mapping[key.toLowerCase()];
    if (englishKey) {
      normalized[englishKey] = {
        enabled: val.enabled ?? false,
        startTime: val.startTime ?? "09:00",
        endTime: val.endTime ?? "17:00"
      };
    }
  });
  return normalized;
}

export default function ConsultationPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  const [hasActiveConsultation, setHasActiveConsultation] = useState(false);
  const [checkingActive, setCheckingActive] = useState(true);

  useEffect(() => {
    if (!user) {
      setCheckingActive(false);
      return;
    }
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const userId = user.id || (user as any).uid;
    
    supabase.from("bookingApplications").select("*").eq("usersId", userId)
    .then(({ data: snap, error }) => {
      if (error) {
        console.error("Error checking active consultations", error);
        setCheckingActive(false);
        return;
      }
      
      const validStatuses = ["accepted", "confirmed", "approved", "paid", "success", "active"];
      const hasActive = (snap || []).some((d: any) => {
        return d.bookingDate && d.bookingDate >= todayStr && validStatuses.includes((d.status || "").toLowerCase());
      });
      setHasActiveConsultation(hasActive);
      setCheckingActive(false);
    }, err => {
      console.error("Error checking active consultations", err);
      setCheckingActive(false);
    });
  }, [user, supabase]);

  useEffect(() => {
        // Mock data au lieu de `getServices()`
        const mockService = {
            id: 'mock-consultation-1',
            title: 'Consultation Stratégique',
            description: 'Une session de 45 minutes pour analyser vos besoins et élaborer un plan d\'action sur mesure pour votre projet web ou marketing.',
            price: '150',
            priceHTG: 22500, // Estimation (150 * 150)
            imageUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop',
            includedItems: [
                'Analyse préalable de votre projet',
                'Appel visio de 45 minutes',
                'Plan d\'action détaillé envoyé après l\'appel',
                'Support par email pendant 7 jours'
            ],
            availability: normalizeAvailability({
                "1": { enabled: true, startTime: "09:00", endTime: "17:00" },
                "2": { enabled: true, startTime: "09:00", endTime: "17:00" },
                "3": { enabled: true, startTime: "09:00", endTime: "17:00" },
                "4": { enabled: true, startTime: "09:00", endTime: "17:00" },
                "5": { enabled: true, startTime: "09:00", endTime: "16:00" },
            }),
            active: true,
            status: 'published',
            availabilityTimezoneOffset: -240 // Eastern Time (EST/EDT) -4 hours roughly
        };

        setService(mockService as any);
        setLoading(false);
  }, []);




  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background-dark text-white font-display flex flex-col justify-between">
        <DashboardHeader />
        
        <main className="flex-1 flex flex-col items-center justify-center text-center px-5 py-24">
          <span className="material-symbols-outlined text-6xl text-white/20 mb-4 block">event_busy</span>
          <h1 className="text-white text-2xl font-bold mb-2">Pa gen konsiltasyon ki disponib</h1>
          <p className="text-white/50 max-w-md mx-auto mb-6">Rezèvasyon yo fèmen pou kounye a. Tanpri tounen pita oswa kontakte nou sou chat support si w ta renmen mande yon plas espesyal.</p>
          <Link 
            href="/dashboard/chat"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase tracking-wide text-xs active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-base">chat</span>
            <span>Kontakte nou sou Chat Support</span>
          </Link>
        </main>
        
        <DashboardFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark text-white font-display flex flex-col">
      <DashboardHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative flex flex-col items-center justify-center text-center px-5 pt-32 pb-24 overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_center,rgba(242,140,40,0.1),transparent_50%)]" />
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8 relative z-10">
            <span className="material-symbols-outlined text-[14px] text-primary">star</span>
            <span className="text-primary text-[10px] font-black uppercase tracking-widest">Konsiltasyon Prive</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.85] text-white max-w-[900px] mb-6 relative z-10">
            {service.title}
          </h1>
          
          <p className="text-lg text-white/50 leading-relaxed max-w-[600px] mb-10 relative z-10">
            {service.description}
          </p>
          
          <div className="flex gap-2 flex-wrap justify-center mb-10 relative z-10">
            {["🇭🇹 Ayiti", "🇩🇴 Rep. Dom.", "🇫🇷 Lafrans", "🇺🇸 Etazini", "🇨🇦 Kanada", "🇲🇽 Meksik", "🇧🇷 Brezil", "🇨🇱 Chili"].map((f) => (
              <span key={f} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/60">
                {f}
              </span>
            ))}
          </div>
          
          <button onClick={() => setIsModalOpen(true)} className="relative z-10 inline-block px-8 py-4 bg-primary text-white rounded-full font-black uppercase tracking-wide text-sm hover:bg-primary/90 transition-all active:scale-95 shadow-xl shadow-primary/30">
            Rezève konsiltasyon mwen
          </button>
        </section>

        {/* STEPS */}
        <section className="py-24 px-5 border-b border-white/5 bg-white/[0.02]">
          <div className="max-w-[1000px] mx-auto text-center">
            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-4">Kijan sa mache</p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-16 text-white">3 etap senp</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {[
                { n: "1", t: "Chwazi lè w", d: "Chwazi dat ak lè ki bon pou ou nan zòn lè w la.", icon: "calendar_month" },
                { n: "2", t: "Verifye enfòmasyon w yo", d: "Konfime detay yo anba a anvan ou voye demann ou an.", icon: "chat" },
                { n: "3", t: "Konfime epi peye", d: "Fè peman an sekirite pou rezèvasyon ou an ka konfime.", icon: "credit_card" },
              ].map((s) => (
                <div key={s.n} className="flex flex-col items-center text-center group">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative group-hover:border-primary/50 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-primary">{s.icon}</span>
                    <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center border-2 border-background-dark">
                        {s.n}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-white">{s.t}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>



        {/* PRICING */}
        <section className="py-24 px-5 bg-[url('/bg-pattern.svg')] bg-fixed bg-center relative border-b border-white/5">
          <div className="absolute inset-0 bg-background-dark/95 backdrop-blur-sm z-0"></div>
          <div className="max-w-[620px] mx-auto text-center relative z-10">
            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-4">Pri</p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12 text-white">Envesti nan tèt ou</h2>
            
            <div className="relative border border-primary/30 rounded-3xl p-10 max-w-[420px] mx-auto overflow-hidden bg-white/[0.02]">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(242,140,40,0.15),transparent_70%)]" />
              
              <div className="font-black leading-none relative text-white" style={{ fontSize: "4.5rem" }}>
                <sup className="text-2xl align-super text-primary mr-1">$</sup>{service.price}
              </div>
              <p className="text-sm mt-3 font-bold text-white/50 uppercase tracking-widest">USD · 1 èdtan konsiltasyon</p>
              
              <div className="w-full h-px bg-white/10 my-8"></div>
              
              <ul className="text-left flex flex-col gap-4 mb-10">
                {(service.includedItems || []).map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-white/80">
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0">check_circle</span>
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              
              <button onClick={() => setIsModalOpen(true)} className="block w-full text-center font-black uppercase text-sm tracking-wide px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 bg-primary text-white shadow-xl shadow-primary/20 relative z-10">
                Rezève kounye a
              </button>
            </div>
          </div>
        </section>

        {/* BOOKING SECTION WRAPPER */}
        <section id="reserver" className="py-24 px-5">
          <div className="max-w-[620px] mx-auto">
            <div className="text-center mb-12">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-4">Rezèvasyon</p>
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-white">Rezève lè pa w la</h2>
                <p className="text-sm leading-relaxed text-white/50">
                Ou prè pou nou pale ? Klike sou bouton an pou w kòmanse planifye randevou a.
                </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-10 relative overflow-hidden text-center">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

              {checkingActive ? (
                <div className="text-center py-20 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-white/50 text-sm animate-pulse">N ap verifye dosye w...</p>
                </div>
              ) : hasActiveConsultation ? (
                <div className="text-center py-10 animate-in fade-in duration-300">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-amber-500/10 border border-amber-500/20">
                    <span className="material-symbols-outlined text-4xl text-amber-500">schedule</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3 text-white">Ou gen yon konsiltasyon deja</h3>
                  <p className="text-base text-white/60 leading-relaxed max-w-sm mx-auto">
                    Ou gen yon konsiltasyon ki poko pase kounye a. Ou dwe tann dat sa pase anvan ou ka rezève yon lòt.
                  </p>
                </div>
              ) : (
                <div className="py-10">
                    <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-primary text-white font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 mx-auto">
                        <span className="material-symbols-outlined">event</span>
                        Kòmanse rezèvasyon an
                    </button>
                    <p className="text-[10px] text-center mt-6 text-white/30 uppercase tracking-widest font-bold">
                        Peman sekirize.
                    </p>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>

      <DashboardFooter />

      <ConsultationBookingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        service={service}
      />
    </div>
  );
}

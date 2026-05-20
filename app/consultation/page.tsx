"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { getServices } from "@/lib/services";
import { Service } from "@/lib/types";
import { ActionModal } from "@/components/ui/ActionModal";


const SLOTS_KST = [
  { h: 10, m: 0 }, { h: 11, m: 30 }, { h: 13, m: 0 }, { h: 14, m: 30 },
  { h: 16, m: 0 }, { h: 17, m: 30 }, { h: 19, m: 0 }, { h: 20, m: 30 },
  { h: 22, m: 0 }, { h: 23, m: 30 },
];

const COUNTRIES = [
  { flag: "🇰🇷", name: "Corée du Sud", offset: 9, ref: true },
  { flag: "🇭🇹", name: "Haïti", offset: -5 },
  { flag: "🇩🇴", name: "Rép. Dominicaine", offset: -4 },
  { flag: "🇫🇷", name: "France", offset: 1 },
  { flag: "🇺🇸", name: "États-Unis (Est)", offset: -5 },
  { flag: "🇺🇸", name: "États-Unis (Ouest)", offset: -8 },
  { flag: "🇨🇦", name: "Canada (Est)", offset: -5 },
  { flag: "🇲🇽", name: "Mexique", offset: -6 },
  { flag: "🇧🇷", name: "Brésil", offset: -3 },
  { flag: "🇨🇱", name: "Chili", offset: -3 },
];

const COUNTRY_OFFSETS: Record<string, { offset: number; flag: string; code: string; placeholder: string }> = {
  haiti: { offset: -5, flag: "🇭🇹", code: "+509", placeholder: "+509 48 48 0229" },
  rd: { offset: -4, flag: "🇩🇴", code: "+1", placeholder: "+1 849 123 4567" },
  france: { offset: 1, flag: "🇫🇷", code: "+33", placeholder: "+33 6 12 34 56 78" },
  usa: { offset: -5, flag: "🇺🇸", code: "+1", placeholder: "+1 555 123 4567" },
  usa_east: { offset: -5, flag: "🇺🇸", code: "+1", placeholder: "+1 212 123 4567" },
  usa_central: { offset: -6, flag: "🇺🇸", code: "+1", placeholder: "+1 312 123 4567" },
  usa_mountain: { offset: -7, flag: "🇺🇸", code: "+1", placeholder: "+1 303 123 4567" },
  usa_pacific: { offset: -8, flag: "🇺🇸", code: "+1", placeholder: "+1 213 123 4567" },
  canada: { offset: -5, flag: "🇨🇦", code: "+1", placeholder: "+1 514 123 4567" },
  mexique: { offset: -6, flag: "🇲🇽", code: "+52", placeholder: "+52 55 1234 5678" },
  bresil: { offset: -3, flag: "🇧🇷", code: "+55", placeholder: "+55 11 91234 5678" },
  chili: { offset: -3, flag: "🇨🇱", code: "+56", placeholder: "+56 9 1234 5678" },
};

function convertTime(baseH: number, baseM: number, baseOffset: number, targetOffset: number) {
  let localH = baseH - baseOffset + targetOffset;
  if (localH < 0) localH += 24;
  if (localH >= 24) localH -= 24;
  return { h: localH, m: baseM };
}

function fmt(h: number, m: number) {
  const period = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const mm = m === 0 ? "" : ":" + String(m).padStart(2, "0");
  return `${h12}${mm} ${period}`;
}

function fmtUX(raw: string) {
  // Transforms "10 AM" → "10h du matin (AM)", "8:30 PM" → "8h30 du soir (PM)", etc.
  const match = raw.match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/);
  if (!match) return raw;
  const h = match[1];
  const m = match[2] ? match[2] : null;
  const period = match[3];
  const timePart = m ? `${h}h${m}` : `${h}h`;
  const label = period === "AM" ? "du matin" : "du soir";
  return `${timePart} ${label} (${period})`;
}

function baseToLocal(baseH: number, baseM: number, baseOffset: number) {
  const d = new Date();
  d.setUTCHours(baseH - baseOffset, baseM, 0, 0);
  return { h: d.getHours(), m: d.getMinutes() };
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS_MAP = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function CalendarPicker({ value, onChange, isDateAvailable }: { value: string; onChange: (v: string) => void; isDateAvailable?: (y: number, m: number, d: number) => boolean }) {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // Enforce 24 hours in advance (minimum is tomorrow)
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60); // Max 60 days in advance
  maxDate.setHours(23, 59, 59, 999);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(minDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(minDate.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Mon=0

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function toStr(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function isPast(day: number) {
    return new Date(viewYear, viewMonth, day) < minDate;
  }

  function isDisabledDay(day: number) {
    if (isPast(day)) return true;
    const dateObj = new Date(viewYear, viewMonth, day);
    if (dateObj > maxDate) return true;
    if (isDateAvailable) return !isDateAvailable(viewYear, viewMonth, day);
    return false;
  }

  function isSelected(day: number) {
    return value === toStr(viewYear, viewMonth, day);
  }

  function isTomorrow(day: number) {
    return viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth() && day === minDate.getDate();
  }

  function prev() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  }

  // Prevent navigating to a month completely in the past relative to minDate
  const isPrevDisabled = new Date(viewYear, viewMonth, 1) <= new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  function next() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  }

  // Prevent navigating beyond 60 days
  const isNextDisabled = new Date(viewYear, viewMonth, 1) >= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  const displayValue = value
    ? (() => { const [y, m, d] = value.split("-").map(Number); return `${d} ${MONTHS_FR[m - 1]} ${y}`; })()
    : "";

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm rounded px-3 py-2.5 outline-none transition-colors border text-left"
        style={{ background: open ? "#fff" : "#FAF7F2", borderColor: open ? "#C9A84C" : "#DDD8CF", color: value ? "#111" : "#9E9082" }}>
        <span>{displayValue || "Sélectionnez une date"}</span>
        <span className="material-symbols-outlined text-lg" style={{ color: "#9E9082" }}>calendar_month</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 right-0 rounded-lg shadow-xl border p-4 animate-in fade-in zoom-in-95 duration-150"
          style={{ background: "#fff", borderColor: "rgba(201,168,76,.3)" }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prev} disabled={isPrevDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span className="text-sm font-semibold text-black">{MONTHS_FR[viewMonth]} {viewYear}</span>
            <button type="button" onClick={next} disabled={isNextDisabled} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
          {/* Day names */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS_FR.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium uppercase py-1" style={{ color: "#9E9082" }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button type="button" disabled={isDisabledDay(day)}
                    onClick={() => { onChange(toStr(viewYear, viewMonth, day)); setOpen(false); }}
                    className="w-9 h-9 rounded-full text-sm flex items-center justify-center transition-all"
                    style={{
                      background: isSelected(day) ? "#C9A84C" : "transparent",
                      color: isSelected(day) ? "#fff" : isDisabledDay(day) ? "#DDD8CF" : "#111",
                      fontWeight: isTomorrow(day) || isSelected(day) ? 600 : 400,
                      border: isTomorrow(day) && !isSelected(day) ? "1px solid #C9A84C" : "1px solid transparent",
                      cursor: isDisabledDay(day) ? "not-allowed" : "pointer",
                    }}>
                    {day}
                  </button>
                ) : <div className="w-9 h-9" />}
              </div>
            ))}
          </div>
          {/* Tomorrow button */}
          <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTop: "1px solid rgba(201,168,76,.15)" }}>
            <button type="button"
              onClick={() => { setViewYear(minDate.getFullYear()); setViewMonth(minDate.getMonth()); onChange(toStr(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())); setOpen(false); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors hover:bg-black/5" style={{ color: "#C9A84C" }}>
              Demain
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors hover:bg-black/5" style={{ color: "#9E9082" }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsultationPage() {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const baseOffset = service?.availabilityTimezoneOffset ?? 9;

  useEffect(() => {
    getServices().then(services => {
      const published = services.find(s => s.status === 'published' || s.active);
      setService(published || null);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nomPrenom: "", pays: "", whatsapp: "", date: "", sujet: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [usZone, setUsZone] = useState("");

  const effectivePays = formData.pays === "usa" && usZone ? usZone : formData.pays;
  const selectedCountry = COUNTRY_OFFSETS[effectivePays];


  const checkDateAvailability = useCallback((y: number, m: number, d: number) => {
    if (!service || !service.availability) return false;
    const baseOffset = service.availabilityTimezoneOffset ?? 9;
    const targetOffset = - (new Date().getTimezoneOffset() / 60);

    for (let localH = 0; localH < 24; localH++) {
      let adminH = localH - targetOffset + baseOffset;
      let dayOffset = 0;
      if (adminH < 0) { adminH += 24; dayOffset = -1; }
      else if (adminH >= 24) { adminH -= 24; dayOffset = 1; }

      const dateObj = new Date(y, m, d);
      dateObj.setDate(dateObj.getDate() + dayOffset);
      const dayAvail = service.availability[DAYS_MAP[dateObj.getDay()]];

      if (dayAvail && dayAvail.enabled) {
        const [startH] = dayAvail.startTime.split(':').map(Number);
        const [endH] = dayAvail.endTime.split(':').map(Number);
        if (adminH >= startH && adminH < endH) return true;
      }
    }
    return false;
  }, [service]);

  const hasAnySlotsForThisDay = useMemo(() => {
    if (!formData.date) return false;
    const [y, m, d] = formData.date.split("-").map(Number);
    return checkDateAvailability(y, m - 1, d);
  }, [formData.date, checkDateAvailability]);

  const localSlots = useMemo(() => {
    if (!service || !service.availability || !formData.date || !selectedCountry) return [];

    const baseOffset = service.availabilityTimezoneOffset ?? 9;
    const targetOffset = selectedCountry.offset;
    const [y, m, d] = formData.date.split("-").map(Number);
    const slots = [];

    for (let localH = 0; localH < 24; localH++) {
      let adminH = localH - targetOffset + baseOffset;
      let dayOffset = 0;
      if (adminH < 0) { adminH += 24; dayOffset = -1; }
      else if (adminH >= 24) { adminH -= 24; dayOffset = 1; }

      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() + dayOffset);
      const adminDayName = DAYS_MAP[dateObj.getDay()];
      const dayAvail = service.availability[adminDayName];

      if (dayAvail && dayAvail.enabled) {
        const [startH, startM] = dayAvail.startTime.split(':').map(Number);
        const [endH] = dayAvail.endTime.split(':').map(Number);
        if (adminH >= startH && adminH < endH) {
          slots.push({
            local: fmt(localH, startM), // format to string like "10 AM"
            baseStr: `${adminH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`
          });
        }
      }
    }
    return slots;
  }, [service, formData.date, selectedCountry]);

  const countryTimes = useMemo(() =>
    COUNTRIES.map((c) => {
      const start = convertTime(10, 0, 9, c.offset); // Legacy mapping display
      const end = convertTime(0, 30, 9, c.offset); // Legacy mapping display
      const sFmt = fmt(start.h, start.m);
      const eFmt = fmt(end.h, end.m);

      // Si le début est PM (soirée) et la fin est AM (matinée du lendemain)
      // on inverse l'ordre d'affichage pour que l'heure AM (matin) soit affichée en premier (meilleure UX)
      const isStartPm = sFmt.includes("PM");
      const isEndAm = eFmt.includes("AM");

      const displayRange = (isStartPm && isEndAm)
        ? `${eFmt} → ${sFmt}`
        : `${sFmt} → ${eFmt}`;

      return { ...c, displayRange };
    }), []);

  const isFormValid =
    formData.nomPrenom && formData.pays &&
    formData.whatsapp && formData.date && formData.sujet &&
    selectedSlot !== null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const newData = { ...formData, [e.target.name]: e.target.value };
    if (e.target.name === "pays") {
      setSelectedSlot(null);
      setUsZone("");
      const c = COUNTRY_OFFSETS[e.target.value];
      if (c) newData.whatsapp = c.code + " ";
    }
    setFormData(newData);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;
    setReviewing(true);
  }

  function handlePaymentSelection(method: "moncash" | "card") {
    const slot = localSlots[selectedSlot!];
    const waNum = service?.whatsappNumber || "821012345678";
    const paymentMethodName = method === "moncash" ? `MonCash (${service?.priceHTG || 20000} HTG)` : `Carte bancaire / PayPal (${service?.price} USD)`;
    const msg = `📋 *DEMANDE DE CONSULTATION*\n\nNom et prénom: ${formData.nomPrenom}\nPays: ${formData.pays}\nWhatsApp: ${formData.whatsapp}\nDate: ${formData.date}\nCréneau: ${slot.baseStr} (Heure admin) / ${fmtUX(slot.local)} heure locale\n\nMéthode de paiement choisie: ${paymentMethodName}\n\nSujet: ${formData.sujet}\n\n💰 Montant: ${service?.price} USD (1h)`;
    setShowPaymentModal(false);
    setReviewing(false);
    setSubmitted(true);
    setTimeout(() => window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank"), 800);
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="text-white opacity-50">Chargement...</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-5" style={{ background: "#0a0a0a" }}>
        <span className="material-symbols-outlined text-6xl text-white/20 mb-4 block">event_busy</span>
        <h1 className="text-white text-2xl font-semibold mb-2">Aucune consultation disponible</h1>
        <p className="text-white/50">Les réservations sont temporairement fermées. Veuillez revenir plus tard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
      `}</style>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-5 py-16 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #1a1610 50%, #0d0b08 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(201,168,76,.1), transparent 70%)" }} />
        <p className="text-[11px] tracking-[.4em] uppercase mb-8" style={{ color: "#C9A84C", opacity: 0.85 }}>
          ★ Consultation Privée ★
        </p>
        <h1 className="font-playfair text-white font-semibold leading-tight max-w-[700px] mb-6"
          style={{ fontSize: "clamp(2rem, 5.5vw, 3.8rem)" }}>
          {service.title}
        </h1>
        <p className="text-base font-light max-w-[460px] leading-relaxed mb-10" style={{ color: "rgba(255,255,255,.55)" }}>
          {service.description}
        </p>
        <div className="flex gap-2 flex-wrap justify-center mb-10">
          {["🇭🇹 Haïti", "🇩🇴 Rép. Dom.", "🇫🇷 France", "🇺🇸 États-Unis", "🇨🇦 Canada", "🇲🇽 Mexique", "🇧🇷 Brésil", "🇨🇱 Chili"].map((f) => (
            <span key={f} className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px]"
              style={{ border: "1px solid rgba(201,168,76,.25)", color: "rgba(255,255,255,.6)" }}>{f}</span>
          ))}
        </div>
        <a href="#reserver" className="inline-block font-semibold text-sm tracking-wide px-10 py-3.5 rounded-lg transition-all hover:-translate-y-0.5"
          style={{ background: "#C9A84C", color: "#111" }}>
          Réserver ma consultation →
        </a>
      </section>

      {/* STEPS */}
      <section className="py-16 px-5 bg-white dark:bg-[#1a1a1a] border-t border-b" style={{ borderColor: "rgba(201,168,76,.25)" }}>
        <div className="max-w-[900px] mx-auto">
          <p className="text-[11px] font-medium tracking-[.35em] uppercase" style={{ color: "#8A6A1F" }}>Comment ça marche</p>
          <h2 className="font-playfair font-semibold leading-tight mt-2 mb-3 text-black dark:text-white" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>3 étapes simples</h2>
          <div className="w-12 h-0.5 mb-8" style={{ background: "#C9A84C" }} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { n: "1", t: "Choisissez votre créneau", d: "Sélectionnez la date et l'heure qui vous conviennent dans votre fuseau horaire." },
              { n: "2", t: "Confirmez par WhatsApp", d: "Recevez la confirmation et les instructions de paiement directement sur WhatsApp." },
              { n: "3", t: "Connectez-vous", d: "Rejoignez votre session privée en ligne à l'heure convenue. 1h de coaching intensif." },
            ].map((s) => (
              <div key={s.n} className="text-center p-5">
                <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3 font-semibold text-lg" style={{ background: "#C9A84C", color: "#111" }}>{s.n}</div>
                <h3 className="font-semibold text-sm mb-1 text-black dark:text-white">{s.t}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#5C5546" }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIMEZONE GRID */}
      <section className="py-16 px-5" style={{ background: "#FAF7F2" }}>
        <div className="max-w-[900px] mx-auto">
          <p className="text-[11px] font-medium tracking-[.35em] uppercase" style={{ color: "#8A6A1F" }}>Disponibilités</p>
          <h2 className="font-playfair font-semibold leading-tight mt-2 mb-3 text-black" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>Horaires par pays</h2>
          <div className="w-12 h-0.5 mb-4" style={{ background: "#C9A84C" }} />
          <p className="text-sm leading-relaxed max-w-[560px] mb-8" style={{ color: "#5C5546" }}>
            Les horaires ci-dessous sont traduits dans votre heure locale pour simplifier la réservation :
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {countryTimes.map((c) => (
              <div key={c.name} className="relative p-4 rounded-lg bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ border: c.ref ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,.25)", background: c.ref ? "linear-gradient(135deg,#fffdf8,#fff)" : "#fff" }}>
                {c.ref && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-sm text-[8px] font-semibold tracking-widest uppercase" style={{ background: "#C9A84C", color: "#111" }}>Réf.</span>}
                <span className="text-2xl block mb-1">{c.flag}</span>
                <h3 className="text-[10px] font-medium tracking-wider uppercase mb-1" style={{ color: "#5C5546" }}>{c.name}</h3>
                <div className="font-playfair font-semibold text-lg text-black">
                  {c.displayRange}
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: "#9E9082" }}>Plage de disponibilité</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs italic" style={{ color: "#9E9082" }}>* Les horaires peuvent varier selon l&apos;heure d&apos;été. Confirmez via WhatsApp.</p>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-16 px-5 text-center" style={{ background: "#111", color: "#fff" }}>
        <div className="max-w-[620px] mx-auto">
          <p className="text-[11px] font-medium tracking-[.35em] uppercase" style={{ color: "#E8D5A3" }}>Tarif</p>
          <h2 className="font-playfair font-semibold leading-tight mt-2 mb-3 text-white" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>Investissez en vous</h2>
          <div className="w-12 h-0.5 mx-auto mb-8" style={{ background: "#C9A84C" }} />
          <div className="relative border rounded-xl p-8 max-w-[400px] mx-auto overflow-hidden" style={{ borderColor: "rgba(201,168,76,.3)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,168,76,.08), transparent 70%)" }} />
            <div className="font-playfair font-semibold leading-none relative" style={{ fontSize: "3.5rem", color: "#C9A84C" }}>
              <sup className="text-2xl align-super" style={{ color: "#E8D5A3" }}>$</sup>{service.price}
            </div>
            <p className="text-sm mt-1 tracking-wide" style={{ color: "rgba(255,255,255,.45)" }}>USD · 1 heure de consultation</p>
            <ul className="mt-5 mb-5 text-left flex flex-col gap-2 relative">
              {(service.includedItems || []).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,.65)" }}>
                  <span className="font-semibold text-xs" style={{ color: "#C9A84C" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href="#reserver" className="block text-center font-semibold text-sm tracking-wide px-8 py-3.5 rounded-lg transition-all hover:-translate-y-0.5 relative"
              style={{ background: "#C9A84C", color: "#111" }}>
              Réserver maintenant
            </a>
          </div>
        </div>
      </section>

      {/* BOOKING FORM */}
      <section id="reserver" className="py-16 px-5" style={{ background: "#FAF7F2" }}>
        <div className="max-w-[620px] mx-auto">
          <p className="text-[11px] font-medium tracking-[.35em] uppercase" style={{ color: "#8A6A1F" }}>Réservation</p>
          <h2 className="font-playfair font-semibold leading-tight mt-2 mb-3 text-black" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>Réservez votre séance</h2>
          <div className="w-12 h-0.5 mb-4" style={{ background: "#C9A84C" }} />
          <p className="text-sm leading-relaxed mb-8" style={{ color: "#5C5546" }}>
            Remplissez le formulaire. Vous recevrez une confirmation par WhatsApp avec les instructions de paiement.
          </p>

          <div className="bg-white rounded-lg p-6 sm:p-8" style={{ border: "1px solid rgba(201,168,76,.25)" }}>
            {submitted ? (
              /* ── SUCCÈS ── */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg,#d4f0e4,#a8dfcc)" }}>
                  <span className="text-3xl">✅</span>
                </div>
                <h3 className="font-playfair text-xl font-semibold mb-2" style={{ color: "#1A6B42" }}>Demande envoyée !</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#2D8A59" }}>
                  Merci ! Vous recevrez une confirmation sur WhatsApp.<br /><strong>{service.price} USD · 1 heure</strong>
                </p>
              </div>
            ) : reviewing ? (
              /* ── RÉVISION ── */
              <div>
                <p className="text-[11px] font-semibold tracking-[.3em] uppercase mb-1" style={{ color: "#8A6A1F" }}>Révision</p>
                <h3 className="font-playfair text-xl font-semibold mb-1 text-black">Vérifiez vos informations</h3>
                <p className="text-xs mb-5" style={{ color: "#9E9082" }}>Confirmez les détails ci-dessous avant d&apos;envoyer votre demande.</p>
                <div className="w-full h-px mb-5" style={{ background: "rgba(201,168,76,.2)" }} />

                <ul className="flex flex-col gap-4 mb-6">
                  {[
                    { label: "Nom et prénom", value: formData.nomPrenom, icon: "👤" },
                    { label: "Pays", value: selectedCountry ? `${selectedCountry.flag} ${effectivePays}` : formData.pays, icon: "🌍" },
                    { label: "WhatsApp", value: formData.whatsapp, icon: "📱" },
                    { label: "Date souhaitée", value: (() => { const [y, m, d] = formData.date.split("-").map(Number); const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]; return `${d} ${MONTHS[m - 1]} ${y}`; })(), icon: "📅" },
                    { label: "Créneau horaire", value: selectedSlot !== null ? (<span>{fmtUX(localSlots[selectedSlot].local)}<span className="opacity-50 text-[10px] ml-2">· 1 heure</span></span>) : "", icon: "🕐" },
                    { label: "Sujet", value: formData.sujet, icon: "💬" },
                  ].map((row) => (
                    <li key={row.label} className="flex items-start gap-3">
                      <span className="text-base mt-0.5">{row.icon}</span>
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider uppercase mb-0.5" style={{ color: "#9E9082" }}>{row.label}</p>
                        <p className="text-sm font-medium text-black leading-snug">{row.value}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="rounded-lg p-4 mb-5" style={{ background: "#FFFBF0", border: "1px solid rgba(201,168,76,.3)" }}>
                  <p className="text-xs font-semibold" style={{ color: "#8A6A1F" }}>💰 Montant : <span className="font-bold text-sm">{service.price} USD</span> · 1 heure de consultation</p>
                  <p className="text-[11px] mt-1" style={{ color: "#9E9082" }}>Le paiement s&apos;effectue après confirmation par WhatsApp.</p>
                </div>

                <button onClick={() => setShowPaymentModal(true)}
                  className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide transition-all hover:-translate-y-0.5 mb-3"
                  style={{ background: "#C9A84C", color: "#111" }}>
                  ✅ Confirmer et payer
                </button>
                <button onClick={() => setReviewing(false)}
                  className="w-full py-2 text-xs font-medium rounded-lg transition-colors"
                  style={{ color: "#9E9082", background: "#FAF7F2" }}>
                  ← Modifier mes informations
                </button>
              </div>
            ) : (
              /* ── FORMULAIRE ── */
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1 mb-3">
                  <label className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#5C5546" }}>Nom et prénom *</label>
                  <input name="nomPrenom" value={formData.nomPrenom} onChange={handleChange} placeholder="Marie Dupont" required
                    className="text-sm rounded px-3 py-2.5 outline-none transition-colors border text-black"
                    style={{ background: "#FAF7F2", borderColor: "#DDD8CF" }}
                    onFocus={(e) => { e.target.style.borderColor = "#C9A84C"; e.target.style.background = "#fff"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#DDD8CF"; e.target.style.background = "#FAF7F2"; }} />
                </div>

                <div className="flex flex-col gap-1 mb-3">
                  <label className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#5C5546" }}>Pays / Fuseau Horaire *</label>
                  <select name="pays" value={formData.pays} onChange={handleChange} required
                    className="text-sm rounded px-3 py-2.5 outline-none transition-colors border text-black"
                    style={{ background: "#FAF7F2", borderColor: "#DDD8CF" }}>
                    <option value="">— Sélectionnez —</option>
                    <option value="haiti">🇭🇹 Haïti</option>
                    <option value="rd">🇩🇴 Rép. Dominicaine</option>
                    <option value="france">🇫🇷 France</option>
                    <option value="usa">🇺🇸 États-Unis</option>
                    <option value="canada">🇨🇦 Canada</option>
                    <option value="mexique">🇲🇽 Mexique</option>
                    <option value="bresil">🇧🇷 Brésil</option>
                    <option value="chili">🇨🇱 Chili</option>
                  </select>
                </div>

                {formData.pays === "usa" && (
                  <div className="flex flex-col gap-1 mb-3">
                    <label className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#5C5546" }}>Fuseau horaire *</label>
                    <select value={usZone} onChange={(e) => { setUsZone(e.target.value); setSelectedSlot(null); }} required
                      className="text-sm rounded px-3 py-2.5 outline-none transition-colors border text-black"
                      style={{ background: "#FAF7F2", borderColor: "#DDD8CF" }}>
                      <option value="">— Sélectionnez votre fuseau —</option>
                      <option value="usa_east">🕔 Eastern (New York, Miami, Atlanta)</option>
                      <option value="usa_central">🕔 Central (Chicago, Houston, Dallas)</option>
                      <option value="usa_mountain">🕔 Mountain (Denver, Phoenix)</option>
                      <option value="usa_pacific">🕔 Pacific (Los Angeles, San Francisco)</option>
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1 mb-3">
                  <label className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#5C5546" }}>WhatsApp *</label>
                  <div className="grid" style={{ gridTemplateColumns: "auto 1fr" }}>
                    <div className="flex items-center gap-1 px-3 py-2.5 text-xs font-medium rounded-l border border-r-0 whitespace-nowrap"
                      style={{ background: "#EEE9E1", borderColor: "#DDD8CF", color: "#5C5546" }}>
                      {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.code}` : "📱 WhatsApp"}
                    </div>
                    <input name="whatsapp" value={formData.whatsapp} onChange={handleChange}
                      placeholder={selectedCountry?.placeholder || "+XXX XXXX XXXX"} required type="tel"
                      className="text-sm rounded-r px-3 py-2.5 outline-none transition-colors border text-black"
                      style={{ background: "#FAF7F2", borderColor: "#DDD8CF" }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1 mb-3">
                  <label className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#5C5546" }}>Date souhaitée *</label>
                  <CalendarPicker value={formData.date} onChange={(d) => setFormData({ ...formData, date: d })} isDateAvailable={checkDateAvailability} />
                </div>

                <div className="flex flex-col gap-1 mb-3">
                  <label className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#5C5546" }}>Créneau horaire * {(!formData.pays || (formData.pays === "usa" && !usZone)) && <span className="normal-case tracking-normal font-normal italic" style={{ color: "#C9A84C" }}>(sélectionnez d&apos;abord votre pays{formData.pays === "usa" ? " et fuseau" : ""})</span>}</label>
                  {(formData.pays && (formData.pays !== "usa" || usZone)) ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {localSlots.map((s, i) => (
                        <button key={i} type="button" onClick={() => setSelectedSlot(i)}
                          className="p-2.5 rounded-md text-center transition-all border cursor-pointer"
                          style={{
                            background: selectedSlot === i ? "linear-gradient(135deg,#FFFBF0,#FFF8E7)" : "#FAF7F2",
                            borderColor: selectedSlot === i ? "#C9A84C" : "#DDD8CF",
                            boxShadow: selectedSlot === i ? "0 0 0 1px #C9A84C" : "none",
                          }}>
                          <div className="font-semibold text-xs text-black leading-tight">{fmtUX(s.local)}</div>
                          <div className="text-[10px] mt-1" style={{ color: "#9E9082" }}>⏳ 1 heure</div>
                        </button>
                      ))}
                    </div>
                  ) : !formData.date ? (
                    <div className="p-6 rounded-md text-center text-xs" style={{ background: "#FAF7F2", border: "1px dashed #DDD8CF", color: "#9E9082" }}>
                      Veuillez sélectionner une date ci-dessus.
                    </div>
                  ) : !hasAnySlotsForThisDay ? (
                    <div className="p-6 rounded-md text-center text-xs" style={{ background: "#FAF7F2", border: "1px dashed #DDD8CF", color: "#9E9082" }}>
                      Aucun créneau disponible pour ce jour. Veuillez sélectionner une autre date.
                    </div>
                  ) : (
                    <div className="p-6 rounded-md text-center text-xs" style={{ background: "#FAF7F2", border: "1px dashed #DDD8CF", color: "#9E9082" }}>
                      Veuillez sélectionner votre pays ci-dessus pour voir les créneaux dans votre fuseau horaire.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 mb-3">
                  <label className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#5C5546" }}>Sujet *</label>
                  <textarea name="sujet" value={formData.sujet} onChange={handleChange} rows={3}
                    placeholder="Décrivez brièvement votre objectif ou problématique..." required
                    className="text-sm rounded px-3 py-2.5 outline-none transition-colors border text-black resize-y min-h-[80px]"
                    style={{ background: "#FAF7F2", borderColor: "#DDD8CF" }} />
                </div>

                <button type="submit" disabled={!isFormValid}
                  className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 mt-1"
                  style={{ background: "#C9A84C", color: "#111" }}>
                  Vérifier ma demande →
                </button>
                <p className="text-[10px] text-center mt-3 leading-relaxed" style={{ color: "#9E9082" }}>
                  Vos informations sont strictement confidentielles. La confirmation sera envoyée via WhatsApp.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-5 text-center" style={{ background: "#111", borderTop: "1px solid rgba(201,168,76,.15)" }}>
        <p className="text-[11px] tracking-wide" style={{ color: "#C9A84C", opacity: 0.7 }}>★ Consultation Privée ★</p>
        <p className="text-[11px] tracking-wide mt-1" style={{ color: "rgba(255,255,255,.3)" }}>Consultations en ligne privées et personnalisées</p>
      </footer>

      {/* ── PAYMENT ACTION MODAL ── */}
      <ActionModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        iconEmoji="💳"
        title="Sélectionnez votre paiement"
        subtitle="Consultation privée · 1h"
      >
        <div className="text-white space-y-4">
          <div className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-white/50">Total</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white">${service.price} USD</span>
            </div>
          </div>

          <p className="text-xs text-white/40 text-center font-semibold uppercase tracking-widest">Comment veux-tu payer ?</p>

          <div className="space-y-3">
            {formData.pays === "haiti" && (
              <button onClick={() => handlePaymentSelection("moncash")}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#e30713]/20 to-[#e30713]/5 border-2 border-[#e30713]/50 hover:border-[#e30713] rounded-2xl transition-all active:scale-95 group text-left">
                <img src="/images/moncash-logo.png" alt="MonCash" className="size-12 object-contain rounded-xl shadow-lg shrink-0" onError={(e) => { e.currentTarget.src = "https://play-lh.googleusercontent.com/4g8lT5G0lO3Hwtm5X5wIhpWl4uS45j6m6jN6k9XJ2Y" }} />
                <div className="flex-1">
                  <p className="font-black text-white text-sm">MonCash ({service.priceHTG || 20000} HTG)</p>
                  <p className="text-xs text-white/50">Paiement mobile haïtien · Rapide</p>
                </div>
                <svg className="size-5 text-white/50 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}

            <button onClick={() => handlePaymentSelection("card")}
              className="w-full flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 hover:border-white/30 hover:bg-white/[0.06] rounded-2xl transition-all active:scale-95 group text-left">
              <div className="size-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <span className="text-xl">💳</span>
              </div>
              <div className="flex-1">
                <p className="font-black text-white text-sm">Carte bancaire · PayPal</p>
                <p className="text-xs text-white/50">Visa, Mastercard, American Express, PayPal</p>
              </div>
              <svg className="size-5 text-white/50 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}

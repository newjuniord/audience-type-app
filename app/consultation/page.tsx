"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { getServices } from "@/lib/services";
import { Service } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import CheckoutModal from "@/components/CheckoutModal";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import { auth } from "@/lib/firebase";

const SLOTS_KST = [
  { h: 10, m: 0 }, { h: 11, m: 30 }, { h: 13, m: 0 }, { h: 14, m: 30 },
  { h: 16, m: 0 }, { h: 17, m: 30 }, { h: 19, m: 0 }, { h: 20, m: 30 },
  { h: 22, m: 0 }, { h: 23, m: 30 },
];

const COUNTRIES = [
  { flag: "🇰🇷", name: "Kore di Sid", offset: 9, ref: true },
  { flag: "🇭🇹", name: "Ayiti", offset: -5 },
  { flag: "🇩🇴", name: "Repiblik Dominikèn", offset: -4 },
  { flag: "🇫🇷", name: "Lafrans", offset: 1 },
  { flag: "🇺🇸", name: "Etazini (Lès)", offset: -5 },
  { flag: "🇺🇸", name: "Etazini (Lwès)", offset: -8 },
  { flag: "🇨🇦", name: "Kanada (Lès)", offset: -5 },
  { flag: "🇲🇽", name: "Meksik", offset: -6 },
  { flag: "🇧🇷", name: "Brezil", offset: -3 },
  { flag: "🇨🇱", name: "Chili", offset: -3 },
];

const COUNTRY_OFFSETS: Record<string, { offset: number; flag: string; code: string; placeholder: string; name: string }> = {
  haiti: { offset: -5, flag: "🇭🇹", code: "+509", placeholder: "+509 48 48 0229", name: "Ayiti" },
  rd: { offset: -4, flag: "🇩🇴", code: "+1", placeholder: "+1 849 123 4567", name: "Repiblik Dominikèn" },
  france: { offset: 1, flag: "🇫🇷", code: "+33", placeholder: "+33 6 12 34 56 78", name: "Lafrans" },
  usa: { offset: -5, flag: "🇺🇸", code: "+1", placeholder: "+1 555 123 4567", name: "Etazini" },
  usa_east: { offset: -5, flag: "🇺🇸", code: "+1", placeholder: "+1 212 123 4567", name: "Etazini (Lès)" },
  usa_central: { offset: -6, flag: "🇺🇸", code: "+1", placeholder: "+1 312 123 4567", name: "Etazini (Sant)" },
  usa_mountain: { offset: -7, flag: "🇺🇸", code: "+1", placeholder: "+1 303 123 4567", name: "Etazini (Mòn)" },
  usa_pacific: { offset: -8, flag: "🇺🇸", code: "+1", placeholder: "+1 213 123 4567", name: "Etazini (Pasifik)" },
  canada: { offset: -5, flag: "🇨🇦", code: "+1", placeholder: "+1 514 123 4567", name: "Kanada" },
  mexique: { offset: -6, flag: "🇲🇽", code: "+52", placeholder: "+52 55 1234 5678", name: "Meksik" },
  bresil: { offset: -3, flag: "🇧🇷", code: "+55", placeholder: "+55 11 91234 5678", name: "Brezil" },
  chili: { offset: -3, flag: "🇨🇱", code: "+56", placeholder: "+56 9 1234 5678", name: "Chili" },
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
  const match = raw.match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/);
  if (!match) return raw;
  const h = match[1];
  const m = match[2] ? match[2] : null;
  const period = match[3];
  const timePart = m ? `${h}h${m}` : `${h}h`;
  const label = period === "AM" ? (h === "12" ? "nan minwi" : "nan maten") : "nan aswè";
  return `${timePart} ${label} (${period})`;
}

function baseToLocal(baseH: number, baseM: number, baseOffset: number) {
  const d = new Date();
  d.setUTCHours(baseH - baseOffset, baseM, 0, 0);
  return { h: d.getHours(), m: d.getMinutes() };
}

const DAYS_FR = ["Len", "Mad", "Mèk", "Jèd", "Van", "Sam", "Dim"];
const MONTHS_FR = ["Janye", "Fevriye", "Mas", "Avril", "Me", "Jen", "Jiyè", "Out", "Septanm", "Oktòb", "Novanm", "Desanm"];
const DAYS_MAP = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function CalendarPicker({ value, onChange, isDateAvailable }: { value: string; onChange: (v: string) => void; isDateAvailable?: (y: number, m: number, d: number) => boolean }) {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  maxDate.setHours(23, 59, 59, 999);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(minDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(minDate.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

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

  const isPrevDisabled = new Date(viewYear, viewMonth, 1) <= new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  function next() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  }

  const isNextDisabled = new Date(viewYear, viewMonth, 1) >= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  const displayValue = value
    ? (() => { const [y, m, d] = value.split("-").map(Number); return `${d} ${MONTHS_FR[m - 1]} ${y}`; })()
    : "";

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between text-sm rounded-xl px-4 py-3 outline-none transition-colors border text-left ${open ? 'bg-white/10 border-primary text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
        <span>{displayValue || "Chwazi yon dat"}</span>
        <span className="material-symbols-outlined text-lg opacity-50">calendar_month</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 right-0 rounded-2xl shadow-xl border border-white/10 bg-[#141414] p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prev} disabled={isPrevDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-white">{MONTHS_FR[viewMonth]} {viewYear}</span>
            <button type="button" onClick={next} disabled={isNextDisabled} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_FR.map((d) => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-white/30 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button type="button" disabled={isDisabledDay(day)}
                    onClick={() => { onChange(toStr(viewYear, viewMonth, day)); setOpen(false); }}
                    className={`w-9 h-9 rounded-full text-sm font-bold flex items-center justify-center transition-all ${
                        isSelected(day) ? "bg-primary text-white shadow-lg shadow-primary/30" : 
                        isDisabledDay(day) ? "text-white/10 cursor-not-allowed" : 
                        "text-white hover:bg-white/10"
                    } ${isTomorrow(day) && !isSelected(day) ? "border border-primary/50 text-primary" : ""}`}>
                    {day}
                  </button>
                ) : <div className="w-9 h-9" />}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 flex justify-between items-center border-t border-white/10">
            <button type="button"
              onClick={() => { setViewYear(minDate.getFullYear()); setViewMonth(minDate.getMonth()); onChange(toStr(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())); setOpen(false); }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors hover:bg-primary/10 text-primary">
              Demen
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10 text-white/50">
              Fèmen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const { user, userData } = useAuth();
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServices().then(services => {
      const published = services.find(s => s.status === 'published' || s.active);
      if (published) {
        published.availability = normalizeAvailability(published.availability);
        setService(published);
      } else {
        setService(null);
      }
      setLoading(false);
    }).catch(console.error);
  }, []);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nomPrenom: "", pays: "", phone: "", date: "", sujet: "", kategori: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [usZone, setUsZone] = useState("");

  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);
  const [checkingReservations, setCheckingReservations] = useState(false);

  useEffect(() => {
    if (!formData.date || !service?.id) {
      setOccupiedSlots([]);
      return;
    }
    setCheckingReservations(true);

    fetch(`/api/consultation/check-availability?date=${formData.date}&serviceId=${service.id}`)
      .then(res => res.json())
      .then(data => {
        setOccupiedSlots(data.occupiedSlots || []);
        setCheckingReservations(false);
      })
      .catch((err) => {
        console.error("Error checking slot reservations:", err);
        setCheckingReservations(false);
      });
  }, [formData.date, service?.id]);

  const getSlotReservationStatus = useCallback((slotTime: string) => {
    const occ = occupiedSlots.find(o => o.time === slotTime);
    return occ ? occ.status : "available";
  }, [occupiedSlots]);

  // Prefill user data if logged in
  useEffect(() => {
    if (userData) {
      const rawPhone = userData.phone || userData.phoneNumber || "";
      const cleanPhone = rawPhone.replace("whatsapp:", "").replace(/"/g, "").replace(/'/g, "").trim();
      
      let detectedPays = "";
      if (cleanPhone) {
        const digitsOnly = cleanPhone.replace(/\D/g, "");
        if (digitsOnly.startsWith("509")) {
          detectedPays = "haiti";
        } else if (digitsOnly.startsWith("33")) {
          detectedPays = "france";
        } else if (digitsOnly.startsWith("52")) {
          detectedPays = "mexique";
        } else if (digitsOnly.startsWith("55")) {
          detectedPays = "bresil";
        } else if (digitsOnly.startsWith("56")) {
          detectedPays = "chili";
        } else if (digitsOnly.startsWith("1")) {
          if (digitsOnly.startsWith("1809") || digitsOnly.startsWith("1829") || digitsOnly.startsWith("1849")) {
            detectedPays = "rd";
          } else {
            detectedPays = "usa"; // default to USA for +1
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        nomPrenom: prev.nomPrenom || userData.fullName || userData.displayName || "",
        pays: prev.pays || detectedPays,
        phone: prev.phone || cleanPhone
      }));
      
      if (detectedPays === "usa") {
        setUsZone("usa_east");
      }
    }
  }, [userData]);

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
            local: fmt(localH, startM),
            baseStr: `${adminH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`
          });
        }
      }
    }
    return slots;
  }, [service, formData.date, selectedCountry]);

  // Auto-deselect slot if it is no longer available
  useEffect(() => {
    if (selectedSlot !== null && localSlots[selectedSlot]) {
      const slotTime = localSlots[selectedSlot].baseStr;
      const resStatus = getSlotReservationStatus(slotTime);
      if (resStatus === "booked" || resStatus === "pending_payment") {
        setSelectedSlot(null);
      }
    }
  }, [occupiedSlots, selectedSlot, localSlots, getSlotReservationStatus]);

  const countryTimes = useMemo(() =>
    COUNTRIES.map((c) => {
      const start = convertTime(10, 0, 9, c.offset);
      const end = convertTime(0, 30, 9, c.offset);
      const sFmt = fmt(start.h, start.m);
      const eFmt = fmt(end.h, end.m);

      const isStartPm = sFmt.includes("PM");
      const isEndAm = eFmt.includes("AM");

      const displayRange = (isStartPm && isEndAm)
        ? `${eFmt} → ${sFmt}`
        : `${sFmt} → ${eFmt}`;

      return { ...c, displayRange };
    }), []);

  const isFormValid =
    formData.nomPrenom && formData.pays &&
    formData.phone && formData.date && formData.sujet && formData.kategori &&
    selectedSlot !== null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const newData = { ...formData, [e.target.name]: e.target.value };
    if (e.target.name === "pays") {
      setSelectedSlot(null);
      setUsZone("");
      const c = COUNTRY_OFFSETS[e.target.value];
      if (c) newData.phone = c.code + " ";
    }
    setFormData(newData);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    // Double check availability to prevent race conditions
    const slot = localSlots[selectedSlot!];
    const resStatus = getSlotReservationStatus(slot.baseStr);
    if (resStatus === "booked") {
      alert("Lè sa a deja rezève pa yon lòt moun. Tanpri chwazi yon lòt lè.");
      setSelectedSlot(null);
      return;
    } else if (resStatus === "pending_payment") {
      alert("Lè sa a ap rezève pa yon lòt moun kounye a. Chwazi yon lòt lè oswa re-eseye nan 20 minit.");
      setSelectedSlot(null);
      return;
    }

    setReviewing(true);
  }

  async function submitBooking(userId: string) {
    if (!service || !service.id) return;
    try {
      const slot = localSlots[selectedSlot!];
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        alert("Koneksyon obligatwa pou w ka rezève.");
        return;
      }

      const res = await fetch("/api/consultation/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceId: service.id,
          serviceTitle: service.title,
          date: formData.date,
          slotTime: slot.baseStr,
          localTimeFmt: fmtUX(slot.local),
          formData
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gen yon erè ki fèt nan sistèm lan.");
      }

      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || "Echèk nan anrejistreman kreyòl la. Tanpri re-eseye.");
      setSelectedSlot(null);
      setReviewing(false);
      setIsCheckoutModalOpen(false);
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-5 bg-background-dark">
        <span className="material-symbols-outlined text-6xl text-white/20 mb-4 block">event_busy</span>
        <h1 className="text-white text-2xl font-bold mb-2">Pa gen konsiltasyon ki disponib</h1>
        <p className="text-white/50">Rezèvasyon yo fèmen pou kounye a. Tanpri tounen pita.</p>
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
          
          <a href="#reserver" className="relative z-10 inline-block px-8 py-4 bg-primary text-white rounded-full font-black uppercase tracking-wide text-sm hover:bg-primary/90 transition-all active:scale-95 shadow-xl shadow-primary/30">
            Rezève konsiltasyon mwen
          </a>
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

        {/* TIMEZONE GRID */}
        <section className="py-24 px-5 border-b border-white/5">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-16">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-4">Disponibilite</p>
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-white">Lè yo pa peyi</h2>
                <p className="text-sm leading-relaxed text-white/50 max-w-[600px] mx-auto">
                Lè ki anba yo tradui nan lè peyi w pou fè rezèvasyon an pi fasil :
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {countryTimes.map((c) => (
                <div key={c.name} className={`relative p-5 rounded-2xl transition-all ${c.ref ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/10'} border hover:bg-white/10`}>
                  {c.ref && <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase bg-primary text-white">Réf.</span>}
                  <span className="text-3xl block mb-3">{c.flag}</span>
                  <h3 className="text-[10px] font-bold tracking-wider uppercase mb-1 text-white/50">{c.name}</h3>
                  <div className="font-black text-xl text-white">
                    {c.displayRange}
                  </div>
                  <p className="text-[10px] mt-1 text-white/30">Disponibilite</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-center text-white/30 font-medium">* Lè yo ka chanje selon lè lès. Konfime pa WhatsApp.</p>
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
              
              <a href="#reserver" className="block w-full text-center font-black uppercase text-sm tracking-wide px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 bg-primary text-white shadow-xl shadow-primary/20 relative z-10">
                Rezève kounye a
              </a>
            </div>
          </div>
        </section>

        {/* BOOKING FORM */}
        <section id="reserver" className="py-24 px-5">
          <div className="max-w-[620px] mx-auto">
            <div className="text-center mb-12">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-4">Rezèvasyon</p>
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-white">Rezève lè pa w la</h2>
                <p className="text-sm leading-relaxed text-white/50">
                Ranpli fòmilè ki anba a, epi fè peman an sekirite pou konfime lè w la.
                </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

              {submitted ? (
                /* ── SUCCÈS ── */
                <div className="text-center py-10">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-500/10 border border-green-500/20">
                    <span className="material-symbols-outlined text-4xl text-green-500">check_circle</span>
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tight mb-3 text-white">Demann lan voye!</h3>
                  <p className="text-base text-white/60 leading-relaxed max-w-sm mx-auto">
                    Mèsi! W ap resevwa yon konfimasyon pa SMS talè konsa.<br /><strong className="text-white block mt-2">{service.price} USD · 1 èdtan</strong>
                  </p>
                </div>
              ) : reviewing ? (
                /* ── RÉVISION ── */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2 text-white">Verifye enfòmasyon w yo</h3>
                  <p className="text-sm mb-8 text-white/50">Konfime detay yo anba a anvan ou voye demann lan.</p>
                  
                  <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
                    <ul className="flex flex-col gap-6">
                        {[
                        { label: "Non ak siyati", value: formData.nomPrenom, icon: "person" },
                        { label: "Peyi", value: selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : formData.pays, icon: "public" },
                        { label: "Nimewo telefòn", value: formData.phone, icon: "call" },
                        { label: "Dat ou vle a", value: (() => { const [y, m, d] = formData.date.split("-").map(Number); const MONTHS = ["Janye", "Fevriye", "Mas", "Avril", "Me", "Jen", "Jiyè", "Out", "Septanm", "Oktòb", "Novanm", "Desanm"]; return `${d} ${MONTHS[m - 1]} ${y}`; })(), icon: "event" },
                        { label: "Lè konsiltasyon", value: selectedSlot !== null ? (<span className="flex items-center gap-2">{fmtUX(localSlots[selectedSlot].local)}<span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold">1 èdtan</span></span>) : "", icon: "schedule" },
                        { label: "Kategori", value: formData.kategori, icon: "category" },
                        { label: "Sijè an detay", value: formData.sujet, icon: "subject" },
                        ].map((row) => (
                        <li key={row.label} className="flex items-start gap-4">
                            <div className="mt-0.5 size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px] text-white/70">{row.icon}</span>
                            </div>
                            <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{row.label}</p>
                            <div className="text-sm font-bold text-white leading-snug">{row.value}</div>
                            </div>
                        </li>
                        ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl p-5 mb-8 bg-primary/10 border border-primary/20 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Kantite kòb pou w peye</p>
                        <p className="text-xs text-white/60">Konfime epi peye</p>
                    </div>
                    <div className="text-2xl font-black text-white">${service.price}</div>
                  </div>

                  <button onClick={() => setIsCheckoutModalOpen(true)}
                    className="w-full py-4 rounded-xl font-black uppercase text-sm tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] mb-4 bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                    <span>Konfime epi peye</span>
                  </button>
                  <button onClick={() => setReviewing(false)}
                    className="w-full py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors text-white/50 hover:text-white hover:bg-white/5">
                    ← Chanje enfòmasyon m yo
                  </button>
                </div>
              ) : (
                /* ── FORMULAIRE ── */
                <form onSubmit={handleSubmit} className="animate-in fade-in duration-300">
                  <div className="flex flex-col gap-2 mb-5">
                    <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Non ak siyati *</label>
                    <input name="nomPrenom" value={formData.nomPrenom} onChange={handleChange} placeholder="Jean Ronald" required
                       className="text-sm rounded-xl px-4 py-3 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary placeholder:text-white/20" />
                  </div>

                  <div className="flex flex-col gap-2 mb-5">
                    <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Peyi / Zòn Lè *</label>
                    <select name="pays" value={formData.pays} onChange={handleChange} required
                      className="text-sm rounded-xl px-4 py-3 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary appearance-none">
                      <option value="" className="text-black">— Chwazi —</option>
                      <option value="haiti" className="text-black">🇭🇹 Ayiti</option>
                      <option value="rd" className="text-black">🇩🇴 Repiblik Dominikèn</option>
                      <option value="france" className="text-black">🇫🇷 Lafrans</option>
                      <option value="usa" className="text-black">🇺🇸 Etazini</option>
                      <option value="canada" className="text-black">🇨🇦 Kanada</option>
                      <option value="mexique" className="text-black">🇲🇽 Meksik</option>
                      <option value="bresil" className="text-black">🇧🇷 Brezil</option>
                      <option value="chili" className="text-black">🇨🇱 Chili</option>
                    </select>
                  </div>

                  {formData.pays === "usa" && (
                    <div className="flex flex-col gap-2 mb-5 animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Zòn Lè (Etazini) *</label>
                      <select value={usZone} onChange={(e) => { setUsZone(e.target.value); setSelectedSlot(null); }} required
                        className="text-sm rounded-xl px-4 py-3 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary appearance-none">
                        <option value="" className="text-black">— Chwazi zòn lè w la —</option>
                        <option value="usa_east" className="text-black">🕔 Eastern (New York, Miami, Atlanta)</option>
                        <option value="usa_central" className="text-black">🕔 Central (Chicago, Houston, Dallas)</option>
                        <option value="usa_mountain" className="text-black">🕔 Mountain (Denver, Phoenix)</option>
                        <option value="usa_pacific" className="text-black">🕔 Pacific (Los Angeles, San Francisco)</option>
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mb-5">
                    <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Nimewo telefòn *</label>
                    <div className="flex">
                      <div className="flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-l-xl border border-r-0 border-white/10 bg-white/10 text-white shrink-0">
                        {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.code}` : "📱"}
                      </div>
                      <input name="phone" value={formData.phone} onChange={handleChange}
                        placeholder={selectedCountry?.placeholder || "+XXX XXXX XXXX"} required type="tel"
                        className="w-full text-sm rounded-r-xl px-4 py-3 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary placeholder:text-white/20" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-5">
                    <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Dat ou vle a *</label>
                    <CalendarPicker value={formData.date} onChange={(d) => setFormData({ ...formData, date: d })} isDateAvailable={checkDateAvailability} />
                  </div>

                  <div className="flex flex-col gap-2 mb-6">
                    <label className="text-[10px] font-black tracking-widest uppercase text-white/50 flex items-center justify-between">
                        <span>Lè konsiltasyon *</span> 
                        {checkingReservations && (
                          <span className="text-[9px] font-semibold text-primary/80 lowercase flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 border border-primary border-t-transparent rounded-full animate-spin"></span>
                            n ap verifye disponiblite...
                          </span>
                        )}
                        {(!formData.pays || (formData.pays === "usa" && !usZone)) && 
                        <span className="normal-case tracking-normal font-medium text-primary ml-2 lowercase">
                            (chwazi peyi w anvan)
                        </span>}
                    </label>
                    {(formData.pays && (formData.pays !== "usa" || usZone)) ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {localSlots.map((s, i) => {
                          const resStatus = getSlotReservationStatus(s.baseStr);
                          const isBooked = resStatus === "booked";
                          const isPendingPayment = resStatus === "pending_payment";
                          const isDisabled = isBooked || isPendingPayment;

                          let btnClass = "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20";
                          let subText = "1 èdtan";

                          if (selectedSlot === i) {
                            btnClass = "bg-primary/20 border-primary text-white shadow-md shadow-primary/10";
                          } else if (isBooked) {
                            btnClass = "bg-red-500/5 border-red-500/20 text-red-400/50 cursor-not-allowed opacity-40";
                            subText = "Lè sa a deja rezève";
                          } else if (isPendingPayment) {
                            btnClass = "bg-yellow-500/5 border-yellow-500/20 text-yellow-400/50 cursor-not-allowed opacity-40";
                            subText = "Gen moun k ap peye";
                          }

                          return (
                            <button key={i} type="button" onClick={() => !isDisabled && setSelectedSlot(i)} disabled={isDisabled}
                              className={`p-3 rounded-xl text-center transition-all border ${btnClass}`}>
                              <div className="font-bold text-sm leading-tight">{fmtUX(s.local)}</div>
                              <div className="text-[10px] mt-1 uppercase tracking-widest font-semibold">{subText}</div>
                            </button>
                          );
                        })}
                      </div>
                    ) : !formData.date ? (
                      <div className="p-6 rounded-xl text-center text-xs font-medium border border-dashed border-white/20 bg-white/5 text-white/40">
                        Tanpri chwazi yon dat anlè a.
                      </div>
                    ) : !hasAnySlotsForThisDay ? (
                      <div className="p-6 rounded-xl text-center text-xs font-medium border border-dashed border-white/20 bg-white/5 text-white/40">
                        Pa gen plas ki disponib pou jou sa a. Tanpri chwazi yon lòt dat.
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl text-center text-xs font-medium border border-dashed border-white/20 bg-white/5 text-white/40">
                        Tanpri chwazi yon peyi anlè a pou w ka wè plas ki disponib nan zòn lè pa w la.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mb-5">
                    <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Kategori / Rezon *</label>
                    <div className="relative">
                        <select name="kategori" value={formData.kategori} onChange={handleChange} required
                            className="w-full text-sm rounded-xl px-4 py-3 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary appearance-none">
                            <option value="" className="text-black">— Chwazi —</option>
                            <option value="Coaching Privé (Kategori 5)" className="text-black">✔ Coaching Privé (Kategori 5)</option>
                            <option value="Brand Pèsonèl" className="text-black">✔ Brand Pèsonèl</option>
                            <option value="Kreyasyon Kontni" className="text-black">✔ Kreyasyon Kontni</option>
                            <option value="Biznis Dijital" className="text-black">✔ Biznis Dijital</option>
                            <option value="Ekriti Liv/Ebook" className="text-black">✔ Ekriti Liv/Ebook</option>
                            <option value="Storytelling ak Kominikasyon" className="text-black">✔ Storytelling ak Kominikasyon</option>
                            <option value="Estrateji AI pou travay oswa biznis" className="text-black">✔ Estrateji AI pou travay oswa biznis</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-8">
                    <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Sijè an detay *</label>
                    <textarea name="sujet" value={formData.sujet} onChange={handleChange} rows={3}
                      placeholder="Ekri yon ti esplikasyon sou sa w vle pale oswa pwoblèm ou genyen..." required
                      className="text-sm rounded-xl px-4 py-3 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary placeholder:text-white/20 resize-y min-h-[100px]" />
                  </div>

                  <button type="submit" disabled={!isFormValid}
                    className="w-full py-4 rounded-xl font-black uppercase text-sm tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-primary text-white shadow-xl shadow-primary/20">
                    Verifye demann mwen
                  </button>
                  <p className="text-[10px] text-center mt-4 text-white/30 uppercase tracking-widest font-bold">
                    N ap voye konfimasyon an pa SMS / Telefòn.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>

      </main>

      <DashboardFooter />

      {service && isCheckoutModalOpen && (
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          onBeforePaymentRedirect={submitBooking}
          product={{
            id: service.id!,
            title: service.title,
            priceHTG: service.priceHTG || 0,
            price: parseFloat(service.price.replace(/[^0-9.]/g, '')) || 0,
            currency: "$",
            type: "service",
            image: service.imageUrl || "",
            headline: "Rezèvasyon lè konsiltasyon w la",
          }}
        />
      )}
    </div>
  );
}

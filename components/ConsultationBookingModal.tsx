"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ActionModal } from "@/components/ui/ActionModal";
import { useAuth } from "@/context/AuthContext";
import { Service } from "@/lib/types";
import CheckoutModal from "@/components/CheckoutModal";
import { auth } from "@/lib/firebase";

// --- Timezone and Calendar Logic (Copied from consultation/page.tsx) ---

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

  function isDisabledDay(day: number) {
    const dateObj = new Date(viewYear, viewMonth, day);
    if (dateObj < minDate || dateObj > maxDate) return true;
    if (isDateAvailable) return !isDateAvailable(viewYear, viewMonth, day);
    return false;
  }

  const isPrevDisabled = new Date(viewYear, viewMonth, 1) <= new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const isNextDisabled = new Date(viewYear, viewMonth, 1) >= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  const displayValue = value ? (() => { const [y, m, d] = value.split("-").map(Number); return `${d} ${MONTHS_FR[m - 1]} ${y}`; })() : "";

  return (
    <div className="relative z-[60]">
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between text-sm rounded-xl px-4 py-3 outline-none transition-colors border text-left ${open ? 'bg-white/10 border-primary text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
        <span>{displayValue || "Chwazi yon dat"}</span>
        <span className="material-symbols-outlined text-lg opacity-50">calendar_month</span>
      </button>

      {open && (
        <div className="absolute z-[100] mt-2 left-0 right-0 rounded-2xl shadow-2xl border border-white/10 bg-[#141414] p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => viewMonth === 0 ? (setViewYear(y => y - 1), setViewMonth(11)) : setViewMonth(m => m - 1)} disabled={isPrevDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-white">{MONTHS_FR[viewMonth]} {viewYear}</span>
            <button type="button" onClick={() => viewMonth === 11 ? (setViewYear(y => y + 1), setViewMonth(0)) : setViewMonth(m => m + 1)} disabled={isNextDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_FR.map((d) => <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-white/30 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button type="button" disabled={isDisabledDay(day)}
                    onClick={() => { onChange(toStr(viewYear, viewMonth, day)); setOpen(false); }}
                    className={`w-9 h-9 rounded-full text-sm font-bold flex items-center justify-center transition-all ${
                        value === toStr(viewYear, viewMonth, day) ? "bg-primary text-white shadow-lg shadow-primary/30" : 
                        isDisabledDay(day) ? "text-white/10 cursor-not-allowed" : 
                        "text-white hover:bg-white/10"
                    }`}>
                    {day}
                  </button>
                ) : <div className="w-9 h-9" />}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 flex justify-end items-center border-t border-white/10">
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

// --- Main Modal Component ---

export interface ConsultationBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    service: Service | null;
}

export default function ConsultationBookingModal({
    isOpen,
    onClose,
    service,
}: ConsultationBookingModalProps) {
    const { userData } = useAuth();
    
    const [step, setStep] = useState(0); // 0 to 4
    
    const [formData, setFormData] = useState({
        nomPrenom: "", pays: "", phone: "", date: "", sujet: "", kategori: ""
    });
    const [usZone, setUsZone] = useState("");
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    
    const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);
    const [checkingReservations, setCheckingReservations] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [submittingBooking, setSubmittingBooking] = useState(false);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setStep(0);
        }
    }, [isOpen]);

    // Prefill user data
    useEffect(() => {
        if (userData && isOpen && step === 0) {
            const rawPhone = userData.phone || userData.phoneNumber || "";
            const cleanPhone = rawPhone.replace("whatsapp:", "").replace(/"/g, "").replace(/'/g, "").trim();
            
            let detectedPays = "";
            if (cleanPhone) {
                const digitsOnly = cleanPhone.replace(/\D/g, "");
                if (digitsOnly.startsWith("509")) detectedPays = "haiti";
                else if (digitsOnly.startsWith("33")) detectedPays = "france";
                else if (digitsOnly.startsWith("52")) detectedPays = "mexique";
                else if (digitsOnly.startsWith("55")) detectedPays = "bresil";
                else if (digitsOnly.startsWith("56")) detectedPays = "chili";
                else if (digitsOnly.startsWith("1")) detectedPays = digitsOnly.startsWith("1809") || digitsOnly.startsWith("1829") || digitsOnly.startsWith("1849") ? "rd" : "usa";
            }

            setFormData(prev => ({
                ...prev,
                nomPrenom: prev.nomPrenom || userData.fullName || userData.displayName || "",
                pays: prev.pays || detectedPays,
                phone: prev.phone || cleanPhone
            }));
            if (detectedPays === "usa") setUsZone("usa_east");
        }
    }, [userData, isOpen, step]);

    // Fetch availability for selected date
    useEffect(() => {
        if (!formData.date || !service?.id || step !== 3) {
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
            .catch(() => setCheckingReservations(false));
    }, [formData.date, service?.id, step]);

    const getSlotReservationStatus = useCallback((slotTime: string) => {
        const occ = occupiedSlots.find(o => o.time === slotTime);
        return occ ? occ.status : "available";
    }, [occupiedSlots]);

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
            const dayAvail = service.availability[DAYS_MAP[dateObj.getDay()]];

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const newData = { ...formData, [e.target.name]: e.target.value };
        if (e.target.name === "pays") {
            setSelectedSlot(null);
            setUsZone("");
            const c = COUNTRY_OFFSETS[e.target.value];
            if (c) newData.phone = c.code + " ";
        }
        setFormData(newData);
    };

    const handleNext = () => setStep(s => Math.min(s + 1, 5));
    const handleBack = () => setStep(s => Math.max(s - 1, 0));

    // --- Steps UI ---

    const renderStep0 = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 pt-2">
            <h3 className="text-2xl font-black uppercase tracking-tight mb-2 text-white">{service?.title || "Konsiltasyon Prive"}</h3>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
                Ou vle pale avè m dirèkteman pou nou ranje biznis ou, kreye yon plan pou kontni w oswa ede w avanse ?
            </p>
            <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-emerald-400">timer</span>
                    <span className="text-sm font-bold text-white">1 Èdtan (60 minit)</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-emerald-400">video_camera_front</span>
                    <span className="text-sm font-bold text-white">Apèl / Videyo (Zoom, WhatsApp...)</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-emerald-400">monetization_on</span>
                    <span className="text-sm font-bold text-white">${service?.price || "..."} USD</span>
                </div>
            </div>
            <button onClick={handleNext} className="w-full h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Rezève kounya
            </button>
        </div>
    );

    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6 pt-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Enfòmasyon pèsonèl</h3>
            
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Non ak siyati *</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">person</span>
                    <input name="nomPrenom" value={formData.nomPrenom} onChange={handleChange} placeholder="Jean Ronald"
                        className="w-full text-sm rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary placeholder:text-white/20" />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Nimewo telefòn *</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">phone</span>
                    <input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 555 123 4567" type="tel"
                        className="w-full text-sm rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary placeholder:text-white/20" />
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button onClick={handleBack} className="w-14 h-14 shrink-0 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button onClick={handleNext} disabled={!formData.nomPrenom || !formData.phone} className="flex-1 h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    Kontinye
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6 pt-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Lokalizasyon & Bezwen</h3>
            
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Peyi w / Zòn lè w *</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">public</span>
                    <select name="pays" value={formData.pays} onChange={handleChange}
                        className="w-full text-sm rounded-xl pl-12 pr-10 py-3.5 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary appearance-none">
                        <option value="" className="text-black">— Chwazi Peyi a —</option>
                        <option value="haiti" className="text-black">🇭🇹 Ayiti</option>
                        <option value="rd" className="text-black">🇩🇴 Repiblik Dominikèn</option>
                        <option value="france" className="text-black">🇫🇷 Lafrans</option>
                        <option value="usa" className="text-black">🇺🇸 Etazini</option>
                        <option value="canada" className="text-black">🇨🇦 Kanada</option>
                        <option value="mexique" className="text-black">🇲🇽 Meksik</option>
                        <option value="bresil" className="text-black">🇧🇷 Brezil</option>
                        <option value="chili" className="text-black">🇨🇱 Chili</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">expand_more</span>
                </div>
            </div>

            {formData.pays === "usa" && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Zòn Lè (Etazini) *</label>
                    <div className="relative">
                        <select value={usZone} onChange={(e) => { setUsZone(e.target.value); setSelectedSlot(null); }}
                            className="w-full text-sm rounded-xl px-4 py-3.5 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary appearance-none">
                            <option value="" className="text-black">— Chwazi zòn lè w la —</option>
                            <option value="usa_east" className="text-black">🕔 Eastern (New York, Miami, Atlanta)</option>
                            <option value="usa_central" className="text-black">🕔 Central (Chicago, Houston, Dallas)</option>
                            <option value="usa_mountain" className="text-black">🕔 Mountain (Denver, Phoenix)</option>
                            <option value="usa_pacific" className="text-black">🕔 Pacific (Los Angeles, San Francisco)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">expand_more</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Kategori / Rezon *</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">category</span>
                    <select name="kategori" value={formData.kategori} onChange={handleChange}
                        className="w-full text-sm rounded-xl pl-12 pr-10 py-3.5 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary appearance-none">
                        <option value="" className="text-black">— Chwazi —</option>
                        <option value="Coaching Privé" className="text-black">✔ Coaching Privé</option>
                        <option value="Brand Pèsonèl" className="text-black">✔ Brand Pèsonèl</option>
                        <option value="Kreyasyon Kontni" className="text-black">✔ Kreyasyon Kontni</option>
                        <option value="Biznis Dijital" className="text-black">✔ Biznis Dijital</option>
                        <option value="Ekriti Liv/Ebook" className="text-black">✔ Ekriti Liv/Ebook</option>
                        <option value="Storytelling ak Kominikasyon" className="text-black">✔ Storytelling ak Kominikasyon</option>
                        <option value="Estrateji AI" className="text-black">✔ Estrateji AI pou travay / biznis</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">expand_more</span>
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button onClick={handleBack} className="w-14 h-14 shrink-0 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button onClick={handleNext} disabled={!formData.pays || (formData.pays === 'usa' && !usZone) || !formData.kategori} className="flex-1 h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    Kontinye
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6 pt-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Planifikasyon</h3>
            
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Dat ou vle a *</label>
                <CalendarPicker value={formData.date} onChange={(d) => { setFormData({ ...formData, date: d }); setSelectedSlot(null); }} isDateAvailable={checkDateAvailability} />
            </div>

            <div className="flex flex-col gap-2 relative z-50">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/50 flex items-center justify-between">
                    <span>Lè konsiltasyon *</span>
                    {checkingReservations && (
                        <span className="text-[9px] font-semibold text-primary/80 lowercase flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 border border-primary border-t-transparent rounded-full animate-spin"></span>
                            n ap verifye...
                        </span>
                    )}
                </label>
                {formData.date ? (
                    localSlots.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {localSlots.map((s, i) => {
                                const status = getSlotReservationStatus(s.baseStr);
                                const isBooked = status === "booked" || status === "pending_payment";
                                return (
                                    <button key={i} type="button" disabled={isBooked} onClick={() => setSelectedSlot(i)}
                                        className={`py-3 px-2 text-xs font-bold rounded-xl transition-all border ${
                                            isBooked ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed opacity-50 relative overflow-hidden line-through" :
                                            selectedSlot === i ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" :
                                            "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20"
                                        }`}>
                                        {fmtUX(s.local).split(" (")[0]}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl text-center text-xs font-medium border border-dashed border-white/20 bg-white/5 text-white/40">
                            Pa gen plas disponib pou dat sa a.
                        </div>
                    )
                ) : (
                    <div className="p-4 rounded-xl text-center text-xs font-medium border border-dashed border-white/20 bg-white/5 text-white/40">
                        Tanpri chwazi yon dat anlè a.
                    </div>
                )}
            </div>

            <div className="pt-4 flex gap-3">
                <button onClick={handleBack} className="w-14 h-14 shrink-0 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button onClick={handleNext} disabled={!formData.date || selectedSlot === null} className="flex-1 h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    Kontinye
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6 pt-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Sijè konsiltasyon an</h3>
            
            <div className="flex flex-col gap-2 relative z-40">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/50">Sijè an detay *</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-3 text-white/40">edit_note</span>
                    <textarea name="sujet" value={formData.sujet} onChange={handleChange} rows={5} placeholder="Ekri yon ti esplikasyon sou pwoblèm ou vle ranje a..."
                        className="w-full text-sm rounded-xl pl-12 pr-4 py-3 outline-none transition-all border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary placeholder:text-white/20 resize-none"></textarea>
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button onClick={handleBack} className="w-14 h-14 shrink-0 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button onClick={handleNext} disabled={!formData.sujet.trim()} className="flex-1 h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    Kontinye
                </button>
            </div>
        </div>
    );

    const submitBooking = async () => {
        if (!service || !service.id || selectedSlot === null) return;
        try {
            setSubmittingBooking(true);
            const slot = localSlots[selectedSlot];
            const token = await auth.currentUser?.getIdToken();

            if (!token) {
                alert("Koneksyon obligatwa pou w ka rezève.");
                setSubmittingBooking(false);
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
        } catch (err: any) {
            console.error("Booking error:", err);
            alert(err.message || "Echèk nan anrejistreman kreyòl la. Tanpri re-eseye.");
            throw err; // Stop CheckoutModal redirect
        } finally {
            setSubmittingBooking(false);
        }
    };

    const renderStep5 = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6 pt-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Verifye enfòmasyon w yo</h3>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <ul className="flex flex-col gap-5">
                    {[
                        { label: "Non ak siyati", value: formData.nomPrenom, icon: "person" },
                        { label: "Numéro", value: formData.phone, icon: "call" },
                        { label: "Peyi", value: selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : formData.pays, icon: "public" },
                        { label: "Dat", value: formData.date ? (() => { const [y, m, d] = formData.date.split("-").map(Number); return `${d} ${MONTHS_FR[m - 1]} ${y}`; })() : "", icon: "event" },
                        { label: "Lè", value: selectedSlot !== null ? (<>{fmtUX(localSlots[selectedSlot].local)} <span className="opacity-50 font-normal ml-1">- Lè peyi {selectedCountry?.name || ""}</span></>) : "", icon: "schedule" },
                        { label: "Sijè", value: formData.sujet, icon: "subject" },
                    ].map((row) => (
                        <li key={row.label} className="flex items-start gap-4">
                            <div className="mt-0.5 size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[16px] text-white/70">{row.icon}</span>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{row.label}</p>
                                <div className="text-xs font-bold text-white leading-snug">{row.value}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="rounded-2xl p-5 bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Total</p>
                    <p className="text-xs text-white/60">Peman sekirize</p>
                </div>
                <div className="text-2xl font-black text-white">${service?.price}</div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
                <button 
                    onClick={() => {
                        const slot = localSlots[selectedSlot!];
                        const resStatus = getSlotReservationStatus(slot.baseStr);
                        if (resStatus === "booked") {
                            alert("Lè sa a deja rezève pa yon lòt moun. Tanpri chwazi yon lòt lè.");
                            return;
                        } else if (resStatus === "pending_payment") {
                            alert("Lè sa a ap rezève pa yon lòt moun kounye a. Chwazi yon lòt lè oswa re-eseye nan 30 minit.");
                            return;
                        }
                        setIsCheckoutModalOpen(true);
                    }} 
                    className="w-full h-14 rounded-xl bg-primary text-white font-black uppercase text-sm tracking-widest hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all">
                    Konfime epi Peye
                </button>
                <button onClick={handleBack} className="w-full py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors text-white/50 hover:text-white hover:bg-white/5">
                    Anile (Tounen)
                </button>
            </div>
        </div>
    );

    return (
        <>
            <ActionModal
                isOpen={isOpen}
                onClose={onClose}
                title="Rezèvasyon"
                subtitle="Konsiltasyon ak Jean Ronald"
                iconEmoji="📅"
            >
                {/* Stepper Indicators */}
                <div className="flex gap-2 mb-8">
                    {[0, 1, 2, 3, 4, 5].map(idx => (
                        <div key={idx} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            idx <= step ? "bg-primary" : "bg-white/10"
                        }`} />
                    ))}
                </div>

                {step === 0 && renderStep0()}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}
            </ActionModal>

            {isCheckoutModalOpen && (
                <CheckoutModal
                    isOpen={isCheckoutModalOpen}
                    onClose={() => setIsCheckoutModalOpen(false)}
                    onBeforePaymentRedirect={submitBooking}
                    product={{
                        id: service?.id || "",
                        title: service?.title || "Konsiltasyon",
                        priceHTG: typeof service?.priceHTG === 'number' ? service?.priceHTG : parseFloat(String(service?.priceHTG || '0')) || 0,
                        price: typeof service?.price === 'number' ? service?.price : parseFloat(String(service?.price || '0').replace(/[^0-9.]/g, '')) || 0,
                        currency: "$",
                        type: "service",
                        image: service?.imageUrl || "",
                        headline: "Rezèvasyon lè konsiltasyon w la",
                    }}
                />
            )}
        </>
    );
}

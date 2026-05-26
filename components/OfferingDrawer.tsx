"use client";

import { useState, useEffect } from "react";
import { Service } from "@/lib/types";
import ConfirmModal from "./ui/ConfirmModal";

// Re-using Service type structure for Availability
type Availability = Service['availability'];

const initialAvailability: Availability = {
    "Monday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Tuesday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Wednesday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Thursday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Friday": { enabled: true, startTime: "09:00", endTime: "17:00" },
    "Saturday": { enabled: false, startTime: "09:00", endTime: "17:00" },
    "Sunday": { enabled: false, startTime: "09:00", endTime: "17:00" },
};

const DAY_TRANSLATIONS: Record<string, string> = {
    "Monday": "Lundi",
    "Tuesday": "Mardi",
    "Wednesday": "Mercredi",
    "Thursday": "Jeudi",
    "Friday": "Vendredi",
    "Saturday": "Samedi",
    "Sunday": "Dimanche"
};

export function normalizeAvailability(avail: any): Availability {
    if (!avail) return initialAvailability;
    const normalized: Availability = { ...initialAvailability };
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

interface OfferingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Service | null;
    onSave: (data: Omit<Service, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}

export default function OfferingDrawer({ isOpen, onClose, initialData, onSave }: OfferingDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [price, setPrice] = useState("");
    const [priceHTG, setPriceHTG] = useState("");
    const [lemonSqueezyProductId, setLemonSqueezyProductId] = useState("");
    const [phone, setPhone] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [description, setDescription] = useState("");
    const [includedItems, setIncludedItems] = useState<string[]>([]);
    const [availability, setAvailability] = useState<Availability>(initialAvailability);
    const [availabilityTimezoneOffset, setAvailabilityTimezoneOffset] = useState<number>(9); // 9 for KST
    const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('published');

    const [loading, setLoading] = useState(false);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type: 'alert' | 'confirm' }>({
        isOpen: false,
        title: "",
        message: "",
        type: 'alert'
    });

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';

            // Populate form if editing
            if (initialData) {
                setTitle(initialData.title);
                setPrice(initialData.price.replace('$', ''));
                setPriceHTG(initialData.priceHTG?.toString() || "");
                setLemonSqueezyProductId(initialData.lemonSqueezyProductId || "");
                setPhone(initialData.phone || "");
                setImageUrl(initialData.imageUrl || "");
                setDescription(initialData.description);
                setIncludedItems(initialData.includedItems || []);
                setAvailability(normalizeAvailability(initialData.availability));
                setAvailabilityTimezoneOffset(initialData.availabilityTimezoneOffset ?? 9);
                setStatus((initialData.status as 'published' | 'draft' | 'archived') || (initialData.active ? 'published' : 'draft'));
            } else {
                // Reset form if creating
                setTitle("");
                setPrice("");
                setPriceHTG("");
                setLemonSqueezyProductId("");
                setPhone("");
                setImageUrl("");
                setDescription("");
                setIncludedItems([
                    "60-minute video call",
                    "Custom strategy PDF report",
                    "Follow-up email support"
                ]);
                setAvailability(initialAvailability);
                setAvailabilityTimezoneOffset(9);
            }

        } else {
            const timer = setTimeout(() => setIsVisible(false), 700);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialData]);

    if (!isVisible && !isOpen) return null;

    const handleSubmit = async () => {
        if (!title || !price) {
            setAlertConfig({
                isOpen: true,
                title: "Champs manquants",
                message: "Veuillez remplir au moins le titre et le prix pour créer une offre.",
                type: 'alert'
            });
            return;
        }

        setLoading(true);
        try {
            await onSave({
                title,
                price: `${price}`, // Ensure format if needed
                priceHTG: parseFloat(priceHTG) || 0,
                lemonSqueezyProductId,
                phone,
                imageUrl,
                description,
                includedItems: includedItems.filter(item => item.trim() !== ""),
                availability,
                availabilityTimezoneOffset,
                active: status === 'published',
                status,
            });
            onClose();
        } catch (error) {
            console.error("Failed to save service", error);
            setAlertConfig({
                isOpen: true,
                title: "Erreur",
                message: "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.",
                type: 'alert'
            });
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setIncludedItems([...includedItems, ""]);
    };

    const removeItem = (index: number) => {
        setIncludedItems(includedItems.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, value: string) => {
        const newItems = [...includedItems];
        newItems[index] = value;
        setIncludedItems(newItems);
    };

    const toggleDay = (day: string) => {
        setAvailability(prev => ({
            ...prev,
            [day]: { ...prev[day], enabled: !prev[day].enabled }
        }));
    };

    const updateTime = (day: string, field: 'startTime' | 'endTime', value: string) => {
        setAvailability(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    return (
        <div className={`fixed inset-0 z-[100] transition-all duration-700 overflow-hidden ${isOpen ? 'visible' : 'invisible delay-700'}`}>
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[2px] transition-opacity duration-700 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`absolute top-0 right-0 h-full w-full max-w-[540px] bg-white dark:bg-background-dark shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-none flex flex-col transform transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
            >
                {/* Header */}
                <header className={`flex items-center justify-between px-8 py-8 border-b border-black/5 dark:border-white/5 transition-all duration-700 delay-100 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight uppercase">{initialData ? 'Modifier l\'offre' : 'Créer une nouvelle offre'}</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mt-1">Configurez les détails et le calendrier de votre consultation</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all active:scale-90"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto px-8 py-8 space-y-12 custom-scrollbar">
                    {/* General Information */}
                    <section className={`space-y-6 transition-all duration-700 delay-200 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Informations générales</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">Titre de la consultation</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                    placeholder="ex: Consultation Stratégique 1-à-1"
                                    type="text"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">Statut</label>
                                <div className="flex bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-1 h-14">
                                     <button
                                         onClick={() => {
                                             if (status !== 'published') {
                                                 setShowPublishConfirm(true);
                                             }
                                         }}
                                         className={`flex-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${status === 'published' ? 'bg-primary text-white shadow-md' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                     >
                                         Publié
                                     </button>
                                    <button
                                        onClick={() => setStatus('draft')}
                                        className={`flex-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${status === 'draft' ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        Brouillon
                                    </button>
                                    <button
                                        onClick={() => setStatus('archived')}
                                        className={`flex-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${status === 'archived' ? 'bg-red-500/10 text-red-500' : 'text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        Archivé
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">Prix ($)</label>
                                    <input
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                        placeholder="0.00"
                                        type="number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">Prix (HTG)</label>
                                    <div className="relative">
                                        <input
                                            value={priceHTG}
                                            onChange={(e) => setPriceHTG(e.target.value)}
                                            className="w-full h-14 px-6 pr-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                            placeholder="0"
                                            type="number"
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-black/20 dark:text-white/20">HTG</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">ID Lemon Squeezy</label>
                                <input
                                    value={lemonSqueezyProductId}
                                    onChange={(e) => setLemonSqueezyProductId(e.target.value)}
                                    className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                    placeholder="Variant ID..."
                                    type="text"
                                />
                                <p className="text-[10px] text-black/30 dark:text-white/30 mt-1 ml-1">ID de la variante (Lemon Squeezy)</p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">Téléphone de destination</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg">📱</span>
                                    <input
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        className="w-full h-14 pl-12 pr-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                        placeholder="ex: 821012345678"
                                        type="text"
                                    />
                                </div>
                                <p className="text-[10px] text-black/30 dark:text-white/30 mt-1 ml-1">Numéro de téléphone de destination pour les réservations (ex: 821012345678)</p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">Image URL</label>
                                <input
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                                    placeholder="https://..."
                                    type="url"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium resize-none shadow-inner"
                                    placeholder="Décrivez la valeur de cette consultation..."
                                    rows={4}
                                ></textarea>
                            </div>


                        </div>
                    </section>

                    {/* What's Included */}
                    <section className={`space-y-6 transition-all duration-700 delay-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Ce qui est inclus</h3>
                            <button
                                onClick={addItem}
                                className="text-[10px] font-black uppercase text-primary dark:text-white flex items-center gap-1 hover:opacity-70 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Ajouter un élément
                            </button>
                        </div>
                        <div className="space-y-3">
                            {includedItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-3 p-4 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl group transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border border-transparent hover:border-black/5 dark:hover:border-white/5 shadow-inner">
                                    <span className="material-symbols-outlined text-green-500 font-bold">check_circle</span>
                                    <input
                                        className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm font-medium"
                                        type="text"
                                        value={item}
                                        onChange={(e) => updateItem(index, e.target.value)}
                                        placeholder="Ajouter un élément descriptif..."
                                    />
                                    <button
                                        onClick={() => removeItem(index)}
                                        className="opacity-0 group-hover:opacity-100 text-black/30 hover:text-red-500 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Availability System */}
                    <section className={`space-y-6 pb-12 transition-all duration-700 delay-[400ms] ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Disponibilité hebdomadaire</h3>
                        </div>

                        <div className="space-y-2 mb-6">
                            <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">Mon fuseau horaire de base</label>
                            <select
                                value={availabilityTimezoneOffset}
                                onChange={(e) => setAvailabilityTimezoneOffset(Number(e.target.value))}
                                className="w-full h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all outline-none text-sm font-medium"
                            >
                                <option value={9}>🇰🇷 Heure de Corée (KST / UTC+9)</option>
                                <option value={1}>🇫🇷 Heure d'Europe Centrale (CET / UTC+1)</option>
                                <option value={0}>🇬🇧 Temps Universel Coordonné (UTC / GMT)</option>
                                <option value={-4}>🇩🇴 Heure de l'Atlantique (AST / UTC-4)</option>
                                <option value={-5}>🇺🇸 Heure de l'Est / Haïti (EST / UTC-5)</option>
                                <option value={-6}>🇺🇸 Heure du Centre (CST / UTC-6)</option>
                                <option value={-8}>🇺🇸 Heure du Pacifique (PST / UTC-8)</option>
                            </select>
                            <p className="text-[10px] text-black/30 dark:text-white/30 mt-1 ml-1">Les heures ci-dessous seront interprétées dans ce fuseau horaire.</p>
                        </div>

                        <div className="space-y-3">
                            {Object.entries(availability).map(([day, data]) => (
                                <div
                                    key={day}
                                    className={`flex flex-wrap items-center gap-4 p-5 rounded-2xl border transition-all duration-500 ${data.enabled
                                        ? 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5'
                                        : 'border-transparent opacity-40 grayscale'
                                        }`}
                                >
                                    <div className="flex items-center gap-4 min-w-[140px]">
                                        <div
                                            onClick={() => toggleDay(day)}
                                            className={`size-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${data.enabled
                                                ? 'bg-primary border-primary dark:bg-white dark:border-white'
                                                : 'bg-transparent border-black/10 dark:border-white/10'
                                                }`}
                                        >
                                            {data.enabled && <span className="material-symbols-outlined text-white dark:text-primary text-[16px] font-black">check</span>}
                                        </div>
                                        <span className="text-sm font-black uppercase tracking-tight">{DAY_TRANSLATIONS[day] || day}</span>
                                    </div>

                                    {data.enabled ? (
                                        <div className="flex items-center gap-3 flex-1 min-w-[240px] animate-in slide-in-from-left-2 duration-500">
                                            <input
                                                className="flex-1 h-11 rounded-full border-none bg-black/[0.03] dark:bg-white/[0.03] text-xs font-black px-4 focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 outline-none transition-all"
                                                type="time"
                                                value={data.startTime}
                                                onChange={(e) => updateTime(day, 'startTime', e.target.value)}
                                            />
                                            <span className="text-[10px] font-black uppercase text-black/30 dark:text-white/30 px-1">à</span>
                                            <input
                                                className="flex-1 h-11 rounded-full border-none bg-black/[0.03] dark:bg-white/[0.03] text-xs font-black px-4 focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 outline-none transition-all"
                                                type="time"
                                                value={data.endTime}
                                                onChange={(e) => updateTime(day, 'endTime', e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <span className="text-xs font-bold italic tracking-tight text-black/20 dark:text-white/20">Indisponible</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className={`p-8 border-t border-black/5 dark:border-white/5 bg-white dark:bg-background-dark flex gap-4 transition-all duration-700 delay-500 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <button
                        onClick={onClose}
                        className="flex-1 h-14 bg-transparent border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 rounded-full font-black text-xs uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 h-14 bg-primary dark:bg-white text-white dark:text-primary rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-primary/10 dark:shadow-white/5 disabled:opacity-50"
                    >
                        {loading ? 'Enregistrement...' : (initialData ? 'Mettre à jour' : 'Enregistrer l\'offre')}
                    </button>
                </footer>
            </div>

            <ConfirmModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />

            <ConfirmModal
                isOpen={showPublishConfirm}
                onClose={() => setShowPublishConfirm(false)}
                onConfirm={() => {
                    setStatus('published');
                    setShowPublishConfirm(false);
                }}
                title="Confirmer la publication"
                message="Êtes-vous sûr de vouloir publier cette offre ? Elle sera active pour les réservations."
                confirmText="Publier"
                cancelText="Annuler"
            />
        </div>
    );
}

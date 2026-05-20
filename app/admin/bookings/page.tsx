"use client";

import { useState, useEffect } from "react";
import { getServices, addService, updateService, deleteService } from "@/lib/services";
import { Service } from "@/lib/types";
import OfferingDrawer from "@/components/OfferingDrawer";
import ConfirmModal from "@/components/ui/ConfirmModal";

const AVAILABLE_ZONES = [
    { name: "🇸🇳 Sénégal", offset: 0 },
    { name: "🇬🇧 Royaume-Uni", offset: 0 },
    { name: "🇫🇷 France", offset: 1 },
    { name: "🇨🇭 Suisse", offset: 1 },
    { name: "🇿🇦 Afrique du Sud", offset: 2 },
    { name: "🇦🇪 Dubaï", offset: 4 },
    { name: "🇰🇷 Corée du Sud", offset: 9 },
    { name: "🇯🇵 Japon", offset: 9 },
    { name: "🇦🇺 Sydney", offset: 10 },
    { name: "🇧🇷 Brésil", offset: -3 },
    { name: "🇨🇱 Chili", offset: -3 },
    { name: "🇩🇴 Rép. Dominicaine", offset: -4 },
    { name: "🇭🇹 Haïti", offset: -5 },
    { name: "🇺🇸 Est (NY)", offset: -5 },
    { name: "🇨🇦 Canada (Est)", offset: -5 },
    { name: "🇺🇸 Centre", offset: -6 },
    { name: "🇲🇽 Mexique", offset: -6 },
    { name: "🇺🇸 Pacifique (LA)", offset: -8 },
];

export default function BookingsPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [activeZones, setActiveZones] = useState([
        { name: "🇭🇹 Haïti", offset: -5 },
        { name: "🇫🇷 France", offset: 1 },
        { name: "🇨🇦 Canada (Est)", offset: -5 },
        { name: "🇺🇸 Pacifique (LA)", offset: -8 }
    ]);
    const [searchZone, setSearchZone] = useState("");
    const [showZoneDropdown, setShowZoneDropdown] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const loadServices = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getServices();
            setServices(data);
        } catch (error: any) {
            console.error("Failed to load services", error);
            setError(error.message || "Failed to load services.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadServices();
    }, []);

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteService(deleteId);
            setServices(prev => prev.filter(s => s.id !== deleteId));
            setDeleteId(null);
        } catch (error) {
            console.error("Failed to delete service", error);
            // setAlertInfo({ title: "Error", message: "Failed to delete service" }) - To be implemented if we add alert state
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async (data: Omit<Service, "id" | "createdAt" | "updatedAt">) => {
        try {
            if (editingService && editingService.id) {
                await updateService(editingService.id, data);
            } else {
                await addService(data);
            }
            await loadServices(); // Reload list
        } catch (error) {
            console.error("Error saving service", error);
            throw error;
        }
    };

    const openCreateDrawer = () => {
        setEditingService(null);
        setIsDrawerOpen(true);
    };

    const openEditDrawer = (service: Service) => {
        setEditingService(service);
        setIsDrawerOpen(true);
    };

    const service = services[0]; // On prend la première consultation

    return (
        <div className="animate-in fade-in duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
                <div>
                    <h1 className="text-primary dark:text-white text-4xl font-black leading-tight tracking-tighter mb-2">Consultation</h1>
                    <p className="text-black/50 dark:text-white/50 text-sm font-medium">Gérez votre offre unique de consultation privée.</p>
                </div>
                {!service && !loading && (
                    <div className="flex gap-4">
                        <button
                            onClick={openCreateDrawer}
                            className="bg-primary hover:opacity-90 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            Créer la consultation
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="text-center py-20 opacity-50 font-medium">Chargement des données...</div>
            ) : error ? (
                <div className="text-center py-20 text-red-500 font-bold">{error}</div>
            ) : service ? (
                <>
                    <div className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-black/5 relative overflow-hidden mb-8">
                        <div className="absolute top-0 right-0 p-8 flex gap-3">
                            <button
                                onClick={() => openEditDrawer(service)}
                                className="h-12 px-6 rounded-full bg-black/5 dark:bg-white/10 hover:bg-primary hover:text-white flex items-center justify-center transition-all font-black text-xs uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-sm mr-2">edit</span> Modifier
                            </button>
                            <button
                                onClick={() => service.id && setDeleteId(service.id)}
                                className="size-12 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                title="Supprimer la consultation"
                            >
                                <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                        </div>

                        <div className="max-w-2xl">
                            <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                {service.status === 'published' ? '🟢 Publié' : service.status === 'draft' ? '🟠 Brouillon' : '⚫ Archivé'}
                            </div>
                            <h2 className="text-3xl font-black mb-2">{service.title}</h2>
                            <p className="text-black/60 dark:text-white/60 mb-8 leading-relaxed">{service.description}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                <div>
                                    <p className="text-[10px] text-black/40 font-black uppercase tracking-widest mb-1">Prix (USD)</p>
                                    <p className="text-xl font-black">${service.price}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-black/40 font-black uppercase tracking-widest mb-1">Prix (HTG)</p>
                                    <p className="text-xl font-black">{service.priceHTG || 0} HTG</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-black/40 font-black uppercase tracking-widest mb-1">WhatsApp</p>
                                    <p className="text-sm font-bold mt-1">{service.whatsappNumber || "Non défini"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-black/40 font-black uppercase tracking-widest mb-1">Lemon Squeezy</p>
                                    <p className="text-sm font-bold mt-1">{service.lemonSqueezyProductId || "Non défini"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-black/5 dark:border-white/5 pt-8">
                                <div>
                                    <p className="text-[10px] text-black/40 font-black uppercase tracking-widest mb-3">Ce qui est inclus</p>
                                    <ul className="space-y-2">
                                        {service.includedItems?.map((item, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div>
                                    <p className="text-[10px] text-black/40 font-black uppercase tracking-widest mb-3">Disponibilités configurées</p>
                                    <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-5">
                                        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-primary">
                                            <span className="material-symbols-outlined text-base">public</span>
                                            Mon fuseau de base : {AVAILABLE_ZONES.find(z => z.offset === (service.availabilityTimezoneOffset || 9))?.name?.split(' / ')[0]} (UTC {(service.availabilityTimezoneOffset || 9) > 0 ? '+' : ''}{service.availabilityTimezoneOffset || 9})
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {Object.entries(service.availability || {}).filter(([_, avail]: any) => avail.enabled).map(([day, avail]: any) => (
                                                <div key={day} className="flex items-center justify-between text-sm">
                                                    <span className="font-medium">{day}</span>
                                                    <span className="text-black/50 dark:text-white/50 font-mono text-[11px] bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                                                        {avail.startTime} - {avail.endTime}
                                                    </span>
                                                </div>
                                            ))}
                                            {(!service.availability || Object.values(service.availability).filter((a: any) => a.enabled).length === 0) && (
                                                <p className="text-xs text-black/40 italic">Aucune disponibilité activée</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-black/10 border border-black/5 dark:border-white/10 rounded-[1.5rem] overflow-visible shadow-sm shadow-black/5 p-8">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                            <div>
                                <h3 className="text-xl font-black mb-1">Comparateur de fuseaux horaires</h3>
                                <p className="text-sm text-black/60 dark:text-white/60">Voyez exactement à quelle heure correspondent vos créneaux pour vos clients selon leur pays.</p>
                            </div>
                            <div className="relative w-full md:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-black/40 text-sm">search</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Rechercher un pays..."
                                    value={searchZone}
                                    onChange={(e) => { setSearchZone(e.target.value); setShowZoneDropdown(true); }}
                                    onFocus={() => setShowZoneDropdown(true)}
                                    className="w-full pl-9 pr-3 py-2 bg-black/[0.03] dark:bg-white/[0.03] border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                                {showZoneDropdown && searchZone && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        {AVAILABLE_ZONES.filter(z => z.name.toLowerCase().includes(searchZone.toLowerCase())).map((zone, i) => (
                                            <button
                                                key={i}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
                                                onClick={() => {
                                                    if (!activeZones.find(z => z.name === zone.name)) {
                                                        setActiveZones([...activeZones, zone]);
                                                    }
                                                    setSearchZone("");
                                                    setShowZoneDropdown(false);
                                                }}
                                            >
                                                <span>{zone.name}</span>
                                                <span className="text-[10px] text-black/40">UTC {zone.offset > 0 ? '+' : ''}{zone.offset}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-black/5 dark:border-white/5">
                                        <th className="py-4 pr-6 text-xs font-black uppercase tracking-widest text-primary">Mon Heure<br/><span className="text-[10px] text-black/40 dark:text-white/40">Base (UTC {(service.availabilityTimezoneOffset || 9) > 0 ? '+' : ''}{service.availabilityTimezoneOffset || 9})</span></th>
                                        {activeZones.map((zone, i) => (
                                            <th key={i} className="py-4 px-6 text-xs font-black uppercase tracking-widest text-black/40 dark:text-white/40 group relative">
                                                {zone.name}<br/><span className="text-[10px]">(UTC {zone.offset > 0 ? '+' : ''}{zone.offset})</span>
                                                <button
                                                    onClick={() => setActiveZones(activeZones.filter((_, index) => index !== i))}
                                                    className="absolute top-1/2 -translate-y-1/2 right-2 size-5 rounded-full bg-black/5 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Retirer"
                                                >
                                                    <span className="material-symbols-outlined text-[10px]">close</span>
                                                </button>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[8, 10, 12, 14, 16, 18, 20, 22].map(h => {
                                        const baseOffset = service.availabilityTimezoneOffset ?? 9;
                                        const formatTime = (hour: number, offset: number) => {
                                            let local = hour - baseOffset + offset;
                                            if (local < 0) local += 24;
                                            if (local >= 24) local -= 24;
                                            const ampm = local >= 12 ? 'PM' : 'AM';
                                            const h12 = local % 12 || 12;
                                            return `${local.toString().padStart(2, '0')}:00 (${h12} ${ampm})`;
                                        };
                                        return (
                                            <tr key={h} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                                                <td className="py-4 pr-6 font-bold text-primary">
                                                    {h.toString().padStart(2, '0')}:00 <span className="text-black/40 dark:text-white/40 text-[10px] font-medium ml-1">({h % 12 || 12} {h >= 12 ? 'PM' : 'AM'})</span>
                                                </td>
                                                {activeZones.map((zone, i) => (
                                                    <td key={i} className="py-4 px-6 text-sm font-medium">{formatTime(h, zone.offset)}</td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl">
                    <span className="material-symbols-outlined text-6xl text-black/20 dark:text-white/20 mb-4 block">event_busy</span>
                    <h3 className="text-xl font-black mb-2">Aucune consultation configurée</h3>
                    <p className="text-sm text-black/50 dark:text-white/50 max-w-sm mx-auto mb-6">
                        Créez votre première consultation pour permettre à vos clients de prendre rendez-vous avec vous.
                    </p>
                    <button
                        onClick={openCreateDrawer}
                        className="bg-primary hover:opacity-90 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 inline-flex items-center gap-2"
                    >
                        Créer la consultation
                    </button>
                </div>
            )}

            <OfferingDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                initialData={editingService}
                onSave={handleSave}
            />

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => !isDeleting && setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Supprimer la consultation ?"
                message="Cette action est irréversible."
                confirmText="Supprimer"
                isDanger={true}
                isLoading={isDeleting}
            />
        </div>
    );
}

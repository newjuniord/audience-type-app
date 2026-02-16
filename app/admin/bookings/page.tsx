"use client";

import { useState, useEffect } from "react";
import { getServices, addService, updateService, deleteService } from "@/lib/services";
import { Service } from "@/lib/types";
import OfferingDrawer from "@/components/OfferingDrawer";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function BookingsPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const filteredServices = services.filter(service =>
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
                <div>
                    <h1 className="text-primary dark:text-white text-4xl font-black leading-tight tracking-tighter mb-2">Service Offerings</h1>
                    <p className="text-black/50 dark:text-white/50 text-sm font-medium">Create and manage your available services.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={openCreateDrawer}
                        className="bg-primary hover:opacity-90 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        New Service
                    </button>
                    <div className="size-14 rounded-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center shadow-lg shadow-black/5">
                        <span className="material-symbols-outlined text-black dark:text-white">settings</span>
                    </div>
                </div>
            </div>

            {/* Table Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30">search</span>
                    <input
                        type="text"
                        placeholder="Search services..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-14 pr-6 rounded-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium placeholder:text-black/30 dark:placeholder:text-white/30"
                    />
                </div>
                <button
                    onClick={loadServices}
                    className="h-14 px-8 rounded-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-sm"
                >
                    <span className="material-symbols-outlined">refresh</span>
                    Refresh
                </button>
            </div>

            {/* Services Table */}
            <div className="bg-white dark:bg-black/10 border border-black/5 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm shadow-black/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Service Name</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Price</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Included Items</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="px-8 py-10 text-center text-black/40">Loading services...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={4} className="px-8 py-10 text-center text-red-500 font-bold">Error: {error}</td></tr>
                        ) : filteredServices.length === 0 ? (
                            <tr><td colSpan={4} className="px-8 py-10 text-center text-black/40">No services found.</td></tr>
                        ) : (
                            filteredServices.map((service) => (
                                <tr key={service.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-primary dark:text-white">{service.title}</span>
                                            <span className="text-xs text-black/40 dark:text-white/40 line-clamp-1">{service.description}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="font-black text-sm bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full">{service.price}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-1">
                                            {service.includedItems?.slice(0, 2).map((item, i) => (
                                                <span key={i} className="text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">
                                                    {item}
                                                </span>
                                            ))}
                                            {(service.includedItems?.length || 0) > 2 && (
                                                <span className="text-[10px] font-bold text-black/40">+{(service.includedItems?.length || 0) - 2} more</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditDrawer(service)}
                                                className="size-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-primary hover:text-white flex items-center justify-center transition-all"
                                                title="Edit Service"
                                            >
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </button>
                                            <button
                                                onClick={() => service.id && setDeleteId(service.id)}
                                                className="size-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                                title="Delete Service"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
                title="Supprimer le service ?"
                message="Cette action est irréversible. Le service sera définitivement supprimé de vos offres."
                confirmText="Supprimer"
                isDanger={true}
                isLoading={isDeleting}
            />
        </div>
    );
}

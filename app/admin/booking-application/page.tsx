"use client";

import { useState, useEffect } from "react";
import { getBookingApplications, updateBookingApplicationStatus, deleteBookingApplication } from "@/lib/booking-applications";
import { getServiceById } from "@/lib/services";
import { getUserById } from "@/lib/users";
import { BookingApplication } from "@/lib/types";

// Extended type for UI
interface ExtendedApplication extends BookingApplication {
    serviceName?: string;
    servicePrice?: string;
    customerEmail?: string;
    customerImage?: string;
    serviceDescription?: string;
}

export default function BookingsManagementPage() {
    const [applications, setApplications] = useState<ExtendedApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const apps = await getBookingApplications();

            // Fetch related data
            const extendedApps = await Promise.all(apps.map(async (app) => {
                // Prioritize existing serviceName or title from the document
                let serviceName = app.serviceName || app.title || "Unknown Service";
                let servicePrice = "";
                let serviceDescription = "";
                let customerEmail = "";
                let customerImage = "";

                // Check for bookingsId (current) or bookingId (legacy)
                const bookingRef = app.bookingsId || (app as any).bookingId;

                if (bookingRef) {
                    try {
                        const service = await getServiceById(bookingRef.id);
                        if (service) {
                            // Only overwrite if we didn't have a specific service name saved
                            if (!app.serviceName && !app.title) {
                                serviceName = service.title;
                            }
                            servicePrice = service.price;
                            serviceDescription = service.description;
                        }
                    } catch (e) { console.error("Error fetching service", e); }
                }

                if (app.usersId) { // Check for usersId (current)
                    try {
                        const user = await getUserById(app.usersId.id);
                        if (user) {
                            customerEmail = user.email;
                            customerImage = user.photoURL || "";
                        }
                    } catch (e) { console.error("Error fetching user", e); }
                } else if ((app as any).userId) { // Fallback for userId (legacy)
                    try {
                        const user = await getUserById((app as any).userId.id);
                        if (user) {
                            customerEmail = user.email;
                            customerImage = user.photoURL || "";
                        }
                    } catch (e) { console.error("Error fetching user", e); }
                }

                return {
                    ...app,
                    serviceName,
                    servicePrice,
                    serviceDescription,
                    customerEmail,
                    customerImage
                };
            }));

            // Sort by date desc
            extendedApps.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setApplications(extendedApps);
        } catch (error) {
            console.error("Failed to load booking applications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await updateBookingApplicationStatus(id, newStatus);
            setApplications(apps => apps.map(app =>
                app.id === id ? { ...app, status: newStatus } : app
            ));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Erreur lors de la mise à jour.");
        }
    };

    const filteredApps = applications.filter(app => {
        const matchesSearch = (
            (app.userName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (app.serviceName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (app.message?.toLowerCase() || "").includes(searchTerm.toLowerCase())
        );
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <main className="max-w-6xl mx-auto animate-in fade-in duration-700 relative pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Booking Applications</h2>
                    <p className="text-black/50 dark:text-white/50 text-sm">Review and manage incoming appointment requests.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={loadData}
                        className="bg-white dark:bg-white/5 text-primary dark:text-white border border-black/5 dark:border-white/10 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="relative flex-1 min-w-[300px]">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30">search</span>
                    <input
                        className="w-full bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-full pl-12 pr-6 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:opacity-50"
                        placeholder="Search by client, service or message..."
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['all', 'pending', 'accepted', 'rejected'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap ${statusFilter === status
                                ? 'bg-black text-white dark:bg-white dark:text-primary'
                                : 'bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* List View */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-20 text-black/40 dark:text-white/40 font-medium">Loading applications...</div>
                ) : filteredApps.length === 0 ? (
                    <div className="text-center py-20 text-black/40 dark:text-white/40 font-medium">No applications found matching your criteria.</div>
                ) : (
                    filteredApps.map((app) => (
                        <div key={app.id} className="bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 p-6 rounded-[1.5rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-black/20 dark:hover:border-white/20 transition-all shadow-sm shadow-black/5">
                            <div className="flex items-start gap-6 flex-1">
                                <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shrink-0">
                                    <span className="text-xs font-black uppercase text-black/40 dark:text-white/40">
                                        {app.createdAt ? app.createdAt.toDate().toLocaleString('en-US', { month: 'short' }) : 'N/A'}
                                    </span>
                                    <span className="text-xl font-black text-primary dark:text-white">
                                        {app.createdAt ? app.createdAt.toDate().getDate() : '--'}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${app.status === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                                            app.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                                'bg-yellow-100 text-yellow-700 border-yellow-200'
                                            }`}>
                                            {app.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest px-2 border-l border-black/10 dark:border-white/10">
                                            {app.serviceName}
                                        </span>
                                        {app.servicePrice && (
                                            <span className="text-[10px] font-bold text-black/40 dark:text-white/40 border-l border-black/10 dark:border-white/10 px-2">
                                                {app.servicePrice}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-sm font-medium text-black/60 dark:text-white/60 mb-3 line-clamp-2">
                                        "{app.message}"
                                    </h3>

                                    <div className="flex items-center gap-3">
                                        <div className="size-6 rounded-full bg-black/10 overflow-hidden relative shrink-0">
                                            {app.customerImage ? (
                                                <img alt={app.userName} className="w-full h-full object-cover" src={app.customerImage} />
                                            ) : (
                                                <span className="material-symbols-outlined text-sm text-black/40 flex items-center justify-center w-full h-full">person</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-primary dark:text-white">{app.userName}</span>
                                            <span className="text-[10px] text-black/40 dark:text-white/40">{app.customerEmail} • {app.userPhone}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5">
                                {app.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => app.id && handleStatusUpdate(app.id, 'accepted')}
                                            className="flex-1 md:flex-none h-10 px-5 rounded-full bg-black dark:bg-white text-white dark:text-primary text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-base">check</span>
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => app.id && handleStatusUpdate(app.id, 'rejected')}
                                            className="flex-1 md:flex-none h-10 px-5 rounded-full border border-black/10 dark:border-white/10 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-xs font-bold flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-base">close</span>
                                            Reject
                                        </button>
                                    </>
                                )}
                                {app.status !== 'pending' && (
                                    <button
                                        onClick={() => app.id && handleStatusUpdate(app.id, 'pending')}
                                        className="text-xs font-bold text-black/40 dark:text-white/40 hover:text-primary dark:hover:text-white underline decoration-dotted underline-offset-4"
                                    >
                                        Revert to Pending
                                    </button>
                                )}
                                <button
                                    onClick={() => app.id && setDeleteId(app.id)}
                                    className="size-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all border border-transparent"
                                    title="Supprimer la demande"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => !isDeleting && setDeleteId(null)}
                    />
                    <div className="bg-white dark:bg-background-dark rounded-[2rem] shadow-2xl shadow-black/10 w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="size-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-3xl">warning</span>
                            </div>
                            <h3 className="text-2xl font-black text-primary dark:text-white mb-2">Supprimer la demande ?</h3>
                            <p className="text-black/50 dark:text-white/50 text-sm font-medium mb-8">
                                Cette action est irréversible. La demande de réservation sera définitivement supprimée.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    disabled={isDeleting}
                                    className="flex-1 h-12 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-primary dark:text-white rounded-xl font-bold text-sm transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!deleteId) return;
                                        setIsDeleting(true);
                                        try {
                                            await deleteBookingApplication(deleteId);
                                            setApplications(apps => apps.filter(app => app.id !== deleteId));
                                            setDeleteId(null);
                                        } catch (e) {
                                            alert("Erreur lors de la suppression");
                                        } finally {
                                            setIsDeleting(false);
                                        }
                                    }}
                                    disabled={isDeleting}
                                    className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                            Supprimer
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

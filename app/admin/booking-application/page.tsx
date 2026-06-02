"use client";

import { useState, useEffect, useMemo } from "react";
import { getBookingApplications, updateBookingApplicationStatus, deleteBookingApplication } from "@/lib/booking-applications";
import { getServiceById } from "@/lib/services";
import { getUserById } from "@/lib/users";
import { getOrders } from "@/lib/orders";
import { BookingApplication } from "@/lib/types";

// Extended type for UI
interface ExtendedApplication extends BookingApplication {
    serviceName?: string;
    servicePrice?: string;
    customerEmail?: string;
    customerImage?: string;
    serviceDescription?: string;
    // Payment-related fields
    paymentStatus?: 'paid' | 'pending' | 'unpaid' | 'failed';
    paymentAmount?: string;
    paymentCurrency?: string;
    paymentMethod?: string;
    transactionId?: string;
    // Date/Time fields
    bookingDate?: string;
    bookingTime?: string;
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const AVATAR_PALETTE = [
    { bg: 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20' },
    { bg: 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20' },
    { bg: 'bg-green-500/10 text-green-500 dark:text-green-400 border border-green-500/20' },
    { bg: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' },
    { bg: 'bg-pink-500/10 text-pink-500 dark:text-pink-400 border border-pink-500/20' },
    { bg: 'bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20' },
];

export default function BookingsManagementPage() {
    const todayStr = new Date().toISOString().split('T')[0];
    const [applications, setApplications] = useState<ExtendedApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'unpaid'>('all');
    const [timeFilter, setTimeFilter] = useState<'all' | 'active' | 'past'>('active');
    
    // View Management
    const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'day'>('list');
    
    // Clocks
    const [estTime, setEstTime] = useState("--:--");
    const [kstTime, setKstTime] = useState("--:--");

    // Calendar navigation
    const [calDate, setCalDate] = useState(new Date());
    
    // Day navigation
    const [selectedDayStr, setSelectedDayStr] = useState(new Date().toISOString().split('T')[0]);

    // Deletion Modal
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Helpers
    const getBookingDate = (app: ExtendedApplication) => {
        if (app.bookingDate) return app.bookingDate;
        if (app.createdAt) {
            const d = new Date(app.createdAt as any);
            if (!isNaN(d.getTime())) {
                return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            }
        }
        return new Date().toISOString().split('T')[0];
    };

    const getBookingTimeKST = (app: ExtendedApplication) => {
        if (app.bookingTime) return app.bookingTime;
        const match = (app.message || "").match(/Kreyo:\s*(\d{2}:\d{2})/);
        return match ? match[1] : "09:00";
    };

    const format12h = (time24: string) => {
        if (!time24) return "";
        const [h, m] = time24.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return time24;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const convertKSTtoEST = (kstTime: string) => {
        const [h, m] = kstTime.split(':').map(Number);
        let estHour = h - 14;
        let dayOffset = 0;
        if (estHour < 0) {
            estHour += 24;
            dayOffset = -1;
        }
        const time24 = `${estHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        return {
            timeEST: format12h(time24),
            dayOffset
        };
    };

    const getAvatarInfo = (name?: string) => {
        const cleanName = name || "Anonymous";
        const initials = cleanName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const i = (initials.charCodeAt(0) || 0) % AVATAR_PALETTE.length;
        return { initials, styleClass: AVATAR_PALETTE[i].bg };
    };

    const getPlatformInfo = (message: string) => {
        const lower = message.toLowerCase();
        if (lower.includes("zoom")) return { name: "Zoom", icon: "video_camera_front" };
        if (lower.includes("meet") || lower.includes("google")) return { name: "Google Meet", icon: "video_chat" };
        if (lower.includes("whatsapp")) return { name: "WhatsApp", icon: "chat" };
        return { name: "Google Meet", icon: "video_chat" };
    };

    const getCountryInfo = (phone?: string) => {
        if (!phone) return { name: "Non spécifié", flag: "🌐" };
        const clean = phone.replace(/\D/g, '');
        if (clean.startsWith('509')) return { name: "Haïti", flag: "🇭🇹" };
        if (clean.startsWith('82')) return { name: "Corée du Sud", flag: "🇰🇷" };
        if (clean.startsWith('1809') || clean.startsWith('1829') || clean.startsWith('1849')) {
            return { name: "République Dominicaine", flag: "🇩🇴" };
        }
        if (clean.startsWith('1')) return { name: "États-Unis / Canada", flag: "🇺🇸" };
        return { name: "Autre", flag: "🌐" };
    };

    const formatPhoneUX = (phone?: string) => {
        if (!phone) return "Pas de numéro";
        let clean = phone.trim();
        if (!clean.startsWith('+') && clean.length > 5) {
            if (clean.startsWith('509') || clean.startsWith('82') || clean.startsWith('1')) {
                clean = '+' + clean;
            }
        }
        if (clean.startsWith('+509')) {
            const num = clean.replace('+509', '').trim();
            if (num.length === 8) {
                return `+509 ${num.slice(0, 4)} ${num.slice(4)}`;
            }
        }
        if (clean.startsWith('+82')) {
            const num = clean.replace('+82', '').trim();
            if (num.length === 9 || num.length === 10) {
                return `+82 ${num.slice(0, 2)} ${num.slice(2, 6)} ${num.slice(6)}`;
            }
        }
        if (clean.startsWith('+1')) {
            const num = clean.replace('+1', '').trim();
            if (num.length === 10) {
                return `+1 (${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6)}`;
            }
        }
        return clean;
    };

    const parseMessage = (msg?: string) => {
        const result = {
            kategori: "",
            sujet: "",
            creneau: ""
        };
        if (!msg) return result;
        const lines = msg.split('\n');
        for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.startsWith('kategori:') || lower.startsWith('catégorie:')) {
                result.kategori = line.substring(line.indexOf(':') + 1).trim();
            } else if (lower.startsWith('sijè:') || lower.startsWith('sujet:')) {
                result.sujet = line.substring(line.indexOf(':') + 1).trim();
            } else if (lower.startsWith('créneau souhaité:') || lower.startsWith('creneau souhaité:')) {
                result.creneau = line.substring(line.indexOf(':') + 1).trim();
            }
        }
        return result;
    };

    const formatBookingDateUX = (dateStr?: string) => {
        if (!dateStr) return "Non planifiée";
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const date = new Date(year, month, day);
                return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
            return dateStr;
        } catch (e) {
            return dateStr;
        }
    };

    // Live Clock Effect
    useEffect(() => {
        const updateClocks = () => {
            const now = new Date();
            const fmt = (tz: string) => new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(now);
            setEstTime(fmt('America/New_York'));
            setKstTime(fmt('Asia/Seoul'));
        };
        updateClocks();
        const interval = setInterval(updateClocks, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [apps, orders] = await Promise.all([
                getBookingApplications(),
                getOrders().catch(err => {
                    console.error("Error fetching orders", err);
                    return [];
                })
            ]);

            // Fetch related data
            const extendedApps = await Promise.all(apps.map(async (app) => {
                let serviceName = app.serviceName || app.title || "Unknown Service";
                let servicePrice = "";
                let serviceDescription = "";
                let customerEmail = "";
                let customerImage = "";

                const bookingRef = app.bookingsId || (app as any).bookingId;
                const serviceId = typeof bookingRef === 'string' ? bookingRef : bookingRef?.id;

                if (serviceId) {
                    try {
                        const service = await getServiceById(serviceId);
                        if (service) {
                            if (!app.serviceName && !app.title) {
                                serviceName = service.title;
                            }
                            servicePrice = service.price;
                            serviceDescription = service.description;
                        }
                    } catch (e) { console.error("Error fetching service", e); }
                }

                const rawUserId = app.usersId || (app as any).userId;
                const finalUserIdStr = typeof rawUserId === 'string' ? rawUserId : rawUserId?.id || "";

                if (finalUserIdStr) {
                    try {
                        const user = await getUserById(finalUserIdStr);
                        if (user) {
                            customerEmail = user.email;
                            customerImage = user.photoURL || "";
                        }
                    } catch (e) { console.error("Error fetching user", e); }
                }

                // Correlate orders
                const appOrderId = (app as any).orderId;
                let matchingOrder = appOrderId ? orders.find(o => o.id === appOrderId) : null;

                if (!matchingOrder && finalUserIdStr) {
                    const serviceIdStr = serviceId || "";

                    const matches = orders.filter(o => {
                        const rawOUserId = o.userId || (o as any).usersId;
                        const oUserId = typeof rawOUserId === 'string' ? rawOUserId : rawOUserId?.id || "";
                        const rawOProductId = o.productId || (o as any).productsId;
                        const oProductId = typeof rawOProductId === 'string' ? rawOProductId : rawOProductId?.id || "";
                        return oUserId === finalUserIdStr &&
                               oProductId === serviceIdStr &&
                               o.productType === 'service';
                    });

                    if (matches.length > 0) {
                        matches.sort((a, b) => {
                            const dateA = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
                            const dateB = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
                            return dateB - dateA;
                        });
                        matchingOrder = matches[0];
                    }
                }

                let paymentStatus: 'paid' | 'pending' | 'unpaid' | 'failed' = 'unpaid';
                let paymentAmount = "";
                let paymentCurrency = "";
                let paymentMethod = "";
                let transactionId = "";

                if (matchingOrder) {
                    const orderStatus = (matchingOrder.status || '').toLowerCase();
                    if (orderStatus === 'paid' || orderStatus === 'completed' || orderStatus === 'success') {
                        paymentStatus = 'paid';
                    } else if (orderStatus === 'pending') {
                        paymentStatus = 'pending';
                    } else {
                        paymentStatus = 'failed';
                    }
                    paymentAmount = matchingOrder.amount?.toString() || '';
                    paymentCurrency = matchingOrder.currency || '';
                    paymentMethod = matchingOrder.paymentMethod || (matchingOrder as any).provider || '';
                    transactionId = matchingOrder.transactionId || '';
                }

                return {
                    ...app,
                    serviceName,
                    servicePrice,
                    serviceDescription,
                    customerEmail,
                    customerImage,
                    paymentStatus,
                    paymentAmount,
                    paymentCurrency,
                    paymentMethod,
                    transactionId
                };
            }));

            extendedApps.sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
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
            const app = applications.find(a => a.id === id);
            if (newStatus === 'confirmed' && app && app.paymentStatus !== 'paid') {
                const confirmApprove = window.confirm(
                    `Attention: Cette consultation n'a pas été marquée comme payée (Statut: ${app.paymentStatus}).\n\nVoulez-vous quand même la confirmer ?`
                );
                if (!confirmApprove) return;
            }

            await updateBookingApplicationStatus(id, newStatus);
            setApplications(apps => apps.map(app =>
                app.id === id ? { ...app, status: newStatus } : app
            ));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Erreur lors de la mise à jour.");
        }
    };

    const filteredApps = useMemo(() => {
        return applications.filter(app => {
            const matchesSearch = (
                (app.userName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (app.serviceName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (app.message?.toLowerCase() || "").includes(searchTerm.toLowerCase())
            );
            const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
            const matchesPayment = paymentFilter === 'all' || app.paymentStatus === paymentFilter;

            let matchesTime = true;
            if (timeFilter === 'active') {
                matchesTime = !app.bookingDate || app.bookingDate >= todayStr;
            } else if (timeFilter === 'past') {
                matchesTime = !!app.bookingDate && app.bookingDate < todayStr;
            }

            return matchesSearch && matchesStatus && matchesPayment && matchesTime;
        });
    }, [applications, searchTerm, statusFilter, paymentFilter, timeFilter]);

    // Stats
    const stats = useMemo(() => {
        const total = applications.length;
        const paid = applications.filter(app => app.paymentStatus === 'paid').length;
        const pendingPayment = applications.filter(app => app.paymentStatus === 'pending').length;
        const revenueUSD = applications
            .filter(app => app.paymentStatus === 'paid' && app.paymentCurrency?.toLowerCase() === 'usd')
            .reduce((sum, app) => sum + (parseFloat(app.paymentAmount || '0') || 0), 0);
        const revenueHTG = applications
            .filter(app => app.paymentStatus === 'paid' && app.paymentCurrency?.toLowerCase() === 'htg')
            .reduce((sum, app) => sum + (parseFloat(app.paymentAmount || '0') || 0), 0);

        return { total, paid, pendingPayment, revenueUSD, revenueHTG };
    }, [applications]);

    // Calendar Calculations
    const calendarCells = useMemo(() => {
        const year = calDate.getFullYear();
        const month = calDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDayIndex = (firstDay.getDay() + 6) % 7; // Monday index 0
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const cells: { type: 'empty' | 'day'; dayNum?: number; dateStr?: string; bookings: ExtendedApplication[] }[] = [];
        
        // Empty cells before month starts
        for (let i = 0; i < startDayIndex; i++) {
            cells.push({ type: 'empty', bookings: [] });
        }

        // Days of month
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const dayBookings = applications.filter(app => getBookingDate(app) === dateStr);
            cells.push({
                type: 'day',
                dayNum: d,
                dateStr,
                bookings: dayBookings
            });
        }

        return cells;
    }, [calDate, applications]);

    const changeMonth = (offset: number) => {
        const newDate = new Date(calDate.getFullYear(), calDate.getMonth() + offset, 1);
        setCalDate(newDate);
    };

    // Day View calculations
    const dayBookings = useMemo(() => {
        return filteredApps.filter(app => getBookingDate(app) === selectedDayStr);
    }, [filteredApps, selectedDayStr]);

    const changeDay = (offset: number) => {
        const [y, m, d] = selectedDayStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + offset);
        setSelectedDayStr(date.toISOString().split('T')[0]);
    };

    const formattedDayLabel = useMemo(() => {
        const [y, m, d] = selectedDayStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return `${DAYS_FULL[date.getDay()]} ${d} ${MONTHS[date.getMonth()]} ${y}`;
    }, [selectedDayStr]);

    return (
        <main className="max-w-6xl mx-auto animate-in fade-in duration-700 relative pb-20 px-4">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Demandes de Réservation</h2>
                    <p className="text-black/50 dark:text-white/50 text-sm">Gérez et validez les demandes de réservation de consultation.</p>
                </div>
                
                {/* Clocks & Controls */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 px-5 py-2.5 rounded-full text-xs font-bold shadow-sm">
                        <span className="text-black/40 dark:text-white/40">Fuseaux :</span>
                        <div className="flex items-center gap-1.5">
                            <span>🇺🇸 EST</span>
                            <span className="font-mono text-primary dark:text-white">{estTime}</span>
                        </div>
                        <div className="border-l border-black/10 dark:border-white/10 h-3" />
                        <div className="flex items-center gap-1.5">
                            <span>🇰🇷 KST</span>
                            <span className="font-mono text-primary dark:text-white">{kstTime}</span>
                        </div>
                    </div>

                    <button
                        onClick={loadData}
                        className="bg-white dark:bg-white/5 text-primary dark:text-white border border-black/5 dark:border-white/10 px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-base">refresh</span>
                        Actualiser
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-in fade-in duration-1000">
                {/* Card 1 */}
                <div className="bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 p-6 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">Total Demandes</p>
                        <h4 className="text-2xl font-black text-primary dark:text-white truncate">{stats.total}</h4>
                    </div>
                    <div className="size-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center text-black/60 dark:text-white/60 shrink-0">
                        <span className="material-symbols-outlined text-2xl">calendar_month</span>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 p-6 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">Paiements Confirmés</p>
                        <h4 className="text-2xl font-black text-green-600 dark:text-green-500 truncate">
                            {stats.paid} <span className="text-xs font-normal text-black/40 dark:text-white/40">({stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}%)</span>
                        </h4>
                    </div>
                    <div className="size-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                        <span className="material-symbols-outlined text-2xl">payments</span>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 p-6 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">En attente de paiement</p>
                        <h4 className="text-2xl font-black text-yellow-600 dark:text-yellow-500 truncate">{stats.pendingPayment}</h4>
                    </div>
                    <div className="size-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                        <span className="material-symbols-outlined text-2xl">hourglass_empty</span>
                    </div>
                </div>


            </div>

            {/* View Mode Tabs Selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 p-1.5 rounded-2xl w-fit mb-8 shadow-sm">
                <button
                    onClick={() => setViewMode('calendar')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-black text-white dark:bg-white dark:text-primary shadow-sm' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-base">calendar_view_month</span>
                    Calendrier
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-black text-white dark:bg-white dark:text-primary shadow-sm' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                    Liste
                </button>
                <button
                    onClick={() => setViewMode('day')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-black text-white dark:bg-white dark:text-primary shadow-sm' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-base">grid_view</span>
                    Jour
                </button>
            </div>

            {/* Filter Controls (Available in all views or primarily List/Day) */}
            {viewMode !== 'calendar' && (
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-white dark:bg-black/10 border border-black/5 dark:border-white/5 p-6 rounded-3xl shadow-sm">
                    <div className="relative flex-1 min-w-[300px]">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30">search</span>
                        <input
                            className="w-full bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-full pl-12 pr-6 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:opacity-50"
                            placeholder="Rechercher par client, service..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-6 flex-wrap lg:flex-nowrap">
                        {/* Paiement Status Filter */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Statut Paiement</span>
                            <div className="flex items-center gap-2">
                                {['all', 'paid', 'pending', 'unpaid'].map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setPaymentFilter(status as any)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold capitalize transition-all whitespace-nowrap ${paymentFilter === status
                                            ? 'bg-primary text-white'
                                            : 'bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        {status === 'all' ? 'Tous' : status === 'paid' ? 'Payés' : status === 'pending' ? 'En attente' : 'Non payés'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sessions Période Filter Dropdown */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Période</span>
                            <select
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value as any)}
                                className="h-8 px-4 rounded-full text-[10px] font-bold bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 outline-none transition-all cursor-pointer text-black dark:text-white hover:border-black/20 dark:hover:border-white/20"
                            >
                                <option value="all">Toutes les Sessions</option>
                                <option value="active">Sessions Actives</option>
                                <option value="past">Sessions Passées</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* ── VIEW 1: CALENDAR ── */}
            {viewMode === 'calendar' && (
                <div className="bg-white dark:bg-black/10 border border-black/5 dark:border-white/5 p-6 rounded-3xl shadow-sm mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => changeMonth(-1)} className="size-10 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all">
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>
                        <span className="text-xl font-bold min-w-[150px] text-center text-primary dark:text-white">
                            {MONTHS[calDate.getMonth()]} {calDate.getFullYear()}
                        </span>
                        <button onClick={() => changeMonth(1)} className="size-10 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all">
                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-3">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                            <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 pb-2">
                                {d}
                            </div>
                        ))}

                        {calendarCells.map((cell, idx) => {
                            if (cell.type === 'empty') {
                                return <div key={`empty-${idx}`} className="bg-black/[0.01] dark:bg-white/[0.01] rounded-2xl min-h-[100px] border border-transparent pointer-events-none" />;
                            }

                            const isToday = new Date().toDateString() === new Date(calDate.getFullYear(), calDate.getMonth(), cell.dayNum!).toDateString();
                            
                            return (
                                <div
                                    key={`day-${cell.dayNum}`}
                                    onClick={() => {
                                        if (cell.dateStr) {
                                            setSelectedDayStr(cell.dateStr);
                                            setViewMode('day');
                                        }
                                    }}
                                    className={`bg-white dark:bg-black/20 border rounded-2xl p-3 min-h-[100px] cursor-pointer hover:border-primary dark:hover:border-primary transition-all flex flex-col justify-between group shadow-sm ${
                                        isToday ? 'border-primary ring-1 ring-primary/20' : 'border-black/5 dark:border-white/10'
                                    }`}
                                >
                                    <span className={`size-6 flex items-center justify-center text-xs font-bold rounded-full ${isToday ? 'bg-primary text-white' : 'text-black/60 dark:text-white/60 group-hover:text-primary dark:group-hover:text-primary'}`}>
                                        {cell.dayNum}
                                    </span>
                                    
                                    <div className="space-y-1.5 mt-2">
                                        {cell.bookings.slice(0, 3).map((b) => (
                                            <div
                                                key={b.id}
                                                className={`text-[9px] px-2 py-0.5 rounded-md font-bold truncate ${
                                                    b.status === 'confirmed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                                    b.status === 'cancelled' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                                    'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                                }`}
                                            >
                                                {format12h(getBookingTimeKST(b))} {b.userName.split(' ')[0]}
                                            </div>
                                        ))}
                                        {cell.bookings.length > 3 && (
                                            <div className="text-[8px] font-black text-black/40 dark:text-white/40 uppercase tracking-wide text-center">
                                                + {cell.bookings.length - 3} autres
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── VIEW 2: LIST VIEW ── */}
            {viewMode === 'list' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="text-center py-20 text-black/40 dark:text-white/40 font-medium">Chargement des demandes...</div>
                    ) : filteredApps.length === 0 ? (
                        <div className="text-center py-20 text-black/40 dark:text-white/40 font-medium">Aucune demande trouvée.</div>
                    ) : (
                        filteredApps.map((app) => {
                            const { initials, styleClass } = getAvatarInfo(app.userName);
                            const kstTimeStr = getBookingTimeKST(app);
                            const { timeEST } = convertKSTtoEST(kstTimeStr);
                            const platform = getPlatformInfo(app.message);
                            const country = getCountryInfo(app.userPhone);
                            const parsed = parseMessage(app.message);

                            return (
                                <div key={app.id} className="group bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden hover:border-black/20 dark:hover:border-white/20 hover:shadow-lg transition-all duration-300 shadow-sm shadow-black/5 animate-in fade-in duration-300">
                                    {/* Colored top accent bar */}
                                    <div className={`h-0.5 w-full ${app.paymentStatus === 'paid' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : app.paymentStatus === 'pending' ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} />

                                    <div className="p-5 flex flex-col gap-4">

                                        {/* Row 1 — Avatar + Name + Status */}
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`size-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${styleClass}`}>
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-primary dark:text-white truncate leading-tight">{app.userName}</p>
                                                    <p className="text-[11px] text-black/40 dark:text-white/40 truncate mt-0.5">{app.customerEmail || app.userPhone}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide border flex items-center gap-1 ${
                                                    app.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' :
                                                    app.paymentStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' :
                                                    'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[11px]">
                                                        {app.paymentStatus === 'paid' ? 'check_circle' : app.paymentStatus === 'pending' ? 'hourglass_empty' : 'cancel'}
                                                    </span>
                                                    {app.paymentStatus === 'paid'
                                                        ? `Payé · ${app.paymentAmount || app.servicePrice || '—'} ${app.paymentCurrency?.toUpperCase() === 'HTG' ? 'HTG' : 'USD'}`
                                                        : app.paymentStatus === 'pending'
                                                        ? `En attente · ${app.paymentAmount || app.servicePrice || '—'} ${app.paymentCurrency?.toUpperCase() === 'HTG' ? 'HTG' : 'USD'}`
                                                        : `Non payé · ${app.servicePrice || '—'} USD`
                                                    }
                                                </span>
                                                {app.createdAt && (
                                                    <span className="text-[10px] text-black/30 dark:text-white/30">
                                                        Reçue le {new Date(app.createdAt as any).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2 — Info tiles */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl p-3 flex flex-col gap-0.5 border border-black/5 dark:border-white/5">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-black/30 dark:text-white/30">Pays</span>
                                                <span className="text-xs font-bold text-black/70 dark:text-white/70 flex items-center gap-1">
                                                    <span>{country.flag}</span> <span className="truncate">{country.name}</span>
                                                </span>
                                            </div>
                                            <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl p-3 flex flex-col gap-0.5 border border-black/5 dark:border-white/5">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-black/30 dark:text-white/30">Téléphone</span>
                                                <span className="text-xs font-bold text-black/70 dark:text-white/70 truncate">{formatPhoneUX(app.userPhone)}</span>
                                            </div>
                                            <div className={`rounded-xl p-3 flex flex-col gap-0.5 border ${
                                                app.bookingDate && app.bookingDate < todayStr
                                                    ? 'bg-red-500/5 border-red-400/30'
                                                    : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/5 dark:border-white/5'
                                            }`}>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-black/30 dark:text-white/30">Date RDV</span>
                                                <span className="text-xs font-bold text-black/70 dark:text-white/70 capitalize flex items-center gap-1">
                                                    <span className="truncate">{formatBookingDateUX(app.bookingDate)}</span>
                                                    {app.bookingDate && app.bookingDate < todayStr && (
                                                        <span className="material-symbols-outlined text-[11px] text-red-500 shrink-0">warning</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl p-3 flex flex-col gap-0.5 border border-black/5 dark:border-white/5">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-black/30 dark:text-white/30">Horaire</span>
                                                <span className="font-mono text-sm font-bold text-primary dark:text-white leading-snug">
                                                    🇺🇸 {timeEST}<br/>🇰🇷 {format12h(kstTimeStr)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Row 3 — Footer chips */}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-black/5 dark:border-white/5">
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/40 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 px-2.5 py-1 rounded-lg">
                                                <span className="material-symbols-outlined text-[12px]">event_seat</span>
                                                {app.serviceName}
                                            </span>
                                            {parsed.kategori && (
                                                <span className="text-[10px] text-black/50 dark:text-white/40 flex items-center gap-1 px-2.5 py-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-lg border border-black/5 dark:border-white/5">
                                                    <span className="material-symbols-outlined text-[12px]">label</span>
                                                    {parsed.kategori}
                                                </span>
                                            )}
                                            {app.transactionId && (
                                                <span className="text-[10px] text-black/30 dark:text-white/30 font-mono px-2 py-1 border border-black/5 dark:border-white/5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                                                    TXID: {app.transactionId}
                                                </span>
                                            )}
                                            {parsed.sujet && (
                                                <span className="w-full text-[10px] text-black/60 dark:text-white/50 flex items-start gap-1.5 px-2.5 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] rounded-lg border border-black/5 dark:border-white/5">
                                                    <span className="material-symbols-outlined text-[12px] shrink-0 mt-px">subject</span>
                                                    <span>{parsed.sujet}</span>
                                                </span>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── VIEW 3: DAY VIEW ── */}
            {viewMode === 'day' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-8 bg-white dark:bg-black/10 border border-black/5 dark:border-white/5 p-4 rounded-2xl w-fit shadow-sm">
                        <button onClick={() => changeDay(-1)} className="size-10 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all">
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>
                        <div className="text-center min-w-[200px]">
                            <span className="block text-sm font-bold text-primary dark:text-white">
                                {formattedDayLabel}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                                {dayBookings.length} session{dayBookings.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <button onClick={() => changeDay(1)} className="size-10 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all">
                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                    </div>

                    {dayBookings.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-3xl shadow-sm text-black/40 dark:text-white/40 font-medium">
                            <span className="material-symbols-outlined text-5xl opacity-40 mb-4 block">event_busy</span>
                            Aucune consultation ce jour
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {dayBookings.map((app) => {
                                const { initials, styleClass } = getAvatarInfo(app.userName);
                                const kstTimeStr = getBookingTimeKST(app);
                                const { timeEST } = convertKSTtoEST(kstTimeStr);
                                const platform = getPlatformInfo(app.message);

                                return (
                                    <div key={app.id} className="bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 p-6 rounded-3xl flex flex-col justify-between gap-6 hover:border-black/20 dark:hover:border-white/20 transition-all shadow-sm relative overflow-hidden">
                                        
                                        {/* Status row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border flex items-center gap-1 ${
                                                    app.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' :
                                                    app.paymentStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' :
                                                    'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[10px]">
                                                        {app.paymentStatus === 'paid' ? 'check_circle' : app.paymentStatus === 'pending' ? 'hourglass_empty' : 'cancel'}
                                                    </span>
                                                    Paiement : {
                                                        app.paymentStatus === 'paid' ? `Payé (${app.paymentAmount} ${app.paymentCurrency?.toUpperCase() === 'HTG' ? 'Gourdes (HTG)' : 'USD ($)'} - ${app.paymentMethod === 'moncash' ? 'MonCash' : 'Kat / PayPal'})` :
                                                        app.paymentStatus === 'pending' ? `En attente (${app.paymentAmount || app.servicePrice || '—'} ${app.paymentCurrency?.toUpperCase() === 'HTG' ? 'Gourdes (HTG)' : 'USD ($)'})` :
                                                        `Non payé (${app.servicePrice || '—'} USD)`
                                                    }
                                                </span>

                                                {app.transactionId && (
                                                    <span className="text-[10px] text-black/40 dark:text-white/30 font-medium px-2 py-0.5 border border-black/5 dark:border-white/5 rounded-md bg-black/[0.02] dark:bg-white/[0.02] font-mono">
                                                        TXID: {app.transactionId}
                                                    </span>
                                                )}

                                                {app.bookingDate && app.bookingDate < todayStr && (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                                                        <span className="material-symbols-outlined text-[10px]">warning</span>
                                                        Date Dépassée
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <span className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">
                                                {app.serviceName}
                                            </span>
                                        </div>

                                        {/* Client Info */}
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${styleClass}`}>
                                                {initials}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-primary dark:text-white">{app.userName}</h4>
                                                <p className="text-xs text-black/40 dark:text-white/40">{app.customerEmail} • {app.userPhone}</p>
                                            </div>
                                        </div>

                                        {/* USA / Korea Time Blocks */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/[0.02] dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">🇺🇸 USA — EST</div>
                                                <div className="font-mono text-base font-bold text-primary dark:text-white">{timeEST}</div>
                                                <div className="text-[8px] text-black/40 dark:text-white/40 mt-1">Durée : 1h</div>
                                            </div>
                                            <div className="bg-black/[0.02] dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">🇰🇷 Corée — KST</div>
                                                <div className="font-mono text-base font-bold text-primary dark:text-white">{format12h(kstTimeStr)}</div>
                                                <div className="text-[8px] text-black/40 dark:text-white/40 mt-1">Fuseau : +14h</div>
                                            </div>
                                        </div>

                                        {/* Message preview */}
                                        <div className="text-xs text-black/60 dark:text-white/60 bg-black/[0.01] dark:bg-white/[0.01] border border-black/5 dark:border-white/5 p-3.5 rounded-2xl whitespace-pre-line leading-relaxed">
                                            {app.message}
                                        </div>


                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

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

"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { getOrdersByUser } from "@/lib/orders";
import { Order } from "@/lib/types";
import Link from "next/link";

export default function TransactionsPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchOrders = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                // Mock data
                const mockOrders: Order[] = [
                    {
                        id: "mock-order-1",
                        transactionId: "tx_mock_123abc",
                        userId: "mock-user-123",
                        userName: "Admin User",
                        userEmail: "admin@audiencetype.com",
                        productId: "mock-course-1",
                        productTitle: "Formation Complète",
                        productThumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop",
                        productType: "course",
                        amount: 100,
                        currency: "USD",
                        status: "paid",
                        paymentMethod: "card",
                        createdAt: new Date().toISOString()
                    }
                ];
                setOrders(mockOrders);
            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user]);

    const filteredOrders = orders.filter(order =>
        (order.productTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.transactionId || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "—";
        return new Date(timestamp as any).toLocaleDateString("fr-FR", {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const formatCurrency = (amount: number, currency: string) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'USD' }).format(amount);

    const getIconForType = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('course')) return 'school';
        if (t.includes('ebook')) return 'menu_book';
        if (t.includes('service')) return 'design_services';
        return 'shopping_bag';
    };

    const getTypeLabel = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('course')) return 'Kou';
        if (t.includes('ebook')) return 'Ebook';
        if (t.includes('service')) return 'Sèvis';
        return 'Produi';
    };

    const getStatusConfig = (status: string, createdAt?: any) => {
        if (['paid', 'completed'].includes(status))
            return { label: 'Peye', dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' };
        if (status === 'failed')
            return { label: 'Echwe', dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' };
            
        if (createdAt) {
            const orderDate = new Date(createdAt as any).getTime();
            const now = new Date().getTime();
            const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
            if ((now - orderDate) > threeDaysInMs) {
                return { label: 'Ekspire', dot: 'bg-gray-500', text: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' };
            }
        }

        return { label: 'An atant', dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' };
    };

    // Quick stats
    const totalSpent = orders.filter(o => ['paid', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.amount || 0), 0);
    const paidCount = orders.filter(o => ['paid', 'completed'].includes(o.status)).length;

    return (
        <div className="pt-24 pb-24 max-w-[1200px] mx-auto px-6">

                {/* Page Header */}
                <div className="py-12 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <span className="text-primary text-xs font-black uppercase tracking-[0.3em]">Mon compte</span>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                            Transactions
                        </h1>
                        <p className="text-white/40 text-sm">Istwa achète ak peman ou yo.</p>
                    </div>

                    {/* Quick stats */}
                    {!loading && orders.length > 0 && (
                        <div className="flex items-stretch gap-4">
                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center min-w-[100px]">
                                <p className="text-2xl font-black text-white">{paidCount}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">Acha fèt</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 text-center min-w-[120px]">
                                <p className="text-2xl font-black text-primary">
                                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalSpent)}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">Total depanse</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mt-6">
                    <Link href="/dashboard/transactions" className="px-5 py-2.5 bg-primary text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                        Tranzaksyon
                    </Link>
                    <Link href="/dashboard/consultations" className="px-5 py-2.5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white rounded-full text-xs font-bold uppercase tracking-widest transition-colors">
                        Istwa Konsiltasyon
                    </Link>
                </div>

                {/* Search bar */}
                <div className="py-6">
                    <div className="relative max-w-md">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-[20px]">search</span>
                        <input
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
                            placeholder="Chèche pa tit oswa ID..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-white/10 overflow-x-auto">
                    <div className="min-w-[1000px]">
                        {/* Table header */}
                        <div className="grid grid-cols-[2.5fr_1.2fr_1fr_1fr_1.2fr_1fr] gap-4 px-6 py-4 bg-white/[0.02] border-b border-white/5">
                            {["Pwodui", "ID Tranzaksyon", "Dat", "Tip", "Metòd", "Montan / Estati"].map((h) => (
                                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-white/30">{h}</p>
                            ))}
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-white/5">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-4">
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-white/30 text-sm font-medium">Chajman...</p>
                                </div>
                            ) : paginatedOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-4">
                                    <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-white/20">receipt_long</span>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-white">Okenn tranzaksyon</p>
                                        <p className="text-white/40 text-sm mt-1">
                                            {searchTerm ? "Okenn rezilta pou rechèch sa a." : "Ou poko fè okenn acha."}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                paginatedOrders.map((order) => {
                                    const status = getStatusConfig(order.status, order.createdAt);
                                    return (
                                        <div
                                            key={order.id}
                                            className="grid grid-cols-[2.5fr_1.2fr_1fr_1fr_1.2fr_1fr] gap-4 px-6 py-5 hover:bg-white/[0.02] transition-colors items-center"
                                        >
                                            {/* Product */}
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-primary text-[18px]">
                                                        {getIconForType(order.productType || "")}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{order.productTitle}</p>
                                                </div>
                                            </div>

                                            {/* Transaction ID */}
                                            <button
                                                onClick={() => {
                                                    if (!order.transactionId) return;
                                                    navigator.clipboard.writeText(order.transactionId);
                                                    setCopiedId(order.transactionId);
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                }}
                                                className="relative flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors group/copy w-fit"
                                                title="Klike pou kopye ID a"
                                            >
                                                <span className="font-mono text-xs">#{order.transactionId?.substring(0, 10)}…</span>
                                                <span className="material-symbols-outlined text-[14px] opacity-0 group-hover/copy:opacity-100 transition-opacity">content_copy</span>
                                                {copiedId === order.transactionId && (
                                                    <span className="absolute -top-7 left-0 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap animate-in fade-in zoom-in">
                                                        Kopye ✓
                                                    </span>
                                                )}
                                            </button>

                                            {/* Date */}
                                            <p className="text-sm text-white/50">{formatDate(order.createdAt)}</p>

                                            {/* Type */}
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60">
                                                    {getTypeLabel(order.productType || "")}
                                                </span>
                                            </div>

                                            {/* Payment method */}
                                            <p className="text-sm text-white/50 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[14px] text-white/30">credit_card</span>
                                                <span className="capitalize">{order.paymentMethod || 'Kat'}</span>
                                            </p>

                                            {/* Amount + Status */}
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <p className="text-base font-black text-white">
                                                    {formatCurrency(order.amount, order.currency)}
                                                </p>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.text}`}>
                                                    <span className={`size-1.5 rounded-full ${status.dot}`}></span>
                                                    {status.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="py-10 flex justify-center items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="size-10 flex items-center justify-center rounded-full border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-30 text-white"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`size-10 flex items-center justify-center rounded-full transition-all text-sm font-bold ${currentPage === page
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'border border-white/10 hover:bg-white/5 text-white/50 hover:text-white'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="size-10 flex items-center justify-center rounded-full border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-30 text-white"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    </div>
                )}
        </div>
    );
}

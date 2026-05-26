"use client";

import { useState, useEffect } from "react";
import { getOrders } from "@/lib/orders";
import { Order } from "@/lib/types";
import OrderDrawer from "@/components/OrderDrawer";

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const loadOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getOrders();
            // Sort by status (success first) then by createdAt descending
            const sorted = data.sort((a, b) => {
                const statusA = (a.status || '').toLowerCase();
                const statusB = (b.status || '').toLowerCase();
                
                const isASuccess = statusA === 'paid' || statusA === 'success' || statusA === 'completed';
                const isBSuccess = statusB === 'paid' || statusB === 'success' || statusB === 'completed';

                if (isASuccess && !isBSuccess) return -1;
                if (!isASuccess && isBSuccess) return 1;

                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
            setOrders(sorted.slice(0, 5));
        } catch (err: any) {
            console.error("Failed to load orders:", err);
            setError(err.message || "Impossible de charger les transactions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const openOrderDrawer = (order: Order) => {
        setSelectedOrder(order);
        setIsDrawerOpen(true);
    };

    const formatDate = (dateValue: any) => {
        if (!dateValue) return "N/A";
        if (dateValue.toDate) {
            return dateValue.toDate().toLocaleDateString();
        }
        if (typeof dateValue === 'string') {
            return new Date(dateValue).toLocaleDateString();
        }
        if (dateValue.seconds) {
             return new Date(dateValue.seconds * 1000).toLocaleDateString();
        }
        return "N/A";
    };

    const filteredOrders = orders.filter(order =>
        (order.userEmail && order.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.userName && order.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.productTitle && order.productTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.transactionId && order.transactionId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const StatusBadge = ({ status }: { status: string }) => {
        let bgColor = "bg-gray-100 text-gray-700";
        const normalizedStatus = (status || "").toLowerCase();
        if (normalizedStatus === 'paid' || normalizedStatus === 'success') bgColor = "bg-green-100 text-green-700";
        if (normalizedStatus === 'failed' || normalizedStatus === 'refunded') bgColor = "bg-red-100 text-red-700";
        if (normalizedStatus === 'pending') bgColor = "bg-yellow-100 text-yellow-700";
        
        const getStatusLabel = (s: string) => {
            const lower = s.toLowerCase();
            if (lower === 'paid' || lower === 'success') return 'Payé';
            if (lower === 'failed') return 'Échoué';
            if (lower === 'refunded') return 'Remboursé';
            if (lower === 'pending') return 'En attente';
            return s || "Inconnu";
        };

        return (
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${bgColor}`}>
                {getStatusLabel(status)}
            </span>
        );
    };

    return (
        <div className="animate-in fade-in duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
                <div>
                    <h1 className="text-primary dark:text-white text-4xl font-black leading-tight tracking-tighter mb-2">Transactions</h1>
                    <p className="text-black/50 dark:text-white/50 text-sm font-medium">Visualisez l'ensemble des commandes et paiements.</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30">search</span>
                    <input
                        type="text"
                        placeholder="Rechercher par email, produit ou ID de transaction..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-14 pr-6 rounded-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium placeholder:text-black/30 dark:placeholder:text-white/30"
                    />
                </div>
                <button
                    onClick={loadOrders}
                    className="h-14 px-8 rounded-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-sm"
                >
                    <span className="material-symbols-outlined">refresh</span>
                    Actualiser
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-black/10 border border-black/5 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm shadow-black/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Date & Client</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Produit</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Montant</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Statut</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="px-8 py-10 text-center text-black/40">Chargement des transactions...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={5} className="px-8 py-10 text-center text-red-500 font-bold">Erreur: {error}</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan={5} className="px-8 py-10 text-center text-black/40">Aucune transaction trouvée.</td></tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-black/40 dark:text-white/40 mb-1">{formatDate(order.createdAt)}</span>
                                                <span className="font-bold text-primary dark:text-white">{order.userName || order.userEmail || "Client Inconnu"}</span>
                                                {order.userName && <span className="text-xs text-black/40 dark:text-white/40">{order.userEmail}</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-black dark:text-white">{order.productTitle || "Produit Inconnu"}</span>
                                                <span className="text-[10px] uppercase font-bold text-black/40 dark:text-white/40 mt-1">{order.productType}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-sm">{order.amount} {order.currency}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openOrderDrawer(order)}
                                                    className="size-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-primary hover:text-white flex items-center justify-center transition-all"
                                                    title="Voir les détails"
                                                >
                                                    <span className="material-symbols-outlined text-md">visibility</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <OrderDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                order={selectedOrder}
            />
        </div>
    );
}

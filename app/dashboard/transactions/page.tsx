"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { getOrdersByUser } from "@/lib/orders";
import { Order } from "@/lib/types";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
            if (!user) return;
            try {
                // const userRef = doc(db, "users", user.uid); // Plus besoin de ref
                const userOrders = await getOrdersByUser(user.uid);
                // Sort by date desc
                userOrders.sort((a, b) => {
                    const dateA = a.createdAt?.toDate().getTime() || 0;
                    const dateB = b.createdAt?.toDate().getTime() || 0;
                    return dateB - dateA;
                });
                setOrders(userOrders);
            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchOrders();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Filtering
    const filteredOrders = orders.filter(order =>
        order.productTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.transactionId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "N/A";
        return timestamp.toDate().toLocaleDateString("fr-FR", {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency || 'USD'
        }).format(amount);
    };

    const getIconForType = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('course')) return 'school';
        if (t.includes('ebook')) return 'book';
        if (t.includes('service')) return 'build';
        return 'shopping_bag';
    };

    const getTypeLabel = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('course')) return 'Cours';
        if (t.includes('ebook')) return 'Ebook';
        if (t.includes('service')) return 'Service';
        return 'Produit';
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-white dark:bg-background-dark group/design-root overflow-x-hidden font-display">
            <div className="layout-container flex h-full grow flex-col">
                <main className="flex-1 flex flex-col lg:px-40 py-8">
                    {/* Transaction Summary */}
                    <div className="flex flex-wrap justify-between items-end gap-6 px-6 mb-10">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-primary dark:text-white text-4xl font-black tracking-tighter">Historique des transactions</h2>
                            <p className="text-primary/60 dark:text-white/60 text-base">Gérez et suivez tous vos achats numériques passés.</p>
                        </div>
                    </div>

                    {/* Filters and Search */}
                    <div className="px-6 mb-6 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative w-full md:max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-primary/40 dark:text-white/40">search</span>
                            </div>
                            <input
                                className="block w-full rounded-full border-none bg-primary/5 dark:bg-white/5 py-3 pl-11 pr-4 text-sm text-primary dark:text-white placeholder-primary/40 dark:placeholder-white/40 focus:ring-2 focus:ring-primary/20 dark:focus:ring-white/20 transition-all"
                                placeholder="Rechercher par titre ou ID..."
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="px-6 overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="border-b border-primary/10 dark:border-white/10">
                                    <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-white/40 border-b border-primary/10 dark:border-white/10">ID de Transaction</th>
                                    <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-white/40 border-b border-primary/10 dark:border-white/10">Date</th>
                                    <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-white/40 border-b border-primary/10 dark:border-white/10">Nom de l'article</th>
                                    <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-white/40 border-b border-primary/10 dark:border-white/10">Type</th>
                                    <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-white/40 border-b border-primary/10 dark:border-white/10">Méthode</th>
                                    <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-white/40 border-b border-primary/10 dark:border-white/10 text-right">Montant</th>
                                    <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-white/40 border-b border-primary/10 dark:border-white/10 text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-primary/5 dark:divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10">
                                            <div className="flex justify-center">
                                                <span className="material-symbols-outlined animate-spin text-4xl opacity-20">progress_activity</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10 text-primary/40 dark:text-white/40 font-medium">
                                            Aucune transaction trouvée.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedOrders.map((order) => (
                                        <tr key={order.id} className="group hover:bg-primary/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                            <td
                                                onClick={() => {
                                                    if (!order.transactionId) return;
                                                    navigator.clipboard.writeText(order.transactionId);
                                                    setCopiedId(order.transactionId);
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                }}
                                                className="py-5 px-4 text-sm font-bold text-primary dark:text-white cursor-pointer hover:text-primary/70 dark:hover:text-white/70 transition-colors relative group/copy"
                                                title="Cliquez pour copier l'ID complet"
                                            >
                                                <div className="flex items-center gap-2">
                                                    #{order.transactionId?.substring(0, 8)}...
                                                    <span className="material-symbols-outlined text-[14px] opacity-0 group-hover/copy:opacity-100 transition-opacity">content_copy</span>
                                                </div>
                                                {copiedId === order.transactionId && (
                                                    <span className="absolute top-1 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded animate-in fade-in zoom-in">
                                                        Copié !
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-5 px-4 text-sm text-primary/70 dark:text-white/70">{formatDate(order.createdAt)}</td>
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-lg bg-primary/5 dark:bg-white/5 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[18px] text-primary dark:text-white">
                                                            {getIconForType(order.productType || "")}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-primary dark:text-white line-clamp-1 max-w-[200px]">{order.productTitle}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 dark:bg-white/10 text-primary dark:text-white uppercase tracking-wider">
                                                    {getTypeLabel(order.productType || "")}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4 text-sm text-primary/70 dark:text-white/70">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]">credit_card</span>
                                                    <span className="capitalize">{order.paymentMethod || 'Carte'}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4 text-sm font-bold text-right text-primary dark:text-white">
                                                {formatCurrency(order.amount, order.currency)}
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${order.status === 'paid'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                    {order.status === 'paid' ? 'Payé' : order.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-12 flex justify-center items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="size-10 flex items-center justify-center rounded-full border border-primary/10 dark:border-white/10 hover:bg-primary/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-primary dark:text-white"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`size-10 flex items-center justify-center rounded-full transition-colors text-sm font-bold ${currentPage === page
                                        ? 'bg-primary dark:bg-white text-white dark:text-primary'
                                        : 'border border-primary/10 dark:border-white/10 hover:bg-primary/5 dark:hover:bg-white/5 text-primary dark:text-white'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="size-10 flex items-center justify-center rounded-full border border-primary/10 dark:border-white/10 hover:bg-primary/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-primary dark:text-white"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

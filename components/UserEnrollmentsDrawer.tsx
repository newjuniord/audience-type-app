"use client";

import { useState, useEffect } from "react";
import { User, Enrollment, Order } from "@/lib/types";
import { getEnrollmentsByUser, deleteEnrollment } from "@/lib/enrollments";
import { getOrdersByUser } from "@/lib/orders";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ConfirmModal from "./ui/ConfirmModal";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface UserEnrollmentsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export default function UserEnrollmentsDrawer({ isOpen, onClose, user }: UserEnrollmentsDrawerProps) {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [activeTab, setActiveTab] = useState<'enrollments' | 'orders'>('enrollments');
    const [enrollmentToDelete, setEnrollmentToDelete] = useState<Enrollment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            fetchEnrollments();
            fetchOrders();
        } else {
            setEnrollments([]);
            setOrders([]);
            setActiveTab('enrollments');
        }
    }, [isOpen, user]);

    const fetchEnrollments = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            const data = await getEnrollmentsByUser(userRef);
            setEnrollments(data);
        } catch (error) {
            console.error("Failed to fetch enrollments", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        if (!user) return;
        setLoadingOrders(true);
        try {
            const data = await getOrdersByUser(user.uid);
            // Sort by date descending
            const sortedData = [...data].sort((a, b) => {
                const dateA = a.createdAt?.toDate().getTime() || 0;
                const dateB = b.createdAt?.toDate().getTime() || 0;
                return dateB - dateA;
            });
            setOrders(sortedData);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleRevokeAccess = async () => {
        if (!enrollmentToDelete || !enrollmentToDelete.id) return;
        
        setIsDeleting(true);
        try {
            await deleteEnrollment(enrollmentToDelete.id);
            // Update local state
            setEnrollments(prev => prev.filter(e => e.id !== enrollmentToDelete.id));
            setEnrollmentToDelete(null);
        } catch (error) {
            console.error("Failed to revoke access", error);
            alert("Erreur lors du retrait de l'accès.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                <div 
                    className="w-full max-w-md bg-white dark:bg-[#1a1a1a] h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-black/5 dark:border-white/10 p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Produits</h2>
                            <p className="text-sm text-black/50 dark:text-white/50">
                                Bibliothèque de {user?.displayName || "l'utilisateur"}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl mb-6">
                        <button
                            onClick={() => setActiveTab('enrollments')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'enrollments'
                                    ? 'bg-white dark:bg-white/10 shadow-sm'
                                    : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                                }`}
                        >
                            Produits ({enrollments.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'orders'
                                    ? 'bg-white dark:bg-white/10 shadow-sm'
                                    : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                                }`}
                        >
                            Transactions ({orders.length})
                        </button>
                    </div>

                    {activeTab === 'enrollments' ? (
                        loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse"></div>
                                ))}
                            </div>
                        ) : enrollments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                                <span className="material-symbols-outlined text-4xl mb-2">sentiment_dissatisfied</span>
                                <p>Aucun produit trouvé.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {enrollments.map((enrollment) => (
                                    <div
                                        key={enrollment.id}
                                        className="group p-4 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl hover:border-primary/50 transition-colors"
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 rounded-lg bg-black/5 dark:bg-white/5 overflow-hidden flex-shrink-0">
                                                {enrollment.productThumbnailUrl ? (
                                                    <img
                                                        src={enrollment.productThumbnailUrl}
                                                        alt={enrollment.productTitle}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-2xl opacity-20">image</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="font-bold text-sm truncate pr-2">{enrollment.productTitle}</h3>
                                                    <button 
                                                        onClick={() => setEnrollmentToDelete(enrollment)}
                                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                                                        title="Retirer l'accès"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">remove_circle</span>
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-black/50 dark:text-white/50">
                                                    <span className={`px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${enrollment.productType.toLowerCase().includes('course')
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                        }`}>
                                                        {enrollment.productType.toLowerCase().includes('course') ? 'Cours' : 'Ebook'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{enrollment.status}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {enrollment.enrolledAt 
                                                            ? `Il y a ${formatDistanceToNow(enrollment.enrolledAt.toDate(), { locale: fr })}` 
                                                            : 'Date inconnue'}
                                                    </span>
                                                </div>

                                                {enrollment.productType.toLowerCase() === 'course' && (
                                                    <div className="mt-2 w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary"
                                                            style={{ width: `${enrollment.progress || 0}%` }}
                                                        ></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        loadingOrders ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse"></div>
                                ))}
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                                <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                                <p>Aucune transaction trouvée.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="p-4 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl hover:border-black/20 dark:hover:border-white/20 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0 mr-4">
                                                <h4 className="font-bold text-sm truncate">{order.productTitle}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-[10px] text-black/40 dark:text-white/40">
                                                        ID: {order.transactionId || order.id?.substring(0, 8)}
                                                    </p>
                                                    {order.transactionId?.startsWith('pay_') && (
                                                        <a 
                                                            href={`https://live.dodopayments.com/invoices/payments/${order.transactionId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center p-1 rounded-full bg-primary/5 hover:bg-primary/20 text-primary transition-colors"
                                                            title="Voir la facture"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <span className="material-symbols-outlined text-[12px]">download</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${order.status === 'paid'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                : order.status === 'failed'
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            }`}>
                                                {order.status === 'paid' ? 'Réussi' : order.status === 'failed' ? 'Échoué' : order.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black">{order.amount} {order.currency || 'USD'}</span>
                                                <span className="text-[10px] text-black/30 dark:text-white/30">•</span>
                                                <span className="text-[10px] text-black/40 dark:text-white/40">
                                                    {order.createdAt 
                                                        ? `Il y a ${formatDistanceToNow(order.createdAt.toDate(), { locale: fr })}` 
                                                        : 'Date inconnue'}
                                                </span>
                                            </div>
                                            {order.paymentMethod && (
                                                <span className="text-[10px] text-black/40 dark:text-white/40 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[10px]">payments</span>
                                                    {order.paymentMethod}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={!!enrollmentToDelete}
                onClose={() => setEnrollmentToDelete(null)}
                onConfirm={handleRevokeAccess}
                title="Retirer l'accès ?"
                message={`Voulez-vous vraiment retirer l'accès de l'utilisateur au produit "${enrollmentToDelete?.productTitle}" ? Cette action est immédiate.`}
                confirmText="Retirer l'accès"
                isDanger={true}
                isLoading={isDeleting}
            />
        </>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Order } from "@/lib/types";

interface OrderDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
}

export default function OrderDrawer({ isOpen, onClose, order }: OrderDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 700);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;
    if (!order) return null;

    // Helper functions for formatting
    const formatDate = (dateValue: any) => {
        if (!dateValue) return "N/A";
        if (dateValue.toDate) {
            return dateValue.toDate().toLocaleString();
        }
        if (typeof dateValue === 'string') {
            return new Date(dateValue).toLocaleString();
        }
        if (dateValue.seconds) { // Raw firebase timestamp
             return new Date(dateValue.seconds * 1000).toLocaleString();
        }
        return String(dateValue);
    };

    const getRefId = (refValue: any) => {
        if (!refValue) return "N/A";
        if (typeof refValue === 'string') return refValue;
        if (refValue.id) return refValue.id;
        return String(refValue);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        let bgColor = "bg-gray-100 text-gray-700";
        if (status.toLowerCase() === 'paid' || status.toLowerCase() === 'success') bgColor = "bg-green-100 text-green-700";
        if (status.toLowerCase() === 'failed' || status.toLowerCase() === 'refunded') bgColor = "bg-red-100 text-red-700";
        if (status.toLowerCase() === 'pending') bgColor = "bg-yellow-100 text-yellow-700";
        
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${bgColor}`}>
                {status || "Unknown"}
            </span>
        );
    };

    const InfoField = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div className="space-y-1 p-4 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.05]">
            <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest ml-1">{label}</label>
            <div className="text-sm font-medium px-1 text-black dark:text-white overflow-hidden text-ellipsis w-full" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                {value || <span className="text-black/30 dark:text-white/30 italic">N/A</span>}
            </div>
        </div>
    );

    return (
        <div className={`fixed inset-0 z-[100] transition-all duration-700 overflow-hidden ${isOpen ? 'visible' : 'invisible delay-700'}`}>
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[2px] transition-opacity duration-700 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`absolute top-0 right-0 h-full w-full max-w-[480px] bg-white dark:bg-background-dark shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-none flex flex-col transform transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
            >
                {/* Header */}
                <header className={`flex items-center justify-between px-8 py-8 border-b border-black/5 dark:border-white/5 transition-all duration-700 delay-100 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight uppercase">Détails de la commande</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mt-1">
                            ID: {order.id || "N/A"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all active:scale-90"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto px-8 py-8 space-y-6 custom-scrollbar">
                    
                    {/* Status & Amount Focus */}
                    <div className={`p-6 bg-primary/5 border border-primary/20 rounded-3xl flex justify-between items-center transition-all duration-700 delay-150 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                        <div>
                            <p className="text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-1">Montant Total</p>
                            <p className="text-3xl font-black text-primary dark:text-white">
                                {order.amount ? `${order.amount} ${order.currency || ''}` : "N/A"}
                            </p>
                        </div>
                        <div>
                            <StatusBadge status={order.status} />
                        </div>
                    </div>

                    <div className={`space-y-4 transition-all duration-700 delay-200 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Informations Produit</h3>
                        
                        {order.productThumbnailUrl && (
                            <div className="w-full h-32 overflow-hidden rounded-2xl bg-black/5 relative mb-2">
                                <img src={order.productThumbnailUrl} alt={order.productTitle} className="w-full h-full object-cover" />
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                            <InfoField label="Produit" value={order.productTitle} />
                            <InfoField label="Type" value={order.productType} />
                        </div>
                        <InfoField label="Product ID" value={getRefId(order.productId)} />
                    </div>

                    <div className={`space-y-4 transition-all duration-700 delay-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Informations Client</h3>
                        <InfoField label="Nom" value={order.userName} />
                        <InfoField label="Email" value={order.userEmail} />
                        <InfoField label="User ID" value={getRefId(order.userId)} />
                    </div>

                    <div className={`space-y-4 transition-all duration-700 delay-400 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Détails de transaction</h3>
                        <InfoField label="Transaction ID" value={order.transactionId} />
                        <InfoField label="Méthode de paiement" value={order.paymentMethod} />
                        <InfoField label="Date de création" value={formatDate(order.createdAt)} />
                        {order.expiresAt && <InfoField label="Expirée le" value={formatDate(order.expiresAt)} />}
                    </div>

                    {(order.failedAt || order.failedReason || order.status === 'failed') && (
                        <div className={`space-y-4 p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl transition-all duration-700 delay-500 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500">Informations d'échec</h3>
                            {order.failedAt && <InfoField label="Échouée le" value={formatDate(order.failedAt)} />}
                            {order.failedReason && <InfoField label="Raison de l'échec" value={order.failedReason} />}
                        </div>
                    )}
                    
                    <div className="pb-10"></div>
                </main>
            </div>
        </div>
    );
}

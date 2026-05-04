"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import DashboardHeader from '@/components/DashboardHeader';

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function PaymentSuccessPage({ searchParams }: Props) {
    // Unwrap searchParams Promise with React.use()
    const params = use(searchParams);

    // États locaux pour le statut et les données de commande
    const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
    const [orderData, setOrderData] = useState<any>(null);

    // Ref pour éviter le double appel (React Strict Mode + Navigation)
    const hasTriggered = React.useRef(false);

    // Effet pour vérifier le paiement une seule fois au chargement
    useEffect(() => {
        const verifyPayment = async () => {
            if (hasTriggered.current) return;
            hasTriggered.current = true;

            // Extraction des paramètres
            const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            const getP = (key: string) => urlParams.get(key) || (params[key] as string);
            const getAllP = (key: string) => {
                const urlList = urlParams.getAll(key);
                if (urlList.length > 0) return urlList;
                const p = params[key];
                return Array.isArray(p) ? p : (p ? [p] : []);
            };

            const urlStatus = (getP('status') || getP('payment'))?.toLowerCase();
            const refId = getP('referenceId');
            const orderIds = getAllP('orderId');
            const pId = getP('payment_id');

            const isExplicitFailure = urlStatus === 'failed' || urlStatus === 'cancelled' || urlStatus === 'rejected';
            const internalOrderId = refId || (orderIds.length > 0 ? orderIds[0] : null);
            const bzkOrderId = orderIds.length > 1 ? orderIds[1] : (orderIds.length > 0 ? orderIds[0] : null);

            if (isExplicitFailure) {
                setVerificationStatus('failed');
                return;
            }

            try {
                let statusFound: 'loading' | 'success' | 'failed' | 'pending' = 'loading';
                let responseData: any = null;

                const provider = getP('provider')?.toLowerCase();

                // 1. Lemon Squeezy
                if (provider === 'lemonsqueezy') {
                    const lsOrderId = getP('ls_order_id');
                    const res = await fetch('/api/lemonsqueezy/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            orderId: internalOrderId,
                            lsOrderId: lsOrderId
                        }),
                    });
                    responseData = await res.json();
                    const lsStatus = responseData.status?.toLowerCase();
                    
                    if (lsStatus === 'paid' || lsStatus === 'success' || lsStatus === 'completed') {
                        statusFound = 'success';
                    } else if (lsStatus === 'failed' || lsStatus === 'failed_api') {
                        statusFound = 'failed';
                    } else {
                        statusFound = 'pending';
                    }
                }
                // 2. Dodo Payments
                else if (pId) {
                    const res = await fetch('/api/dodo/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paymentId: pId, orderId: internalOrderId }),
                    });
                    responseData = await res.json();
                    const dStatus = responseData.status?.toLowerCase();
                    
                    if (dStatus === 'succeeded' || dStatus === 'completed' || dStatus === 'success' || dStatus === 'active') {
                        statusFound = 'success';
                    } else if (dStatus === 'failed' || dStatus === 'cancelled' || dStatus === 'rejected') {
                        statusFound = 'failed';
                    } else {
                        statusFound = 'pending';
                    }
                } 
                // 3. Bazik / Moncash
                else if (internalOrderId || bzkOrderId || refId) {
                    const res = await fetch('/api/bazik/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: internalOrderId || bzkOrderId,
                            bzkOrderId: bzkOrderId
                        }),
                    });
                    responseData = await res.json();
                    const bStatus = responseData.status?.toLowerCase();
                    if (bStatus === 'succeeded' || bStatus === 'success' || bStatus === 'completed') {
                        statusFound = 'success';
                    } else if (bStatus === 'failed' || bStatus === 'cancelled' || bStatus === 'rejected') {
                        statusFound = 'failed';
                    } else {
                        statusFound = 'pending';
                    }
                }

                if (statusFound !== 'loading') {
                    setVerificationStatus(statusFound);
                    if (responseData?.order) setOrderData(responseData.order);
                } else {
                    setVerificationStatus('pending');
                }
            } catch (error) {
                console.error("Verification error:", error);
                setVerificationStatus('failed');
            }
        };

        verifyPayment();
    }, []);

    // Valeurs d'affichage (priorité aux données vérifiées de la DB, sinon URL)
    const displayAmount = orderData && typeof orderData.amount === 'number' 
        ? orderData.amount.toFixed(2) 
        : (typeof params?.amount === 'string' ? params.amount : '0.00');

    const displayCurrency = orderData?.currency 
        ? orderData.currency.toUpperCase() 
        : (typeof params?.currency === 'string' ? params.currency : 'USD');

    const displayTitle = orderData?.productTitle || (typeof params?.title === 'string' ? params.title : "Accès Contenu Numérique");
    
    const displayOrderId = orderData?.id || (params && Array.isArray(params.orderId) ? params.orderId[0] : (params && typeof params.orderId === 'string' ? params.orderId : '#PENDING'));

    // Contenu dynamique selon le statut
    const getStatusContent = () => {
        switch (verificationStatus) {
            case 'success':
                return {
                    icon: 'check_circle',
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10',
                    title: 'Paiement Réussi !',
                    message: 'Merci pour votre achat ! Votre contenu est maintenant disponible dans votre bibliothèque.'
                };
            case 'failed':
                return {
                    icon: 'error',
                    color: 'text-red-500',
                    bg: 'bg-red-500/10',
                    title: 'Échec du Paiement',
                    message: 'Le paiement n\'a pas pu être validé. Veuillez réessayer ou contacter le support.'
                };
            case 'pending':
                return {
                    icon: 'hourglass_top',
                    color: 'text-orange-500',
                    bg: 'bg-orange-500/10',
                    title: 'Paiement en Attente',
                    message: 'Votre paiement est en cours de traitement. Vous recevrez une confirmation dès validation.'
                };
            default: // loading
                return {
                    icon: 'refresh',
                    color: 'text-yellow-500',
                    bg: 'bg-yellow-500/10',
                    title: 'Vérification en cours...',
                    message: 'Veuillez patienter pendant que nous confirmons la transaction.'
                };
        }
    };

    const statusContent = getStatusContent();

    return (
        <div className="relative flex min-h-screen flex-col bg-background-light dark:bg-background-dark font-display text-primary transition-colors duration-300">
            {/* Dashboard Header */}
            <DashboardHeader />

            {/* Main Success Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <main className="w-full max-w-[500px] bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-black/5 dark:border-white/5 p-8 md:p-12 text-center">
                    {/* Success Icon */}
                    <div className="mb-8 flex justify-center">
                        <div className={`size-24 rounded-full flex items-center justify-center ${statusContent.bg}`}>
                            <span className={`material-symbols-outlined ${statusContent.color} text-5xl ${verificationStatus === 'loading' ? 'animate-spin' : ''}`}>
                                {statusContent.icon}
                            </span>
                        </div>
                    </div>

                    {/* Heading */}
                    <h1 className="text-primary dark:text-white text-3xl font-bold tracking-tight mb-3">
                        {statusContent.title}
                    </h1>
                    <p className="text-primary/60 dark:text-white/60 text-base leading-relaxed mb-10">
                        {statusContent.message}
                    </p>

                    {/* Order Summary */}
                    <div className="mb-10 text-left border-y border-black/5 dark:border-white/5 py-6">
                        <p className="text-[11px] uppercase tracking-widest font-bold text-primary/40 dark:text-white/40 mb-4">RÉSUMÉ DE LA COMMANDE</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-primary dark:text-white font-semibold text-base">{displayTitle}</p>
                                    <p className="text-primary/50 dark:text-white/40 text-sm">Accès Immédiat Débloqué</p>
                                </div>
                                <p className="text-primary dark:text-white font-bold text-lg">
                                    {displayCurrency === 'USD' ? '$' : ''}{displayAmount}{displayCurrency !== 'USD' ? ` ${displayCurrency}` : ''}
                                </p>
                            </div>
                            <div className="pt-4 flex justify-between items-center text-sm">
                                <span className="text-primary/50 dark:text-white/40">ID Commande</span>
                                <span className="text-primary dark:text-white font-mono break-all">{displayOrderId}</span>
                            </div>
                            {orderData?.transactionId && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-primary/50 dark:text-white/40">Transaction</span>
                                    <span className="text-primary dark:text-white font-mono break-all text-xs">{orderData.transactionId}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <Link href="/dashboard" className="w-full">
                            <button className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-base hover:opacity-90 transition-opacity">
                                Accéder au Tableau de Bord
                            </button>
                        </Link>
                        <Link href="/dashboard/transactions" className="w-full">
                            <button className="w-full h-14 bg-black/5 dark:bg-white/5 text-primary dark:text-white rounded-full font-bold text-base hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                Voir mes Transactions
                            </button>
                        </Link>
                    </div>

                    {/* Footer Details */}
                    <div className="mt-10">
                        <a href="mailto:contact@audiencetype.com" className="text-primary/40 dark:text-white/40 text-sm font-medium hover:text-primary dark:hover:text-white underline underline-offset-4 decoration-primary/20 transition-colors">
                            Besoin d'aide ? Contacter le support
                        </a>
                    </div>
                </main>
            </div>

            {/* Background Decoration */}
            <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/5 to-transparent -z-10 dark:hidden"></div>
        </div>
    );
}

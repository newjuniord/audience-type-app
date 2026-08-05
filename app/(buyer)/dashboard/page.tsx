"use client";

import { useState, useEffect } from "react";
import DashboardHero from "@/components/buyer/DashboardHero";
import { useAuth } from "@/context/AuthContext";
import { getEnrollmentsByUser, incrementEnrollmentDownloadCount } from "@/lib/enrollments";
import { getEbook } from "@/lib/ebooks";
import { Enrollment } from "@/lib/types";
import ServiceDetailsDrawer from "@/components/buyer/ServiceDetailsDrawer";
import { useRouter, useSearchParams } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Link from "next/link";

export default function Dashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [loading, setLoading] = useState(true);

    // Error Modal State
    const [errorModal, setErrorModal] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
    }>({
        isOpen: false,
        title: "",
        message: ""
    });

    const [selectedServiceEnrollment, setSelectedServiceEnrollment] = useState<Enrollment | null>(null);

    // ── Check payment success ──────────
    useEffect(() => {
        const isPaymentSuccess = searchParams.get("payment") === "success";

        if (isPaymentSuccess) {
            setPaymentSuccess(true);
            // Nettoyer l'URL sans rechargement
            const url = new URL(window.location.href);
            url.searchParams.delete("payment");
            url.searchParams.delete("_at");
            window.history.replaceState({}, "", url.toString());
            // Masquer le toast après 5s
            setTimeout(() => setPaymentSuccess(false), 5000);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const fetchEnrollments = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const userEnrollments = await getEnrollmentsByUser(user.uid);
                setEnrollments(userEnrollments);
            } catch (error) {
                console.error("Failed to fetch enrollments", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEnrollments();
    }, [user]);

    const handleProductClick = async (enrollment: Enrollment) => {
        if (enrollment.productType.toLowerCase().includes('ebook')) {
            // Ebook Logic
            try {
                // 1. Fetch File URL from Product Table dynamically
                if (enrollment.productId) {
                    const productId = typeof enrollment.productId === 'object' ? (enrollment.productId as any).id : enrollment.productId;
                    
                    const ebook = await getEbook(productId);
                    if (!ebook || !ebook.fileUrl) {
                        throw new Error("Impossible de trouver le fichier de l'ebook.");
                    }

                    // Ouvrir le lien dans un nouvel onglet
                    window.open(ebook.fileUrl, '_blank');

                    if (enrollment.id) {
                        await incrementEnrollmentDownloadCount(enrollment.id);
                        // Update local state instantly so the counter goes up
                        setEnrollments(prev => prev.map(e => 
                            e.id === enrollment.id 
                                ? { ...e, downloadCount: (parseInt(e.downloadCount || "0") + 1).toString() } 
                                : e
                        ));
                    }
                }
            } catch (error) {
                console.error("Error handling ebook click", error);
                setErrorModal({
                    isOpen: true,
                    title: "Erè",
                    message: "Gen yon erè ki rive pandan telechajman an. Tanpri eseye ankò pita."
                });
            }
        } else if (enrollment.productType.toLowerCase().includes('course')) {
            // Course Logic
            if (enrollment.productId) {
                const courseId = typeof enrollment.productId === 'string' 
                    ? enrollment.productId 
                    : (enrollment.productId as any).id;
                router.push(`/course/${courseId}`);
            }
        } else {
            // Service / Other Logic
            setSelectedServiceEnrollment(enrollment);
        }
    };

    const filteredEnrollments = enrollments;

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark text-primary dark:text-white">

            {/* Toast paiement réussi */}
            {paymentSuccess && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl shadow-emerald-500/30 font-bold text-sm">
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        Peman ou an konfime ! Mèsi 🎉
                    </div>
                </div>
            )}
            <div className="layout-container flex h-full grow flex-col">
                <main className="px-6 md:px-10 flex flex-1 justify-center py-10">
                    <div className="layout-content-container flex flex-col max-w-[1200px] flex-1">
                        <DashboardHero />

                        {/* Dynamic Grid */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-64 bg-black/5 dark:bg-white/5 rounded-3xl animate-pulse"></div>
                                ))}
                            </div>
                        ) : filteredEnrollments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                                <span className="material-symbols-outlined text-6xl mb-4">folder_open</span>
                                <h3 className="text-xl font-bold"><span>Nou pa jwenn okenn pwodwi</span></h3>
                                <p className="text-sm mt-2"><span>Ou pa gen okenn pwodwi nan kategori sa a ankò.</span></p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
                                {filteredEnrollments.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            if (!item.productType.toLowerCase().includes('ebook')) {
                                                handleProductClick(item);
                                            }
                                        }}
                                        className={`group relative bg-white dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/10 overflow-hidden hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5 hover:border-black/10 dark:hover:border-white/20 transition-all flex flex-col h-full ${!item.productType.toLowerCase().includes('ebook') ? 'cursor-pointer' : ''}`}
                                    >
                                        {/* Thumbnail */}
                                        <div className="aspect-[4/3] bg-black/5 dark:bg-white/5 relative overflow-hidden">
                                            {item.productThumbnailUrl ? (
                                                <img
                                                    src={item.productThumbnailUrl}
                                                    alt={item.productTitle}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-4xl opacity-20">image</span>
                                                </div>
                                            )}

                                            {/* Type Badge */}
                                            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-md text-[10px] font-black uppercase tracking-widest shadow-lg">
                                                <span>{item.productType}</span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 flex flex-col flex-1">
                                            <h3 className="text-lg font-bold leading-tight mb-2 group-hover:text-primary dark:group-hover:text-white transition-colors">
                                                <span>{item.productTitle}</span>
                                            </h3>

                                            <div className="mt-auto pt-4 flex items-center justify-between border-t border-black/5 dark:border-white/5">
                                                {item.productType.toLowerCase().includes('course') ? (
                                                    <div className="flex flex-col w-full gap-2">
                                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider opacity-60">
                                                            <span>Pwogrè</span>
                                                            <span>{item.progress || 0}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary" style={{ width: `${item.progress || 0}%` }}></div>
                                                        </div>
                                                    </div>
                                                ) : item.productType.toLowerCase().includes('ebook') ? (
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/read/${typeof item.productId === 'object' ? (item.productId as any).id : item.productId}`); }}
                                                            className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">menu_book</span>
                                                            <span>Li</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleProductClick(item); }}
                                                            className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">download</span>
                                                            <span>Telechaje</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center gap-2 cursor-pointer">
                                                        <span className="material-symbols-outlined text-sm notranslate">calendar_month</span>
                                                        <span>Detay</span>
                                                    </span>
                                                )}

                                                {item.productType.toLowerCase().includes('ebook') && item.downloadCount !== undefined && (
                                                    <span className="text-[10px] opacity-40">
                                                        <span>{item.downloadCount}</span> <span>telechajman</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}


                    </div>
                </main>
                <ServiceDetailsDrawer
                    isOpen={!!selectedServiceEnrollment}
                    onClose={() => setSelectedServiceEnrollment(null)}
                    enrollment={selectedServiceEnrollment}
                />

                <ConfirmModal
                    isOpen={errorModal.isOpen}
                    onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                    title={errorModal.title}
                    message={errorModal.message}
                    type="alert"
                />
            </div>
        </div>
    );
}

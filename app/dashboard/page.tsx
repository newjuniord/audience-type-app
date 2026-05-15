"use client";

import { useState, useEffect } from "react";
import DashboardHero from "@/components/DashboardHero";
import FilterBar from "@/components/FilterBar";
import { useAuth } from "@/context/AuthContext";
import { getEnrollmentsByUser, incrementEnrollmentDownloadCount } from "@/lib/enrollments";
import { Enrollment } from "@/lib/types";
import { doc, getDoc, DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ServiceDetailsDrawer from "@/components/ServiceDetailsDrawer";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Link from "next/link";

export default function Dashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [activeFilter, setActiveFilter] = useState("Tous");
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
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

    useEffect(() => {
        const fetchEnrollments = async () => {
            // Si on n'a pas encore d'utilisateur, on attend (le chargement continue)
            if (!user) return;

            try {
                // On passe directement l'UID (string) c'est plus sûr et plus rapide
                const data = await getEnrollmentsByUser(user.uid);
                setEnrollments(data);
            } catch (error) {
                console.error("Failed to fetch enrollments", error);
            } finally {
                // Quoi qu'il arrive, on arrête le spinner de chargement
                setLoading(false);
            }
        };

        fetchEnrollments();
    }, [user]);

    const handleProductClick = async (enrollment: Enrollment) => {
        if (enrollment.productType.toLowerCase().includes('ebook')) {
            // Ebook Logic
            try {
                // 1. Fetch File URL from Product Doc
                if (enrollment.productId) {
                    let productDocRef: DocumentReference;
                    
                    if (typeof enrollment.productId === 'string') {
                        // Si c'est un string, on doit reconstruire la référence
                        let collectionName = "courses";
                        const type = enrollment.productType.toLowerCase();
                        if (type.includes('ebook')) collectionName = "ebooks";
                        else if (type.includes('service') || type.includes('booking')) collectionName = "services";
                        
                        productDocRef = doc(db, collectionName, enrollment.productId);
                    } else {
                        // C'est déjà une référence
                        productDocRef = enrollment.productId;
                    }

                    const productDoc = await getDoc(productDocRef);
                    if (productDoc.exists()) {
                        const productData = productDoc.data();
                        if (productData.fileUrl) {
                            // On incrémente seulement si le fichier est réellement disponible
                            if (enrollment.id) {
                                await incrementEnrollmentDownloadCount(enrollment.id);
                            }
                            window.open(productData.fileUrl, '_blank');
                        } else {
                            setErrorModal({
                                isOpen: true,
                                title: "Fichier non disponible",
                                message: (
                                    <>
                                        Le fichier n'est pas disponible pour le moment. 
                                        Veuillez <Link href="/support" className="text-primary dark:text-white font-bold underline">contacter le support</Link> si vous avez besoin d'aide.
                                    </>
                                )
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Error handling ebook click", error);
                setErrorModal({
                    isOpen: true,
                    title: "Erreur",
                    message: "Une erreur est survenue lors du téléchargement. Veuillez réessayer plus tard."
                });
            }
        } else if (enrollment.productType.toLowerCase().includes('course')) {
            // Course Logic
            if (enrollment.productId) {
                const courseId = typeof enrollment.productId === 'string' 
                    ? enrollment.productId 
                    : enrollment.productId.id;
                router.push(`/course/${courseId}`);
            }
        } else {
            // Service / Other Logic
            setSelectedServiceEnrollment(enrollment);
        }
    };

    // Filter Logic
    const filteredEnrollments = enrollments.filter(item => {
        if (activeFilter === "Tous") return true;
        if (activeFilter === "Cours") return item.productType.toLowerCase().includes('course');
        if (activeFilter === "Ebooks") return item.productType.toLowerCase().includes('ebook');
        if (activeFilter === "Réservations") return !item.productType.toLowerCase().includes('course') && !item.productType.toLowerCase().includes('ebook');
        return true;
    });

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark text-primary dark:text-white">
            <div className="layout-container flex h-full grow flex-col">
                <main className="px-6 md:px-10 flex flex-1 justify-center py-10">
                    <div className="layout-content-container flex flex-col max-w-[1200px] flex-1">
                        <DashboardHero />
                        <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />

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
                                <h3 className="text-xl font-bold"><span>Aucun produit trouvé</span></h3>
                                <p className="text-sm mt-2"><span>Vous n'avez pas encore de produits dans cette catégorie.</span></p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
                                {filteredEnrollments.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleProductClick(item)}
                                        className="group relative bg-white dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/10 overflow-hidden hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5 hover:border-black/10 dark:hover:border-white/20 transition-all cursor-pointer flex flex-col h-full"
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
                                                            <span>Progression</span>
                                                            <span>{item.progress || 0}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary" style={{ width: `${item.progress || 0}%` }}></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-sm notranslate">
                                                            {item.productType.toLowerCase().includes('ebook') ? 'download' : 'calendar_month'}
                                                        </span>
                                                        <span>{item.productType.toLowerCase().includes('ebook') ? 'Télécharger' : 'Détails'}</span>
                                                    </span>
                                                )}

                                                {item.productType.toLowerCase().includes('ebook') && item.downloadCount !== undefined && (
                                                    <span className="text-[10px] opacity-40">
                                                        <span>{item.downloadCount}</span> <span>downloads</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Discover More Section */}
                        <div className="mt-12 mb-20 p-8 md:p-12 bg-primary dark:bg-white rounded-[3rem] text-white dark:text-primary relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 dark:bg-black/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-transform duration-700 group-hover:scale-110"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="text-center md:text-left">
                                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic mb-3"><span>Envie d'aller plus loin ?</span></h2>
                                    <p className="text-sm md:text-base opacity-80 max-w-md"><span>Découvrez notre catalogue complet. De nouveaux cours, ebooks et services sont disponibles pour vous.</span></p>
                                </div>
                                <button
                                    onClick={() => router.push('/products')}
                                    className="h-14 px-10 bg-white dark:bg-primary text-primary dark:text-white font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10 dark:shadow-white/5"
                                >
                                    <span>Voir les produits</span>
                                </button>
                            </div>
                        </div>
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

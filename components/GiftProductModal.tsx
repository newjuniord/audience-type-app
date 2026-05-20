"use client";

import { useState, useEffect } from "react";
import { User, Course, Ebook } from "@/lib/types";
import { getCourses } from "@/lib/courses";
import { getEbooks } from "@/lib/ebooks";
import { createEnrollment } from "@/lib/enrollments";
import { Timestamp, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ConfirmModal from "./ui/ConfirmModal";
import { sendGiftNotification } from "@/app/actions/notify";

interface GiftProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

type Product = {
    id: string;
    title: string;
    thumbnailUrl?: string; // Courses use imageUrl, Ebooks use coverUrl. We'll normalize.
    type: 'course' | 'ebook';
};

export default function GiftProductModal({ isOpen, onClose, user }: GiftProductModalProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [granting, setGranting] = useState(false);
    const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            setSelectedProductId("");
        }
    }, [isOpen]);

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const [courses, ebooks] = await Promise.all([getCourses(), getEbooks()]);

            const formattedCourses: Product[] = courses.map(c => ({
                id: c.id!,
                title: c.title,
                thumbnailUrl: c.thumbnail,
                type: 'course'
            }));

            const formattedEbooks: Product[] = ebooks.map(e => ({
                id: e.id!,
                title: e.title,
                thumbnailUrl: e.coverImage,
                type: 'ebook'
            }));

            setProducts([...formattedCourses, ...formattedEbooks]);
        } catch (error) {
            console.error("Failed to fetch products for gifting", error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleGrantAccess = async () => {
        if (!user || !selectedProductId) return;

        setGranting(true);
        try {
            const product = products.find(p => p.id === selectedProductId);
            if (!product) return;

            // Create references
            const userRef = doc(db, "users", user.uid);
            const productCollection = product.type === 'course' ? 'courses' : 'ebooks';
            const productRef = doc(db, productCollection, product.id);

            // Send direct WhatsApp notification if they have a WhatsApp number
            const targetPhone = user.whatsappNumber || user.phoneNumber;
            let notificationSent = false;
            if (targetPhone) {
                try {
                    const res = await sendGiftNotification(
                        user.uid,
                        targetPhone,
                        user.displayName || user.fullName || "Cher(e) membre",
                        product.title
                    );
                    if (res?.success) {
                        notificationSent = true;
                    }
                } catch (notifyErr) {
                    console.error("Failed to send WhatsApp gift notification directly:", notifyErr);
                }
            }

            await createEnrollment({
                userId: userRef,
                productId: productRef,
                productType: product.type === 'course' ? 'Course' : 'Ebook',
                accessGranted: true,
                enrolledAt: Timestamp.now(),
                status: 'active',
                progress: 0,
                completedLessons: [],
                currentLessonId: '',
                lastAccessedAt: Timestamp.now(),
                productTitle: product.title,
                productThumbnailUrl: product.thumbnailUrl || "",
                totalLessons: 0, // Default or fetch if needed
                userEmail: user.email || "",
                userName: user.displayName || "",
                downloadCount: "0",
                isGift: true,
                orderId: "admin_gift",
                notificationSent: notificationSent
            } as any);

            setSuccessModal({
                isOpen: true,
                message: `Accès accordé à ${product.title} pour ${user.displayName || user.email}`
            });
            
        } catch (error) {
            console.error("Failed to grant access", error);
            alert("Erreur lors de l'attribution du cadeau.");
            setGranting(false); // only reset on error, on success we keep loading state or let the modal handle it
        }
    };

    const handleSuccessClose = () => {
        setSuccessModal({ isOpen: false, message: "" });
        setGranting(false);
        onClose();
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-black/5 dark:border-white/10">
                <h2 className="text-2xl font-bold mb-2">Offrir un produit</h2>
                <p className="text-black/60 dark:text-white/60 mb-6 text-sm">
                    Donner accès gratuitement à un cours ou un ebook à <span className="font-bold text-primary dark:text-white">{user.displayName || user.email}</span>.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-black/40 dark:text-white/40 mb-2">
                            Sélectionner un produit
                        </label>
                        {loadingProducts ? (
                            <div className="h-12 w-full bg-black/5 dark:bg-white/5 rounded-xl animate-pulse"></div>
                        ) : (
                            <select
                                className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                            >
                                <option value="">-- Choisir un cours ou un ebook --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.type === 'course' ? '🎓' : '📚'} {p.title}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleGrantAccess}
                        disabled={!selectedProductId || granting}
                        className="px-8 py-3 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {granting ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <span className="material-symbols-outlined text-sm">redeem</span>
                        )}
                        <span>Donner l'accès</span>
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={successModal.isOpen}
                onClose={handleSuccessClose}
                title="Succès"
                message={successModal.message}
                type="alert"
                confirmText="Fermer"
            />
        </div>
    );
}

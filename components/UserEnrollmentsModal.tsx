"use client";

import { useState, useEffect } from "react";
import { User, Enrollment } from "@/lib/types";
import { getEnrollmentsByUser, deleteEnrollment } from "@/lib/enrollments";
import ConfirmModal from "./ui/ConfirmModal";

interface UserEnrollmentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export default function UserEnrollmentsModal({ isOpen, onClose, user }: UserEnrollmentsModalProps) {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [confirmRevoke, setConfirmRevoke] = useState<{ isOpen: boolean; enrollmentId: string | null; title: string }>({
        isOpen: false,
        enrollmentId: null,
        title: ""
    });

    useEffect(() => {
        if (isOpen && user) {
            fetchUserEnrollments();
        }
    }, [isOpen, user]);

    const fetchUserEnrollments = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const list = await getEnrollmentsByUser(user.uid);
            setEnrollments(list);
        } catch (error) {
            console.error("Failed to fetch user enrollments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeClick = (id: string, title: string) => {
        setConfirmRevoke({
            isOpen: true,
            enrollmentId: id,
            title
        });
    };

    const handleRevokeConfirm = async () => {
        const id = confirmRevoke.enrollmentId;
        if (!id) return;

        setConfirmRevoke({ isOpen: false, enrollmentId: null, title: "" });
        setRevokingId(id);
        try {
            await deleteEnrollment(id);
            // Refresh list
            setEnrollments(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error("Failed to revoke access:", error);
            alert("Erreur lors du retrait de l'accès.");
        } finally {
            setRevokingId(null);
        }
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return "";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] w-full max-w-lg p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-black/5 dark:border-white/10 text-gray-900 dark:text-white flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold">Inscriptions & Accès</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Liste des cours et ebooks accessibles par <span className="font-semibold text-primary dark:text-white">{user.displayName || user.email}</span>.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* Enrollment list */}
                <div className="flex-1 overflow-y-auto my-4 pr-1 min-h-[200px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-gray-500">Chargement des inscriptions...</span>
                        </div>
                    ) : enrollments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 dark:text-gray-500">
                            <span className="material-symbols-outlined text-5xl mb-2">auto_stories</span>
                            <p className="text-sm font-semibold">Aucun accès actif</p>
                            <p className="text-xs mt-1 max-w-[250px]">Cet étudiant n'a pas encore de cours ou d'ebooks à son actif.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {enrollments.map((item) => {
                                const isCourse = item.productType === "Course";
                                return (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-2xl gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                {item.productThumbnailUrl ? (
                                                    <img src={item.productThumbnailUrl} alt={item.productTitle} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-lg text-gray-500">
                                                        {isCourse ? "school" : "book"}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold truncate">{item.productTitle}</h4>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                                        isCourse ? "bg-indigo-500/10 text-indigo-500" : "bg-blue-500/10 text-blue-500"
                                                    }`}>
                                                        {isCourse ? "Cours" : "Ebook"}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        Attribué le {formatTimestamp(item.enrolledAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {isCourse && (
                                                <div className="text-right">
                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{item.progress || 0}%</span>
                                                    <span className="text-[9px] block text-gray-400">Progression</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleRevokeClick(item.id!, item.productTitle)}
                                                disabled={revokingId === item.id}
                                                className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-50"
                                                title="Retirer l'accès"
                                            >
                                                {revokingId === item.id ? (
                                                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-base">no_accounts</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/5 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmRevoke.isOpen}
                onClose={() => setConfirmRevoke({ isOpen: false, enrollmentId: null, title: "" })}
                onConfirm={handleRevokeConfirm}
                title="Retirer l'accès ?"
                message={`Êtes-vous sûr de vouloir retirer l'accès de l'étudiant au produit "${confirmRevoke.title}" ?`}
                confirmText="Oui, retirer"
                cancelText="Annuler"
                isDanger={true}
            />
        </div>
    );
}

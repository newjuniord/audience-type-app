"use client";

import { useEffect, useState } from "react";
import { Enrollment } from "@/lib/types";

interface ServiceDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    enrollment: Enrollment | null;
}

export default function ServiceDetailsDrawer({ isOpen, onClose, enrollment }: ServiceDetailsDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] transition-all duration-700 overflow-hidden ${isOpen ? 'visible' : 'invisible delay-700'}`}>
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[2px] transition-opacity duration-700 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`absolute top-0 right-0 h-full w-full max-w-[500px] bg-white dark:bg-background-dark shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-none flex flex-col transform transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
            >
                {/* Header */}
                <div className={`px-8 py-8 border-b border-black/5 dark:border-white/5 transition-all duration-700 delay-100 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">{enrollment?.productTitle || "Detay Sèvis la"}</h2>
                            <p className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mt-1">
                                {enrollment?.enrolledAt ? `Enskri nan dat ${enrollment.enrolledAt.toDate().toLocaleDateString()}` : 'Sèvis Aktif'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group"
                        >
                            <span className="material-symbols-outlined text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar transition-all duration-700 delay-200 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${enrollment?.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                enrollment?.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                            {enrollment?.status === 'active' ? 'Aktif' : enrollment?.status === 'completed' ? 'Fini' : enrollment?.status || 'Estati Enkoni'}
                        </span>
                        <span className="text-xs text-black/40 dark:text-white/40 font-medium ml-auto">
                            ID: {enrollment?.id}
                        </span>
                    </div>

                    {/* Image */}
                    {enrollment?.productThumbnailUrl && (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5">
                            <img
                                src={enrollment.productThumbnailUrl}
                                alt={enrollment.productTitle}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Description / Info Placeholder */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase text-black/40 dark:text-white/40 tracking-widest">Konsènan Sèvis sa a</h3>
                        <p className="text-sm leading-relaxed text-black/60 dark:text-white/60">
                            Sa a se yon sèvis aktif ou enskri. Tanpri kontakte sipò a si w bezwen planifye yon sesyon oswa si w gen kesyon sou sèvis ou a.
                        </p>
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase text-black/40 dark:text-white/40 tracking-widest">Sa ki enkli</h3>
                        {/* We don't have includedItems on enrollment object directly, would need to fetch product doc. 
                             For now, showing generic info or we can fetch. */}
                        <div className="bg-black/[0.03] dark:bg-white/[0.03] p-4 rounded-2xl">
                            <p className="text-xs font-medium text-black/50 dark:text-white/50 italic">
                                Detay presi sou sa ki enkli yo disponib sou paj sèvis la.
                            </p>
                        </div>
                    </div>


                </div>

                {/* Footer Actions */}
                <div className={`px-8 py-8 border-t border-black/5 dark:border-white/5 bg-white dark:bg-background-dark transition-all duration-700 delay-500 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <button
                        onClick={onClose}
                        className="w-full py-5 bg-black/5 dark:bg-white/10 text-black dark:text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/20 transition-all"
                    >
                        Fèmen detay yo
                    </button>
                </div>
            </div>
        </div>
    );
}

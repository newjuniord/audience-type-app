"use client";

import { useEffect, useState } from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => Promise<void> | void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    isLoading?: boolean;
    image?: string;
    type?: 'confirm' | 'alert'; // 'confirm' has 2 buttons, 'alert' has 1 (OK)
    showIcon?: boolean;
    showReferenceInput?: boolean;
    referenceValue?: string;
    onReferenceChange?: (value: string) => void;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    isDanger = false,
    isLoading = false,
    image,
    type = 'confirm',
    showIcon = true,
    showReferenceInput = false,
    referenceValue = "",
    onReferenceChange
}: ConfirmModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm"
                onClick={() => !isLoading && onClose()}
            />

            {/* Modal Content */}
            <div className={`bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl shadow-black/10 w-full max-w-md relative overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                <div className="p-8 text-center">
                    {/* Icon */}
                    {showIcon && (
                        <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isDanger
                            ? 'bg-red-50 text-red-500'
                            : 'bg-black/5 dark:bg-white/5 text-primary dark:text-white'
                            }`}>
                            <span className="material-symbols-outlined text-3xl">
                                {isDanger ? 'warning' : 'info'}
                            </span>
                        </div>
                    )}

                    {image && (
                        <div className="mb-6 flex justify-center">
                            <img src={image} alt="Logo" className="h-20 w-20 object-contain rounded-2xl shadow-lg" />
                        </div>
                    )}

                    <h3 className="text-2xl font-black text-primary dark:text-white mb-2">{title}</h3>
                    <p className={`text-black/50 dark:text-white/50 text-sm font-medium leading-relaxed ${showReferenceInput ? 'mb-6' : 'mb-8'}`}>
                        {message}
                    </p>

                    {showReferenceInput && (
                        <div className="mb-8 group">
                            <label className="block text-left text-[10px] font-black uppercase tracking-widest text-primary/40 dark:text-white/40 mb-2 ml-1">
                                Code de référence (Optionnel)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={referenceValue}
                                    onChange={(e) => onReferenceChange?.(e.target.value)}
                                    placeholder="Entrez votre code..."
                                    className="w-full h-12 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-white/20 transition-all placeholder:text-black/20 dark:placeholder:text-white/20"
                                />
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 dark:text-white/20 text-lg">
                                    tag
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        {type === 'confirm' && (
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 h-12 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-primary dark:text-white rounded-xl font-bold text-sm transition-colors"
                            >
                                {cancelText}
                            </button>
                        )}

                        <button
                            onClick={async () => {
                                if (onConfirm) {
                                    await onConfirm();
                                } else {
                                    onClose();
                                }
                            }}
                            disabled={isLoading}
                            className={`flex-1 h-12 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${type === 'alert'
                                ? 'bg-black dark:bg-white text-white dark:text-primary hover:opacity-90'
                                : isDanger
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-primary hover:bg-primary/90 text-white'
                                }`}
                        >
                            {isLoading ? (
                                <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                            ) : (
                                <>
                                    {type === 'confirm' && (
                                        <span className="material-symbols-outlined text-lg">
                                            {isDanger ? 'delete' : 'check'}
                                        </span>
                                    )}
                                    {type === 'alert' ? 'OK' : confirmText}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


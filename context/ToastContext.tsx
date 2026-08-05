"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
    showToast: () => {},
});

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast() {
    return useContext(ToastContext);
}

// ─── Icons per type ──────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { icon: string; bar: string; iconColor: string; bg: string; border: string }> = {
    success: {
        icon: "check_circle",
        bar: "bg-green-500",
        iconColor: "text-green-400",
        bg: "bg-[#0f1a0f]",
        border: "border-green-500/30",
    },
    error: {
        icon: "cancel",
        bar: "bg-red-500",
        iconColor: "text-red-400",
        bg: "bg-[#1a0f0f]",
        border: "border-red-500/30",
    },
    warning: {
        icon: "warning",
        bar: "bg-yellow-500",
        iconColor: "text-yellow-400",
        bg: "bg-[#1a180f]",
        border: "border-yellow-500/30",
    },
    info: {
        icon: "info",
        bar: "bg-primary",
        iconColor: "text-primary",
        bg: "bg-[#0f1018]",
        border: "border-primary/30",
    },
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        clearTimeout(timers.current[id]);
        delete timers.current[id];
    }, []);

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setToasts(prev => [...prev.slice(-4), { id, message, type }]);
        timers.current[id] = setTimeout(() => removeToast(id), 4000);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* ── Toast Container ── */}
            <div
                aria-live="polite"
                aria-atomic="false"
                className="fixed bottom-6 right-4 z-[9999] flex flex-col items-end gap-3 pointer-events-none"
                style={{ maxWidth: "calc(100vw - 2rem)" }}
            >
                {toasts.map((toast) => {
                    const cfg = TOAST_CONFIG[toast.type];
                    return (
                        <div
                            key={toast.id}
                            role="alert"
                            className={`
                                pointer-events-auto
                                relative flex items-center gap-3
                                min-w-[280px] max-w-[380px]
                                px-4 py-3.5
                                rounded-2xl
                                border ${cfg.border}
                                ${cfg.bg}
                                shadow-2xl shadow-black/40
                                backdrop-blur-xl
                                overflow-hidden
                                animate-toast-in
                            `}
                        >
                            {/* Colored side bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cfg.bar} rounded-l-2xl`} />

                            {/* Icon */}
                            <span className={`material-symbols-outlined text-[22px] shrink-0 ${cfg.iconColor}`}>
                                {cfg.icon}
                            </span>

                            {/* Message */}
                            <p className="text-sm font-semibold text-white leading-snug flex-1 pr-1">
                                {toast.message}
                            </p>

                            {/* Close */}
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="shrink-0 text-white/30 hover:text-white/70 transition-colors ml-1"
                                aria-label="Fèmen"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

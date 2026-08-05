"use client";

import React, { useState, useRef } from "react";

export interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  iconEmoji?: string;
  children: React.ReactNode;
}

export function ActionModal({
  isOpen,
  onClose,
  title,
  subtitle,
  iconEmoji,
  children,
}: ActionModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  // État (et non ref) : la transition CSS dépend de cette valeur au rendu, et un ref
  // lu pendant le rendu ne déclenche pas de mise à jour.
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  // Réinitialisation à la fermeture. Fait pendant le rendu (motif React « ajuster l'état
  // quand une prop change ») plutôt que dans un effet : évite un rendu intermédiaire
  // où le modal réapparaîtrait avec la position de glissement précédente.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setIsClosing(false);
      setDragY(0);
    }
  }

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragY(0);
    }, 350);
  };

  // Swipe-to-dismiss handlers
  const onDragStart = (e: React.TouchEvent | React.PointerEvent) => {
    setIsDragging(true);
    dragStartY.current = "touches" in e ? e.touches[0].clientY : e.clientY;
  };
  
  const onDragMove = (e: React.TouchEvent | React.PointerEvent) => {
    if (!isDragging) return;
    const currentY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const delta = Math.max(0, currentY - dragStartY.current);
    setDragY(delta);
  };
  
  const onDragEnd = () => {
    setIsDragging(false);
    if (dragY > 80) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end lg:items-center justify-center p-0 lg:p-6 transition-colors duration-300 ${
        isClosing ? "bg-black/0 backdrop-blur-none" : "bg-black/70 backdrop-blur-sm"
      }`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full lg:max-w-lg bg-[#141414] border border-white/10 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-visible"
        style={{
          transform: isClosing
            ? "translateY(100%)"
            : dragY > 0
            ? `translateY(${dragY}px)`
            : "translateY(0)",
          opacity: isClosing ? 0 : dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : 1,
          transition: isDragging
            ? "none"
            : "transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.35s ease",
        }}
      >
        <style>{`
          @keyframes slideUpModal {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes fadeInModal {
            from { transform: translateY(30px) scale(0.97); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
        `}</style>

        {/* Handle bar — mobile: draggable, desktop: hidden */}
        <div
          className="flex justify-center pt-4 pb-2 lg:hidden cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
        >
          <div
            className="rounded-full bg-white/25 transition-all duration-150"
            style={{
              width: dragY > 20 ? "48px" : "40px",
              height: "4px",
              opacity: dragY > 0 ? 0.6 : 1,
            }}
          />
        </div>

        {/* Sur mobile c'est une feuille ancrée en bas : 92vh laisse voir le fond
            tout en évitant de faire défiler des formulaires courts. */}
        <div className="p-6 lg:p-8 overflow-y-auto max-h-[92vh] lg:max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              {iconEmoji && (
                <div className="size-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
                  <span className="text-xl">{iconEmoji}</span>
                </div>
              )}
              <div>
                <h2 className="text-lg lg:text-xl font-black text-white leading-tight">
                  {title}
                </h2>
                {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="hidden lg:flex size-8 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors shrink-0 ml-2"
            >
              <svg
                className="size-4 text-white/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          {children}
        </div>
      </div>
    </div>
  );
}

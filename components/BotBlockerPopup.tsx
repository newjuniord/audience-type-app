'use client';

import React from 'react';

interface BotBlockerPopupProps {
  timeLeft: number;
}

export default function BotBlockerPopup({ timeLeft }: BotBlockerPopupProps) {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#141414] p-8 rounded-3xl shadow-2xl max-w-md text-center border-2 border-red-500 mx-4 relative">

        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-black text-red-600 dark:text-red-500 mb-2">Activité suspecte détectée</h2>
        <p className="text-black/60 dark:text-white/60 mb-6 text-sm leading-relaxed">
          Votre comportement ressemble à celui d'un script automatisé. L'accès à la plateforme a été temporairement gelé par mesure de sécurité.
        </p>
        
        <div className="bg-red-500/10 p-4 rounded-xl font-mono text-3xl font-bold text-red-600 dark:text-red-500 tracking-wider border border-red-500/20 mb-2">
          {formatTime(timeLeft)}
        </div>
        
        <p className="text-xs text-black/40 dark:text-white/40 mt-4">
          Veuillez réessayer une fois le compte à rebours terminé.
        </p>
      </div>
    </div>
  );
}

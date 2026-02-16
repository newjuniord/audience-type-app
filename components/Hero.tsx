'use client';

import Link from "next/link";
import TypingAnimation from './TypingAnimation';

export default function Hero() {
    return (
        <section className="w-full max-w-[1200px] px-6 py-16 md:py-24 flex flex-col items-center text-center">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8">
                Élève ton niveau.<br />
                <TypingAnimation />
            </h1>
            <p className="text-lg md:text-xl font-normal max-w-2xl mb-12 text-primary/60 dark:text-white/60">
                Apprends facilement, gagne du temps et progresse vite avec nos cours, ebooks et services faits pour toi.
            </p>
            <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <Link href="/login" className="w-full flex items-center justify-center gap-3 bg-primary text-white dark:bg-white dark:text-black h-14 px-8 rounded-full font-bold text-lg hover:opacity-90 transition-all border border-transparent shadow-lg shadow-black/5">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="currentColor"></path>
                    </svg>
                    Commencer avec Google
                </Link>
                <p className="text-xs uppercase tracking-[0.2em] text-primary/40 dark:text-white/40 font-bold">Aucune carte de crédit requise</p>
            </div>
        </section>
    );
}

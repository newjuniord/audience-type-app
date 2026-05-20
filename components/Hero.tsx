'use client';

import TypingAnimation from './TypingAnimation';
import HomeVideo from './HomeVideo';
export default function Hero() {
    return (
        <section className="w-full max-w-[1200px] px-4 md:px-6 py-16 md:py-24 flex flex-col items-center text-center">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8">
                Élève ton niveau.<br />
                <TypingAnimation />
            </h1>
            <p className="text-lg md:text-xl font-normal max-w-2xl mb-12 text-primary/60 dark:text-white/60">
                Apprends facilement, gagne du temps et progresse vite avec nos cours, ebooks et consultations faits pour toi.
            </p>
            
            <HomeVideo />
        </section>
    );
}

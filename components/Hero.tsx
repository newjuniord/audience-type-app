'use client';

import TypingAnimation from './TypingAnimation';
import HomeVideo from './HomeVideo';
export default function Hero() {
    return (
        <section className="w-full max-w-[1200px] px-4 md:px-6 py-16 md:py-24 flex flex-col items-center text-center">
            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[1.0] mb-8 text-white max-w-4xl uppercase">
                Aprann sèvi ak IA<br />
                pou w ka sispann razè.
            </h1>
            <div className="text-xl md:text-2xl font-black tracking-widest uppercase text-primary mb-8 select-none">
                DJR AKADEMI / <TypingAnimation />
            </div>
            <p className="text-lg md:text-xl font-normal max-w-3xl mb-12 text-white/70 leading-relaxed">
                DJR Akademi fèt pou kreyatè kontni, antreprenè, pwofesyonèl, lidè, ak tout moun ki vle aprann pale pi byen, kreye pi byen, vann pi byen, epi konstwi yon lavi ki gen plis opòtinite.
            </p>
            
            <HomeVideo />
        </section>
    );
}

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 bg-background-dark text-white font-display relative overflow-hidden">
            {/* Background radial glow */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(242,140,40,0.05),transparent_60%)]" />

            <div className="relative z-10 w-full max-w-md bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-300">
                
                {/* 404 text with gold shimmer */}
                <h1 className="text-8xl font-black text-gold-shimmer mb-4 select-none">
                    404
                </h1>

                {/* Warning icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-primary text-3xl notranslate animate-bounce">
                        explore_off
                    </span>
                </div>

                <h2 className="text-xl font-extrabold text-white mb-2">
                    Woy! Paj sa a pa egziste.
                </h2>
                <p className="text-xs text-white/50 leading-relaxed mb-8">
                    Sanble paj w ap chèche a pa disponib, li chanje adrès, oswa li pa janm egziste.
                </p>

                {/* Back Home Button */}
                <Link
                    href="/"
                    className="w-full py-3.5 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-lg notranslate">home</span>
                    Retounen sou Paj Akèy
                </Link>
            </div>
        </div>
    );
}

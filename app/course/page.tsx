import CoursePlayerHeader from "@/components/CoursePlayerHeader";
import Syllabus from "@/components/Syllabus";
import Link from "next/link";

export default function CoursePlayerPage() {
    return (
        <div className="bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors duration-200 min-h-screen">
            <CoursePlayerHeader />

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Video Stage */}
                <section className="w-full mb-10">
                    <div className="relative group aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                        <div
                            className="absolute inset-0 w-full h-full bg-cover bg-center opacity-60"
                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDIfpr4LDrn2gbm4MnTEsHx33HMr71e92cFFenWzd6xNRttTcg10TNsfmEYQ4IO3Px2U4Ow-y60lnJFUUUEt-D2G-3RG5E9Jez4VUGIAQhvXyY_Rt4yaAgBs1YSP1I0ISxldKia6LK2D63ZhNseNRx4vUxJfRrh6gcn3fpnS7DMrYi64hPZghwr1rHn04Pi084A4BG8VJ6HG5geqDpWZ_R7bcY2OLD_xbLScL4fPl3Wywr4Cn4CtDLXgX2TdAAuGozuw-tekkErs_k')" }}
                        ></div>

                        {/* Play Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <button className="size-20 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                                <span className="material-symbols-outlined !text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                            </button>
                        </div>

                        {/* Video Controls Bottom */}
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="flex flex-col gap-3">
                                <div className="relative h-1 w-full bg-white/20 rounded-full cursor-pointer">
                                    <div className="absolute top-0 left-0 h-full w-1/3 bg-white rounded-full"></div>
                                    <div className="absolute top-1/2 left-1/3 -translate-y-1/2 size-3 bg-white rounded-full shadow-lg"></div>
                                </div>
                                <div className="flex items-center justify-between text-white text-xs font-medium">
                                    <div className="flex items-center gap-4">
                                        <span className="material-symbols-outlined cursor-pointer">play_arrow</span>
                                        <span className="material-symbols-outlined cursor-pointer">volume_up</span>
                                        <span>12:45 / 24:00</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="material-symbols-outlined cursor-pointer">settings</span>
                                        <span className="material-symbols-outlined cursor-pointer">fullscreen</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Lesson Info */}
                <section className="mb-12 border-b border-zinc-200 dark:border-zinc-800 pb-12">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-widest rounded text-zinc-500">Module 01</span>
                                <span className="text-zinc-400 text-xs">•</span>
                                <span className="text-zinc-400 text-xs font-medium">12 Minutes</span>
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight mb-4 text-primary dark:text-white">Les Fondamentaux du Minimalisme</h1>
                            <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                                Dans cette leçon, nous explorons les principes fondamentaux de la soustraction, de l'espace blanc et de l'intentionnalité dans les interfaces numériques. Apprenez pourquoi &quot;moins, c'est plus&quot; est plus qu'un simple cliché — c'est une exigence fonctionnelle pour l'UX moderne.
                            </p>
                            <div className="flex flex-wrap gap-4 mt-8">
                                <button className="flex items-center gap-2 bg-primary text-white dark:bg-white dark:text-black px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                                    <span className="material-symbols-outlined !text-lg">check_circle</span>
                                    Marquer comme terminé
                                </button>
                                <button className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 px-6 py-3 rounded-lg font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                    <span className="material-symbols-outlined !text-lg">download</span>
                                    Fichiers de ressources
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <Syllabus />

                {/* Footer */}
                <footer className="mt-24 pt-12 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6 pb-12">
                    <div className="flex items-center gap-2">
                        <div className="size-6 bg-primary dark:bg-white rounded flex items-center justify-center">
                            <span className="material-symbols-outlined !text-sm text-white dark:text-black">school</span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">DRJ Akademi</p>
                    </div>
                    <div className="flex items-center gap-8">
                        <Link className="text-xs font-bold text-zinc-500 hover:text-primary dark:hover:text-white transition-colors" href="#">Support</Link>
                        <Link className="text-xs font-bold text-zinc-500 hover:text-primary dark:hover:text-white transition-colors" href="#">Conditions</Link>
                        <Link className="text-xs font-bold text-zinc-500 hover:text-primary dark:hover:text-white transition-colors" href="#">Paramètres du compte</Link>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium">© 2026 DRJ Akademi.</p>
                </footer>
            </main>
        </div>
    );
}

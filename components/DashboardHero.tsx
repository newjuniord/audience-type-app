export default function DashboardHero() {
    return (
        <div className="flex flex-wrap justify-between items-end gap-6 mb-12">
            <div className="flex flex-col gap-2">
                <h1 className="text-primary dark:text-white text-5xl font-black leading-tight tracking-[-0.04em]">
                    Votre Bibliothèque
                </h1>
                <p className="text-primary/60 dark:text-white/60 text-lg font-normal max-w-md">
                    Bienvenue, Alex. Continuez là où vous vous étiez arrêté dans votre collection numérique.
                </p>
            </div>
            <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSeACEIPri1TLyfSepzlfcfmRSmgGUV_j_WIvw3ECUq1TAluyA/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-[160px] cursor-pointer items-center justify-center gap-2 rounded-full h-12 px-6 bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 hover:scale-105 active:scale-95"
            >
                <span className="material-symbols-outlined text-sm">person_add</span>
                <span className="text-sm font-bold tracking-tight">Demande d'affiliation</span>
            </a>
        </div>
    );
}

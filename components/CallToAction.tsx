export default function CallToAction() {
    return (
        <section className="w-full flex flex-col items-center py-32 bg-primary dark:bg-white text-white dark:text-black">
            <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter uppercase">Devenir partenaire</h2>
            <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSeACEIPri1TLyfSepzlfcfmRSmgGUV_j_WIvw3ECUq1TAluyA/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-black dark:bg-black dark:text-white px-12 h-16 rounded-full font-bold text-lg uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center"
            >
                Soumettre une demande d'affiliation
            </a>
        </section>
    );
}

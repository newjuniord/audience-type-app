import Link from "next/link";

export default function CallToAction() {
    return (
        <section className="w-full flex flex-col items-center py-32 bg-primary dark:bg-white text-white dark:text-black">
            <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter uppercase">Vin patnè nou</h2>
            <Link
                href="/support"
                className="bg-white text-black dark:bg-black dark:text-white px-12 h-16 rounded-full font-bold text-lg uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center"
            >
                Voye yon demand afilyasyon
            </Link>
        </section>
    );
}

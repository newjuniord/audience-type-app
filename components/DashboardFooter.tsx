import Link from "next/link";

export default function DashboardFooter() {
    return (
        <footer className="px-6 md:px-10 lg:px-40 py-10 border-t border-primary/5 dark:border-white/5 bg-white dark:bg-white/2">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-[1200px] mx-auto w-full">
                <p className="text-primary/40 dark:text-white/40 text-sm">© 2026 Audience Type. Tous droits réservés.</p>
                <div className="flex gap-8">
                    <Link href="/privacy" className="text-primary/40 dark:text-white/40 hover:text-primary dark:hover:text-white text-sm transition-colors">Politique de confidentialité</Link>
                    <Link href="/terms" className="text-primary/40 dark:text-white/40 hover:text-primary dark:hover:text-white text-sm transition-colors">Conditions d'utilisation</Link>
                    <Link href="/support" className="text-primary/40 dark:text-white/40 hover:text-primary dark:hover:text-white text-sm transition-colors">Support</Link>
                </div>
            </div>
        </footer>
    );
}

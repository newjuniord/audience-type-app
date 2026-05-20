import Link from "next/link";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";

export default function PrivacyPolicyPage() {
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors duration-200">
            <DashboardHeader />

            <main className="flex-1 pt-24">
                {/* Hero / Title Section */}
                <div className="max-w-[800px] mx-auto px-6 py-12 md:py-20">
                    <div className="flex flex-col gap-4 mb-12">
                        <nav className="flex items-center gap-2 text-primary/50 dark:text-white/50 text-sm font-medium">
                            <a className="hover:text-primary dark:hover:text-white transition-colors" href="/">Accueil</a>
                            <span className="material-symbols-outlined text-xs">chevron_right</span>
                            <span className="text-primary dark:text-white">Politique de confidentialité</span>
                        </nav>
                        <h1 className="text-primary dark:text-white text-5xl md:text-6xl font-black leading-tight tracking-[-0.04em]">Politique de confidentialité</h1>
                        <p className="text-primary/50 dark:text-white/50 text-lg font-normal">Dernière mise à jour : 20 février 2026</p>
                    </div>

                    <div className="w-full h-px bg-primary/10 dark:bg-white/10 mb-12"></div>

                    {/* Content Container */}
                    <article className="max-w-none text-primary/80 dark:text-white/80 text-lg leading-relaxed space-y-12">
                        <p className="text-primary dark:text-white text-xl font-medium italic">
                            La protection de vos données est notre priorité. Cette politique détaille notre rigueur et explique comment nous gérons vos informations personnelles sur notre boutique de cours, d'ebooks et nos consultations de réservation.
                        </p>

                        <section id="collection" className="space-y-6">
                            <h2 className="text-primary dark:text-white text-3xl font-bold tracking-tight">1. Collecte d'informations</h2>
                            <p>Nous collectons les informations que vous nous fournissez directement lorsque vous créez un compte, effectuez une réservation ou communiquez avec notre équipe d'assistance. Cela peut inclure :</p>
                            <ul className="list-disc pl-6 space-y-3 my-6">
                                <li>Nom, adresse e-mail et coordonnées.</li>
                                <li>Détails de paiement et informations de facturation (traités en toute sécurité via nos partenaires).</li>
                                <li>Historique des réservations, préférences et activité sur la place de marché.</li>
                                <li>Informations sur l'appareil, adresses IP et types de navigateurs à des fins de sécurité.</li>
                            </ul>
                        </section>

                        <section id="usage" className="space-y-6">
                            <h2 className="text-primary dark:text-white text-3xl font-bold tracking-tight">2. Utilisation des données</h2>
                            <p>Les informations recueillies sont utilisées exclusivement pour assurer et améliorer nos consultations. Plus précisément, nous traitons vos données pour : valider vos achats de contenus, gérer vos réservations de prestations et assurer notre support client. Nous utilisons aussi des données agrégées et anonymes pour analyser la performance technique et les tendances de navigation.</p>

                            <div className="bg-primary/5 dark:bg-white/5 p-8 rounded-xl border border-primary/10 dark:border-white/10 my-8">
                                <p className="text-sm font-bold text-primary dark:text-white mb-2 uppercase tracking-widest">Principe clé</p>
                                <p className="m-0">Nous ne cédons jamais vos données personnelles à des tiers à des fins commerciales. Vos informations sont exclusivement traitées pour assurer le fonctionnement opérationnel de notre plateforme et de nos consultations.</p>
                            </div>
                        </section>

                        <section id="rights" className="space-y-6">
                            <h2 className="text-primary dark:text-white text-3xl font-bold tracking-tight">3. Droits de l'utilisateur</h2>
                            <p>Selon les lois sur la protection des données (dont le RGPD), vous disposez d’un droit d'accès, de rectification et de suppression de vos informations. Vous pouvez aussi vous opposer au traitement ou solliciter la portabilité de vos données. Pour exercer ces droits, veuillez ajuster les réglages de votre espace client ou contacter notre service dédié à l’adresse : contact@audiencetype.com.</p>
                        </section>

                        <section id="cookies" className="space-y-6">
                            <h2 className="text-primary dark:text-white text-3xl font-bold tracking-tight">4. Cookies</h2>
                            <p>Nous utilisons des cookies pour optimiser votre expérience sur DRJ Akademi. Ces traceurs nous permettent de maintenir votre session active, de sécuriser vos transactions et d'analyser l'audience de notre plateforme. Vous pouvez configurer votre navigateur pour bloquer ces cookies, toutefois, certaines fonctionnalités de nos consultations et l'accès à vos contenus pourraient en être affectés.</p>
                        </section>

                        <section className="mt-16 pt-16 border-t border-primary/10 dark:border-white/10" id="security">
                            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between p-8 bg-primary dark:bg-white rounded-xl text-white dark:text-primary">
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold mb-2">Vous avez des questions sur vos données ?</h3>
                                    <p className="opacity-70">Notre équipe dédiée à la vie privée est là pour vous aider à comprendre comment vos informations sont protégées.</p>
                                </div>
                                <Link href="/support" className="flex min-w-[140px] items-center justify-center rounded-full h-12 px-8 bg-white dark:bg-primary text-primary dark:text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg active:scale-95">
                                    Contacter l'équipe Vie Privée
                                </Link>
                            </div>
                        </section>
                    </article>
                </div>
            </main>

            <DashboardFooter />
        </div>
    );
}

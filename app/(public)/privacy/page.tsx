import Link from "next/link";
import DashboardHeader from "@/components/buyer/DashboardHeader";
import DashboardFooter from "@/components/buyer/DashboardFooter";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Politik Konfidansyalite",
    description: "Politik konfidansyalite ak pwoteksyon done pèsonèl sou platfòm DJR Akademi.",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark text-white">
            <DashboardHeader />

            <main className="flex-1 pt-24">
                {/* Hero / Title Section */}
                <div className="max-w-[800px] mx-auto px-6 py-12 md:py-20">
                    <div className="flex flex-col gap-4 mb-12">
                        <nav className="flex items-center gap-2 text-white/40 text-sm font-medium">
                            <a className="hover:text-white transition-colors" href="/">Accueil</a>
                            <span className="material-symbols-outlined text-xs">chevron_right</span>
                            <span className="text-white">Politique de confidentialité</span>
                        </nav>
                        <span className="text-primary text-xs font-black uppercase tracking-[0.3em]">Légal</span>
                        <h1 className="text-white text-5xl md:text-6xl font-black leading-tight tracking-[-0.04em]">Politique de confidentialité</h1>
                        <p className="text-white/40 text-sm font-medium">Dernière mise à jour : 20 février 2026</p>
                    </div>

                    <div className="w-full h-px bg-white/5 mb-12"></div>

                    {/* Content Container */}
                    <article className="max-w-none text-white/70 text-base leading-relaxed space-y-12">
                        <p className="text-white text-lg font-medium italic border-l-4 border-primary pl-5">
                            La protection de vos données est notre priorité. Cette politique détaille notre rigueur et explique comment nous gérons vos informations personnelles sur notre boutique de cours, d'ebooks et nos consultations de réservation.
                        </p>

                        <section id="collection" className="space-y-6">
                            <h2 className="text-white text-2xl font-bold tracking-tight flex items-center gap-3">
                                <span className="text-primary/60 text-lg">01.</span>
                                Collecte d'informations
                            </h2>
                            <p>Nous collectons les informations que vous nous fournissez directement lorsque vous créez un compte, effectuez une réservation ou communiquez avec notre équipe d'assistance. Cela peut inclure :</p>
                            <ul className="list-none space-y-3 my-6">
                                {["Nom, adresse e-mail et coordonnées.", "Détails de paiement et informations de facturation (traités en toute sécurité via nos partenaires).", "Historique des réservations, préférences et activité sur la plateforme.", "Informations sur l'appareil, adresses IP et types de navigateurs à des fins de sécurité."].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary text-base mt-0.5">arrow_right</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section id="usage" className="space-y-6">
                            <h2 className="text-white text-2xl font-bold tracking-tight flex items-center gap-3">
                                <span className="text-primary/60 text-lg">02.</span>
                                Utilisation des données
                            </h2>
                            <p>Les informations recueillies sont utilisées exclusivement pour assurer et améliorer nos consultations. Plus précisément, nous traitons vos données pour : valider vos achats de contenus, gérer vos réservations de prestations et assurer notre support client. Nous utilisons aussi des données agrégées et anonymes pour analyser la performance technique et les tendances de navigation.</p>
                            <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20 my-6">
                                <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Principe clé</p>
                                <p className="text-white/80 text-sm">Nous ne cédons jamais vos données personnelles à des tiers à des fins commerciales. Vos informations sont exclusivement traitées pour assurer le fonctionnement opérationnel de notre plateforme.</p>
                            </div>
                        </section>

                        <section id="rights" className="space-y-6">
                            <h2 className="text-white text-2xl font-bold tracking-tight flex items-center gap-3">
                                <span className="text-primary/60 text-lg">03.</span>
                                Droits de l'utilisateur
                            </h2>
                            <p>Selon les lois sur la protection des données (dont le RGPD), vous disposez d'un droit d'accès, de rectification et de suppression de vos informations. Vous pouvez aussi vous opposer au traitement ou solliciter la portabilité de vos données. Pour exercer ces droits, veuillez ajuster les réglages de votre espace client ou contacter notre service dédié à l'adresse : <span className="text-primary font-medium">contact@djrakademi.net</span>.</p>
                        </section>

                        <section id="cookies" className="space-y-6">
                            <h2 className="text-white text-2xl font-bold tracking-tight flex items-center gap-3">
                                <span className="text-primary/60 text-lg">04.</span>
                                Cookies
                            </h2>
                            <p>Nous utilisons des cookies pour optimiser votre expérience sur DJR Akademi. Ces traceurs nous permettent de maintenir votre session active, de sécuriser vos transactions et d'analyser l'audience de notre plateforme. Vous pouvez configurer votre navigateur pour bloquer ces cookies, toutefois, certaines fonctionnalités de nos consultations et l'accès à vos contenus pourraient en être affectés.</p>
                        </section>

                        <section className="mt-16 pt-8 border-t border-white/5" id="security">
                            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between p-8 bg-primary rounded-2xl text-white">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold mb-2">Vous avez des questions sur vos données ?</h3>
                                    <p className="opacity-70 text-sm">Notre équipe dédiée à la vie privée est là pour vous aider à comprendre comment vos informations sont protégées.</p>
                                </div>
                                <Link href="/support" className="flex min-w-[160px] items-center justify-center rounded-full h-12 px-8 bg-white text-primary text-sm font-bold hover:opacity-90 transition-all shadow-lg active:scale-95">
                                    Nous contacter
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

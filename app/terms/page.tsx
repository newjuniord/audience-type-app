"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";

export default function TermsOfServicePage() {
    const [activeSection, setActiveSection] = useState("introduction");

    const navItems = [
        { id: "introduction", label: "Introduction", icon: "info" },
        { id: "user-accounts", label: "Comptes utilisateurs", icon: "person" },
        { id: "purchases", label: "Achats et Paiements", icon: "credit_card" },
        { id: "bookings", label: "Réservations", icon: "calendar_today" },
        { id: "ownership", label: "Propriété", icon: "description" },
        { id: "termination", label: "Résiliation", icon: "gavel" },
        { id: "conduct", label: "Conduite", icon: "diversity_3" },
    ];

    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-100px 0px -60% 0px',
            threshold: 0
        };

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        navItems.forEach((item) => {
            const element = document.getElementById(item.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -100; // Account for fixed header
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
            setActiveSection(id);
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark text-white">
            <DashboardHeader />

            <main className="mx-auto max-w-[1200px] px-6 py-12 pt-24">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Left Sidebar Navigation (Table of Contents) */}
                    <aside className="w-full lg:w-64 shrink-0">
                        <div className="sticky top-28">
                            <div className="mb-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Table des matières</h3>
                            </div>
                            <nav className="flex flex-col gap-1">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${
                                            activeSection === item.id
                                                ? "bg-primary/10 border border-primary/30 text-white font-semibold"
                                                : "hover:bg-white/5 font-medium text-white/40 hover:text-white/70 border border-transparent"
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined text-[18px] ${activeSection === item.id ? 'text-primary' : ''}`}>{item.icon}</span>
                                        <span className="text-sm">{item.label}</span>
                                    </button>
                                ))}
                            </nav>

                            <div className="mt-10 p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                                <p className="text-xs font-bold mb-2 uppercase tracking-widest text-white">Besoin d'aide ?</p>
                                <p className="text-xs text-white/50 mb-4 leading-relaxed">
                                    Des questions sur ces conditions ? Notre équipe est là pour vous.
                                </p>
                                <Link href="/support" className="w-full bg-primary text-white py-2 text-xs font-bold rounded-full hover:bg-primary/90 transition-all flex items-center justify-center">
                                    Contacter le support
                                </Link>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 max-w-[800px]">
                        <div className="mb-12">
                            <span className="text-primary text-xs font-black uppercase tracking-[0.3em]">Légal</span>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-3 mb-4 text-white leading-tight">Conditions d'utilisation</h1>
                            <div className="flex items-center gap-3">
                                <span className="flex size-2 rounded-full bg-green-500"></span>
                                <p className="text-sm font-medium text-white/40 uppercase tracking-wide">Dernière mise à jour : 20 février 2026</p>
                            </div>
                        </div>

                        {/* Content Sections */}
                        <div className="space-y-16 text-white/70 leading-relaxed text-base">
                            <section id="introduction">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                                    <span className="text-primary/50">01.</span> Introduction
                                </h2>
                                <div className="space-y-4">
                                    <p>Bienvenue sur DJR Akademi, votre plateforme dédiée à la vente de produits numériques et à la réservation de consultations. Ces conditions d'utilisation (« Conditions ») régissent votre accès et votre utilisation de notre site Web, de nos outils numériques et des consultations connexes (collectivement, les « Consultations »).</p>
                                    <p>En accédant à nos Consultations ou en les utilisant, vous acceptez d'être lié par ces Conditions ainsi que par notre Politique de confidentialité. Si vous n'avez pas accepté ces conditions, veuillez ne pas utiliser les Consultations. Nous nous réservons le droit de mettre à jour ces conditions à tout moment ; votre utilisation continue de la plateforme après publication des modifications constitue une acceptation pleine et entière de ces changements.</p>
                                </div>
                            </section>

                            <section id="user-accounts">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                                    <span className="text-primary/50">02.</span> Comptes utilisateurs
                                </h2>
                                <div className="space-y-4">
                                    <p>L'accès à nos cours, ebooks et consultations de réservation nécessite la création d'un compte client via le système d'authentification Google. En utilisant cette plateforme, vous acceptez les conditions suivantes :</p>
                                    <ul className="list-disc pl-5 space-y-4">
                                        <li>
                                            <strong>Exactitude des informations :</strong> Vous vous engagez à fournir des informations de profil exactes et à les maintenir à jour.
                                        </li>
                                        <li>
                                            <strong>Sécurité de l'accès tiers :</strong> Vous êtes seul responsable de la protection et de la confidentialité de votre compte Google. Toute activité réalisée sur DJR Akademi via votre authentification Google est présumée être effectuée par vous-même.
                                        </li>
                                        <li>
                                            <strong>Usage strictement personnel :</strong> Votre compte est personnel et non transférable. Il est formellement interdit de partager vos accès, de prêter votre session ou de permettre à un tiers de consulter vos produits numériques (cours, ebooks) via votre compte.
                                        </li>
                                        <li>
                                            <strong>Responsabilité :</strong> Vous assumez la pleine responsabilité de toutes les actions effectuées sous votre compte. DJR Akademi ne saurait être tenue responsable des dommages résultant d'une utilisation non autorisée de votre accès Google ou d'une négligence dans la gestion de votre sécurité personnelle.
                                        </li>
                                    </ul>
                                    <p className="pt-2 font-medium">En cas d'utilisation suspecte ou non autorisée de votre compte, veuillez nous contacter immédiatement à l'adresse : contact@audiencetype.com.</p>
                                </div>
                            </section>

                            <section id="purchases">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                                    <span className="text-primary/50">03.</span> Achats et Paiements
                                </h2>
                                <div className="space-y-4">
                                    <p>Le règlement de vos commandes sur DJR Akademi est sécurisé et délégué à des prestataires de services de paiement reconnus.</p>
                                    <ul className="list-disc pl-5 space-y-4">
                                        <li>
                                            <strong>Traitement par des tiers :</strong> Vous reconnaissez que vos transactions sont traitées par des services tiers spécialisés ou d'autres plateformes de paiement sécurisées. En effectuant un achat, vous acceptez de vous conformer également à leurs propres conditions générales et politiques de confidentialité.
                                        </li>
                                        <li>
                                            <strong>Facturation et Taxes :</strong> Les prix sont indiqués sur la plateforme au moment de l'achat. Selon le prestataire utilisé, celui-ci peut agir en tant que revendeur agréé ou intermédiaire de paiement, incluant les taxes applicables (TVA, etc.) selon votre zone géographique.
                                        </li>
                                        <li>
                                            <strong>Accès immédiat et Rétractation :</strong> Pour tout achat de produit numérique (cours, ebooks), vous demandez l'exécution immédiate du contrat. Vous reconnaissez ainsi expressément que l'accès au contenu ou le début du téléchargement entraîne la perte de votre droit de rétractation de 14 jours. En conséquence, aucun remboursement ne sera effectué une fois le produit accessible dans votre espace client.
                                        </li>
                                        <li>
                                            <strong>Sécurité des données :</strong> DJR Akademi ne collecte ni ne stocke vos informations bancaires (numéros de carte, codes de sécurité). Ces données sont traitées exclusivement par nos partenaires financiers certifiés.
                                        </li>
                                    </ul>
                                </div>
                            </section>

                            <section id="bookings">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                                    <span className="text-primary/50">04.</span> Réservations de consultations
                                </h2>
                                <div className="space-y-4">
                                    <p>Notre plateforme facilite les réservations entre les utilisateurs et les consultants. Bien que nous nous efforcions de garantir des interactions de haute qualité, nous ne garantissons pas la performance d'un consultant. Les confirmations de réservation sont soumises à la disponibilité et à la politique d'annulation spécifique.</p>
                                    <p>Les utilisateurs sont encouragés à examiner attentivement les détails avant de finaliser une réservation.</p>
                                </div>
                            </section>

                            <section id="ownership">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                                    <span className="text-primary/50">05.</span> Propriété du contenu
                                </h2>
                                <div className="space-y-4">
                                    <p>Tous les contenus présents sur la plateforme (textes, vidéos, ebooks, designs) sont la propriété exclusive de DJR Akademi. Toute reproduction, distribution ou exploitation non autorisée de nos cours ou produits numériques est strictement interdite et peut donner lieu à des poursuites judiciaires. L'achat d'un produit vous octroie un droit d'usage personnel et non transférable.</p>
                                </div>
                            </section>

                            <section id="termination">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                                    <span className="text-primary/50">06.</span> Résiliation
                                </h2>
                                <div className="space-y-4">
                                    <p>Cette section définit les conditions de fermeture de votre compte et de fin d'accès à nos Consultations.</p>
                                    <ul className="list-disc pl-5 space-y-4">
                                        <li>
                                            <strong>Résiliation par l’Utilisateur :</strong> Vous pouvez cesser d’utiliser nos Consultations à tout moment. Si vous souhaitez supprimer votre compte, vous pouvez le faire via les paramètres de votre espace client ou en envoyant une demande à contact@audiencetype.com.
                                        </li>
                                        <li>
                                            <p className="font-medium italic">Note importante : La suppression de votre compte entraîne la suppression immédiate et définitive de vos droits d'accès aux produits numériques achetés (cours, ebooks), sans possibilité de remboursement ou de récupération ultérieure des données.</p>
                                        </li>
                                        <li>
                                            <strong>Résiliation par DJR Akademi :</strong> Nous nous réservons le droit de suspendre, de limiter ou de résilier votre compte à notre seule discrétion, de plein droit et sans préavis, en cas de manquement grave à nos Conditions Générales, notamment :
                                            <ul className="list-circle pl-5 mt-2 space-y-2">
                                                <li>Violation de nos droits de propriété intellectuelle (copie, revente).</li>
                                                <li>Partage d'accès ou de compte avec des tiers.</li>
                                                <li>Comportement frauduleux ou défaut de paiement via nos prestataires de paiement sécurisés.</li>
                                            </ul>
                                        </li>
                                        <li>
                                            <strong>Effets de la résiliation :</strong> À la date de prise d’effet de la résiliation, votre droit d'utiliser les Consultations et d'accéder aux contenus numériques cesse immédiatement. Toutes les dispositions des présentes Conditions qui, par leur nature, devraient survivre à la résiliation (notamment les droits de propriété intellectuelle et les limitations de responsabilité) resteront en vigueur.
                                        </li>
                                    </ul>
                                </div>
                            </section>

                            <section id="conduct">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                                    <span className="text-primary/50">07.</span> Conduite et Respect : Protection du Personnel et du Fondateur
                                </h2>
                                <div className="space-y-4">
                                    <p>DJR Akademi s'engage à fournir un environnement sain et respectueux pour tous ses utilisateurs, ainsi que pour ses collaborateurs et son fondateur. En utilisant nos Consultations, vous vous engagez à :</p>
                                    <ul className="list-disc pl-5 space-y-3">
                                        <li>Faire preuve de courtoisie et de respect dans tous vos échanges avec notre équipe de support, nos prestataires et le fondateur.</li>
                                        <li>Ne proférer aucune insulte, menace, propos haineux, harcelant ou diffamatoire.</li>
                                        <li>Respecter le travail et l'expertise fournis à travers nos produits et consultations.</li>
                                    </ul>
                                    <p className="pt-2">Tout manquement à cette règle de conduite, qu'il s'agisse de comportements abusifs par email, sur les réseaux sociaux ou tout autre canal de communication lié à la marque, pourra entraîner la suspension immédiate de votre compte et de vos accès aux produits, ainsi que d'éventuels signalements aux autorités compétentes.</p>
                                </div>
                            </section>
                        </div>

                        {/* Redundant footer removed */}
                    </div>
                </div>
            </main>

            {/* Back to top button */}
            <div className="fixed bottom-8 right-8 z-50">
                <button
                    className="size-12 rounded-full bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 hover:scale-110 transition-transform active:scale-95"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    <span className="material-symbols-outlined">arrow_upward</span>
                </button>
            </div>

            <DashboardFooter />
        </div>
    );
}

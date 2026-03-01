"use client";

import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";

const faqs = [
    {
        question: "Comment puis-je accéder à mes cours après l'achat ?",
        answer: "Vous pourrez accéder à tous vos contenus directement depuis l'onglet 'Mon contenu' dans votre tableau de bord."
    },
    {
        question: "Quels sont les modes de paiement acceptés ?",
        answer: "Nous acceptons toutes les principales cartes de crédit (Visa, Mastercard, American Express), Google pay et Moncash ."
    },
    {
        question: "Proposez-vous des remboursements ?",
        answer: "Oui, nous offrons une garantie de remboursement de 14 jours pour nos produits numériques si vous n'êtes pas satisfait, à condition que le contenu n'ait pas été intégralement visionné ou téléchargé."
    },
    {
        question: "Comment réserver une session de consulting ?",
        answer: "Vous pouvez créer un booking directement via la page Produits et ajouter votre numéro de téléphone. Vous serez ensuite contacté par email ou WhatsApp pour confirmer et organiser votre rendez-vous."
    }
];

export default function SupportPage() {
    const [formStatus, setFormStatus] = useState<"idle" | "submitting" | "success">("idle");
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);

        const payload = {
            fullName: formData.get("fullName"),
            email: formData.get("email"),
            subject: formData.get("subject"),
            message: formData.get("message"),
        };

        setFormStatus("submitting");

        try {
            const response = await fetch("/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to send message");
            }

            setFormStatus("success");
            (e.target as HTMLFormElement).reset();
        } catch (error) {
            console.error("Error sending message:", error);
            setFormStatus("idle");
            alert("Une erreur est survenue lors de l'envoi du message. Veuillez réessayer.");
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors">
            <DashboardHeader />

            <main className="pt-24 pb-20">
                {/* Hero Section */}
                <section className="max-w-[1200px] mx-auto px-6 py-16 text-center">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">Centre de Support</h1>
                    <p className="text-primary/60 dark:text-white/60 text-lg max-w-2xl mx-auto">
                        Besoin d'aide ? Notre équipe est là pour vous accompagner. Parcourez nos questions fréquentes ou envoyez-nous un message directement.
                    </p>
                </section>

                <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20">
                    {/* Contact Form */}
                    <section>
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 italic">Envoyez-nous un message</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Nom complet</label>
                                    <input
                                        required
                                        name="fullName"
                                        type="text"
                                        className="w-full h-14 bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 px-6 focus:border-primary dark:focus:border-white outline-none transition-all font-medium"
                                        placeholder="Jean Dupont"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Email</label>
                                    <input
                                        required
                                        name="email"
                                        type="email"
                                        className="w-full h-14 bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 px-6 focus:border-primary dark:focus:border-white outline-none transition-all font-medium"
                                        placeholder="jean@exemple.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Sujet</label>
                                <input
                                    required
                                    name="subject"
                                    type="text"
                                    className="w-full h-14 bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 px-6 focus:border-primary dark:focus:border-white outline-none transition-all font-medium"
                                    placeholder="Comment pouvons-nous vous aider ?"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Message</label>
                                <textarea
                                    required
                                    name="message"
                                    rows={5}
                                    className="w-full bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 p-6 focus:border-primary dark:focus:border-white outline-none transition-all font-medium resize-none"
                                    placeholder="Décrivez votre demande en détail..."
                                ></textarea>
                            </div>

                            <button
                                disabled={formStatus !== "idle"}
                                className="w-full h-14 bg-primary dark:bg-white text-white dark:text-primary font-black uppercase tracking-widest text-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {formStatus === "idle" && "Envoyer le message"}
                                {formStatus === "submitting" && "Envoi en cours..."}
                                {formStatus === "success" && "Message envoyé avec succès !"}
                            </button>
                        </form>
                    </section>

                    {/* FAQ Section */}
                    <section>
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 italic">Questions Fréquentes</h2>
                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <div
                                    key={index}
                                    className="border border-primary/10 dark:border-white/10 overflow-hidden"
                                >
                                    <button
                                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                        className="w-full flex items-center justify-between p-6 text-left hover:bg-primary/5 dark:hover:bg-white/5 transition-colors group"
                                    >
                                        <span className="font-bold text-sm uppercase tracking-tight">{faq.question}</span>
                                        <span className={`material-symbols-outlined transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </button>
                                    <div
                                        className={`transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                                            }`}
                                    >
                                        <div className="p-6 pt-0 text-sm text-primary/60 dark:text-white/60 leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Additional Info Cards */}
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 bg-primary dark:bg-white text-white dark:text-primary">
                                <span className="material-symbols-outlined mb-4">mail</span>
                                <h3 className="font-black uppercase tracking-widest text-xs mb-2">Contact direct</h3>
                                <p className="text-sm opacity-70">contact@audiencetype.com</p>
                                <p className="text-sm font-bold mt-1">+1 829 669 2914</p>
                            </div>
                            <div className="p-8 border border-primary/10 dark:border-white/10">
                                <span className="material-symbols-outlined mb-4">schedule</span>
                                <h3 className="font-black uppercase tracking-widest text-xs mb-2">Horaires</h3>
                                <p className="text-sm opacity-60">Lun - Ven, 9h - 18h CET</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <DashboardFooter />
        </div>
    );
}

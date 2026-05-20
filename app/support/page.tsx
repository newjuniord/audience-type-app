"use client";

import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";

const faqs = [
    {
        question: "Kijan pou m jwenn aksè kours mwen yo apre acha ?",
        answer: "Ou kapab jwenn tout kontni ou yo dirèkteman nan tab 'Mon contenu' nan tablo de bò ou a."
    },
    {
        question: "Ki mòd peman nou aksepte ?",
        answer: "Nou aksepte tout kat kredi prensipal yo (Visa, Mastercard, American Express), Google Pay ak Moncash."
    },
    {
        question: "Èske nou ofri ranbousman ?",
        answer: "Wi, nou ofri garanti ranbousman 14 jou pou pwodui nimerik nou yo si ou pa satisfè — kondisyon: kontni an pa dwe fin gade oswa telechaje nèt."
    },
    {
        question: "Kijan pou m rezève yon sesyon konsiltasyon ?",
        answer: "Ou ka kreye yon booking dirèkteman via paj Produits la epi ajoute nimewo telefòn ou. Apre sa w a kontakte pa email oswa WhatsApp pou konfime randevou ou a."
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

            if (!response.ok) throw new Error("Failed to send message");

            setFormStatus("success");
            (e.target as HTMLFormElement).reset();
        } catch (error) {
            console.error("Error sending message:", error);
            setFormStatus("idle");
            alert("Une erreur est survenue. Veuillez réessayer.");
        }
    };

    return (
        <div className="min-h-screen bg-background-dark text-white">
            <DashboardHeader />

            <main className="pt-24 pb-20">
                {/* Hero */}
                <section className="max-w-[860px] mx-auto px-6 py-16">
                    <span className="text-primary text-xs font-black uppercase tracking-[0.3em]">Èd & Sipò</span>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mt-3 mb-5 text-white">
                        Centre de Support
                    </h1>
                    <p className="text-white/50 text-lg max-w-2xl leading-relaxed">
                        Bezwen èd ? Ekip nou an disponib pou ou. Gade kesyon ki poze souvan yo oswa voye nou yon mesaj dirèkteman.
                    </p>
                </section>

                <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">

                    {/* Contact Form */}
                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-8 text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">send</span>
                            Voye nou yon mesaj
                        </h2>

                        {formStatus === "success" ? (
                            <div className="p-8 rounded-2xl bg-green-500/10 border border-green-500/20 text-center space-y-3">
                                <span className="material-symbols-outlined text-green-400 text-4xl">check_circle</span>
                                <p className="font-bold text-white">Mesaj ou a voye ak siksè !</p>
                                <p className="text-white/50 text-sm">N a reponn ou nan pi piti tan posib.</p>
                                <button onClick={() => setFormStatus("idle")} className="text-xs text-white/40 hover:text-white underline transition-colors mt-2">
                                    Voye yon lòt mesaj
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Non konplè</label>
                                        <input
                                            required name="fullName" type="text"
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-sm text-white placeholder:text-white/20"
                                            placeholder="Jean Ronald"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Email</label>
                                        <input
                                            required name="email" type="email"
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-sm text-white placeholder:text-white/20"
                                            placeholder="jean@exemple.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Sijè</label>
                                    <input
                                        required name="subject" type="text"
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-sm text-white placeholder:text-white/20"
                                        placeholder="Kijan nou ka ede ou ?"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Mesaj</label>
                                    <textarea
                                        required name="message" rows={5}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-sm text-white placeholder:text-white/20 resize-none"
                                        placeholder="Dekri demann ou an ak detay..."
                                    ></textarea>
                                </div>
                                <button
                                    disabled={formStatus !== "idle"}
                                    className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {formStatus === "idle" && "Voye mesaj la"}
                                    {formStatus === "submitting" && (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                                            Envoi en cours...
                                        </span>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* Contact Info Cards */}
                        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
                                <span className="material-symbols-outlined text-primary mb-3 block">mail</span>
                                <h3 className="font-black uppercase tracking-widest text-xs text-white mb-1">Kontak dirèk</h3>
                                <p className="text-sm text-white/50">contact@audiencetype.com</p>
                                <p className="text-sm font-bold text-white mt-1">+1 829 669 2914</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                                <span className="material-symbols-outlined text-white/40 mb-3 block">schedule</span>
                                <h3 className="font-black uppercase tracking-widest text-xs text-white mb-1">Orè travay</h3>
                                <p className="text-sm text-white/50">Lun – Ven, 9h – 18h</p>
                                <p className="text-xs text-white/30 mt-1">Reponse souvan nan 24h</p>
                            </div>
                        </div>
                    </section>

                    {/* FAQ Section */}
                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-8 text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">quiz</span>
                            Kesyon ki poze souvan
                        </h2>
                        <div className="space-y-3">
                            {faqs.map((faq, index) => (
                                <div
                                    key={index}
                                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${openFaq === index ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-white/[0.02]'}`}
                                >
                                    <button
                                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                        className="w-full flex items-center justify-between p-5 text-left"
                                    >
                                        <span className="font-bold text-sm text-white leading-snug pr-4">{faq.question}</span>
                                        <span className={`material-symbols-outlined text-white/40 shrink-0 transition-transform duration-300 ${openFaq === index ? 'rotate-180 text-primary' : ''}`}>
                                            expand_more
                                        </span>
                                    </button>
                                    <div className={`transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="px-5 pb-5 text-sm text-white/60 leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <DashboardFooter />
        </div>
    );
}

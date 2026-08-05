"use client";

import { useState, useEffect } from "react";
import { getSurveys, Survey } from "@/lib/surveys";
import Link from "next/link";
import DashboardHeader from "@/components/buyer/DashboardHeader";
import DashboardFooter from "@/components/buyer/DashboardFooter";

export default function SurveysListPage() {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSurveys().then(data => {
            setSurveys(data.filter(s => s.isActive));
            setLoading(false);
        });
    }, []);

    return (
        <div className="min-h-screen bg-background-dark text-white">
            <DashboardHeader />

            <main className="max-w-4xl mx-auto px-4 py-16 space-y-12">
                {/* Hero */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-black uppercase tracking-widest">
                        <span className="material-symbols-outlined text-sm">poll</span>
                        Sondaj
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                        Patisipe nan Sondaj Yo
                    </h1>
                    <p className="text-white/50 max-w-lg mx-auto leading-relaxed">
                        Opinyon ou enpòtan pou nou. Repon kesyon sa yo epi ede nou kreye pi bon kontni ak pwodui pou ou.
                    </p>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : surveys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/30">
                        <span className="material-symbols-outlined text-6xl">inbox</span>
                        <p className="font-bold text-lg">Pa gen sondaj aktif pou kounye a</p>
                        <p className="text-sm">Retounen pita, nou ap ajoute plis byento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {surveys.map(survey => (
                            <Link
                                key={survey.id}
                                href={`/survey/${survey.id}`}
                                className="group block bg-white/[0.03] border border-white/10 hover:border-primary/40 hover:bg-white/[0.05] rounded-3xl p-6 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-primary text-xl">poll</span>
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <h2 className="font-black text-white group-hover:text-primary transition-colors leading-snug">
                                            {survey.title}
                                        </h2>
                                        {survey.description && (
                                            <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                                                {survey.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 pt-2 text-xs text-white/30">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">quiz</span>
                                                {survey.questions?.length || 0} kesyon
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">group</span>
                                                {survey.responseCount || 0} repons
                                            </span>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0">
                                        arrow_forward
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <DashboardFooter />
        </div>
    );
}

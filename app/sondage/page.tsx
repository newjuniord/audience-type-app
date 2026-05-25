"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
    id: string;
    text: string;
    type: "select" | "text";
    options?: string[];
    placeholder?: string;
}

interface Survey {
    id: string;
    title: string;
    image: string;
    questions: Question[];
    completed: boolean;
}

export default function SondagePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loadingSurveys, setLoadingSurveys] = useState(true);

    // Modal / Popup state pou sondaj aktif la
    const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [commentText, setCommentText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);

    // Chaje sondaj yo nan API a
    const fetchSurveys = async () => {
        setLoadingSurveys(true);
        try {
            const url = user ? `/api/sondage?userId=${user.uid}` : "/api/sondage";
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                
                // Si itilizatè a pa konekte, verifye tou ak localStorage
                if (!user && typeof window !== "undefined") {
                    const updated = data.map((survey: Survey) => {
                        const localDone = localStorage.getItem(`survey_completed_${survey.id}`);
                        return {
                            ...survey,
                            completed: localDone === "true" || survey.completed
                        };
                    });
                    setSurveys(updated);
                } else {
                    setSurveys(data);
                }
            }
        } catch (error) {
            console.error("Error fetching surveys:", error);
        } finally {
            setLoadingSurveys(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchSurveys();
        }
    }, [user, authLoading]);

    // Lè yon sondaj klike sou li
    const handleStartSurvey = (survey: Survey) => {
        setActiveSurvey(survey);
        setCurrentStep(0);
        setAnswers({});
        setCommentText("");
        if (survey.completed) {
            setIsFinished(true);
            setIsAlreadyCompleted(true);
        } else {
            setIsFinished(false);
            setIsAlreadyCompleted(false);
        }
    };

    const handleOptionSelect = (option: string) => {
        if (!activeSurvey) return;
        const activeQuestion = activeSurvey.questions[currentStep];
        const newAnswers = { ...answers, [activeQuestion.id]: option };
        setAnswers(newAnswers);
        
        if (currentStep < activeSurvey.questions.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleSubmit(newAnswers);
        }
    };

    const handleNextText = () => {
        if (!activeSurvey) return;
        const activeQuestion = activeSurvey.questions[currentStep];
        const newAnswers = { ...answers, [activeQuestion.id]: commentText };
        setAnswers(newAnswers);
        handleSubmit(newAnswers);
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const triggerConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);

        return () => clearInterval(interval);
    };

    const handleSubmit = async (finalAnswers: Record<string, string>) => {
        if (!activeSurvey) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/sondage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sondageId: activeSurvey.id,
                    userId: user?.uid || "anonymous",
                    answers: finalAnswers,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to save survey");
            }

            // Sove nan localStorage
            if (typeof window !== "undefined") {
                localStorage.setItem(`survey_completed_${activeSurvey.id}`, "true");
            }

            setIsFinished(true);
            triggerConfetti();

            // Mete eta lokal la ajou
            setSurveys(prev => prev.map(s => s.id === activeSurvey.id ? { ...s, completed: true } : s));
        } catch (error: any) {
            console.error("Error submitting survey:", error);
            alert(error.message || "Gen yon erè ki fèt. Tanpri reyezi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeQuestion = activeSurvey ? activeSurvey.questions[currentStep] : null;
    const progressPercentage = activeSurvey 
        ? Math.round(((currentStep) / activeSurvey.questions.length) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-background-dark text-white flex flex-col justify-between">
            <DashboardHeader />

            <main className="flex-1 pt-28 pb-20 px-6 max-w-[1200px] mx-auto w-full space-y-12">
                
                {/* Tit Seksyon */}
                <div className="text-center space-y-4">
                    <span className="text-primary text-[11px] font-black uppercase tracking-[0.25em]">
                        Sondaj DJR Akademi
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
                        Sondaj & Opinyon
                    </h1>
                    <p className="text-white/60 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                        Chwazi yon sondaj pou w ranpli. Opinyon w trè enpòtan pou ede nou amelyore kalite kou yo ak sèvis nou yo nan akademi an.
                    </p>
                </div>

                {authLoading || loadingSurveys ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-white/50 text-sm font-bold animate-pulse">N ap chaje sondaj yo...</p>
                    </div>
                ) : surveys.length === 0 ? (
                    <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-16 text-center max-w-xl mx-auto backdrop-blur-md relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary border border-primary/20">
                            <span className="material-symbols-outlined text-4xl">poll</span>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Pa gen sondaj disponib</h3>
                        <p className="text-sm text-white/50 leading-relaxed max-w-sm mx-auto">
                            Akademi an pa gen okenn sondaj aktif pou kounye a. Tanpri retounen pita pou w ka pataje opinyon w avèk nou !
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {surveys.map((survey) => (
                            <div 
                                key={survey.id}
                                onClick={() => handleStartSurvey(survey)}
                                className={`group bg-white/[0.02] border ${survey.completed ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-white/10 hover:border-primary/40'} rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col h-full relative`}
                            >
                                {/* Glow background */}
                                <div className={`absolute -top-20 -right-20 w-48 h-48 ${survey.completed ? 'bg-emerald-500/5' : 'bg-primary/5'} rounded-full blur-[60px] pointer-events-none transition-all group-hover:scale-110`} />

                                {/* Survey Image Banner */}
                                <div className="h-48 overflow-hidden relative border-b border-white/5">
                                    <img 
                                        src={survey.image} 
                                        alt={survey.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark to-transparent opacity-80" />
                                </div>

                                {/* Survey Body */}
                                <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-6 relative z-10">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                                                {survey.questions.length} Kesyon
                                            </span>
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-tight">
                                            {survey.title}
                                        </h3>
                                    </div>

                                    {/* Footer status button */}
                                    <div className="pt-2">
                                        {survey.completed ? (
                                            <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                Ranpli Deja
                                            </div>
                                        ) : (
                                            <div className="w-full py-4 bg-primary hover:bg-primary/95 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all group-hover:shadow-lg group-hover:shadow-primary/10">
                                                <span className="material-symbols-outlined text-sm">play_arrow</span>
                                                Kòmanse Sondaj
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal / Popup pou reponn Sondaj la */}
            <AnimatePresence>
                {activeSurvey && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-[640px] bg-background-light dark:bg-[#141414] border border-black/5 dark:border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden"
                        >
                            {/* Background glows */}
                            <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
                            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />

                            {/* Close button */}
                            <button 
                                onClick={() => setActiveSurvey(null)}
                                className="absolute top-6 right-6 size-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white transition-all duration-200 active:scale-95 z-20"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>

                            {!isFinished ? (
                                <div className="relative z-10">
                                    {/* Header progress info */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                                            {activeSurvey.title}
                                        </span>
                                        <span className="text-white/40 text-xs font-bold">
                                            Etap {currentStep + 1} nan {activeSurvey.questions.length}
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="w-full h-1.5 bg-white/5 rounded-full mb-8 overflow-hidden">
                                        <motion.div 
                                            className="h-full bg-primary"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercentage}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>

                                    {/* Back button */}
                                    {currentStep > 0 && (
                                        <button 
                                            onClick={handleBack}
                                            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors mb-6 group"
                                        >
                                            <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-0.5">
                                                arrow_back
                                            </span>
                                            Retounen dèyè
                                        </button>
                                    )}

                                    {/* Question and choices */}
                                    {activeQuestion && (
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={currentStep}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.25 }}
                                                className="space-y-6"
                                            >
                                                <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight leading-snug text-white pr-8">
                                                    {activeQuestion.text}
                                                </h2>

                                                {activeQuestion.type === "select" ? (
                                                    <div className="space-y-3 pt-2">
                                                        {activeQuestion.options?.map((option, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleOptionSelect(option)}
                                                                className="w-full text-left p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-primary/40 transition-all duration-200 active:scale-[0.99] flex items-center justify-between group"
                                                            >
                                                                <span className="text-sm font-medium text-white/80 group-hover:text-white leading-relaxed">
                                                                    {option}
                                                                </span>
                                                                <span className="material-symbols-outlined text-white/20 group-hover:text-primary transition-colors shrink-0 ml-4">
                                                                    chevron_right
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 pt-2">
                                                        <textarea
                                                            rows={5}
                                                            value={commentText}
                                                            onChange={(e) => setCommentText(e.target.value)}
                                                            placeholder={activeQuestion.placeholder}
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-sm text-white placeholder:text-white/20 resize-none"
                                                        />
                                                        <button
                                                            onClick={handleNextText}
                                                            disabled={isSubmitting}
                                                            className="w-full h-14 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary/95 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                                        >
                                                            {isSubmitting ? (
                                                                <>
                                                                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                    N ap anrejistre...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Fini sondaj la
                                                                    <span className="material-symbols-outlined text-sm">
                                                                        done_all
                                                                    </span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        </AnimatePresence>
                                    )}
                                </div>
                            ) : (
                                // Success screen
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative z-10 text-center py-6 space-y-6"
                                >
                                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-2 shadow-inner">
                                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                                    </div>
                                    
                                    <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-tight">
                                        Mèsi anpil !
                                    </h2>
                                    
                                    <p className="text-white/50 text-base max-w-sm mx-auto leading-relaxed">
                                        {isAlreadyCompleted 
                                            ? "Ou ranpli sondaj sa a deja. Mèsi anpil !" 
                                            : "Repons ou yo anrejistre avèk siksè. Sa ap ede nou amelyore kalite kou yo ak sèvis yo nan akademi an."
                                        }
                                    </p>

                                    <button
                                        onClick={() => setActiveSurvey(null)}
                                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                                    >
                                        Fèmen
                                    </button>
                                </motion.div>
                            )}

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <DashboardFooter />
        </div>
    );
}

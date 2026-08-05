"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getSurveyById, submitSurveyResponse, Survey } from "@/lib/surveys";
import Link from "next/link";

export default function SurveyPublicPage() {
    const params = useParams();
    const id = params?.id as string;

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [errorPopup, setErrorPopup] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!id) return;
            const data = await getSurveyById(id);
            setSurvey(data);
            setLoading(false);
        }
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark">
                <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!survey) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark text-white gap-4">
                <span className="material-symbols-outlined text-6xl text-white/20">search_off</span>
                <h1 className="text-2xl font-black">Sondaj sa a pa egziste</h1>
                <Link href="/" className="text-primary hover:underline text-sm">Retounen lakay</Link>
            </div>
        );
    }

    if (!survey.isActive) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark text-white gap-4">
                <span className="material-symbols-outlined text-6xl text-white/20">lock</span>
                <h1 className="text-2xl font-black">Sondaj sa a fèmen</h1>
                <p className="text-white/50 text-sm">Mèsi pou enterè w.</p>
                <Link href="/" className="text-primary hover:underline text-sm">Retounen lakay</Link>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark text-white gap-6 p-6">
                <div className="size-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center animate-in zoom-in duration-500">
                    <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black">Mèsi pou repons ou!</h1>
                    <p className="text-white/50 max-w-sm">Repons ou te anrejistre avèk siksè. Nou apresye pran tan ou pou patisipe.</p>
                </div>
                <Link href="/" className="px-6 py-3 bg-primary text-white rounded-full font-bold text-sm hover:opacity-90 transition-opacity">
                    Retounen sou sit la
                </Link>
            </div>
        );
    }

    const setAnswer = (qId: string, value: string, isCheckbox = false) => {
        if (isCheckbox) {
            const prev = (answers[qId] as string[]) || [];
            const next = prev.includes(value)
                ? prev.filter(v => v !== value)
                : [...prev, value];
            setAnswers(a => ({ ...a, [qId]: next }));
        } else {
            setAnswers(a => ({ ...a, [qId]: value }));
        }
        if (errors[qId]) setErrors(e => { const n = { ...e }; delete n[qId]; return n; });
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (survey.collectEmail && !email.trim()) newErrors["email"] = "Imèl obligatwa";
        if (survey.collectPhone && !phone.trim()) newErrors["phone"] = "Nimewo telefòn obligatwa";
        survey.questions.forEach(q => {
            if (!q.required) return;
            const ans = answers[q.id];
            if (!ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === "string" && !ans.trim())) {
                newErrors[q.id] = "Repons sa a obligatwa";
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            await submitSurveyResponse(id, {
                email: email || undefined,
                phone: phone || undefined,
                answers,
            });
            setSubmitted(true);
        } catch {
            setErrorPopup("Gen yon erè koneksyon. Tanpri verifye entènèt ou epi eseye ankò.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-dark text-white py-12 px-4">
            {/* Error Popup */}
            {errorPopup && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setErrorPopup(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="size-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-black text-gray-900">Oops!</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{errorPopup}</p>
                        </div>
                        <button
                            onClick={() => setErrorPopup(null)}
                            className="w-full py-3 bg-red-500 text-white rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                            Eseye Ankò
                        </button>
                    </div>
                </div>
            )}
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header card */}
                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-black uppercase tracking-widest mb-3">
                        <span className="material-symbols-outlined text-sm">poll</span>
                        <span>Sondaj</span>
                    </div>
                    <h1 className="text-3xl font-black leading-tight">{survey.title}</h1>
                    {survey.description && (
                        <p className="text-white/60 text-sm leading-relaxed pt-1">{survey.description}</p>
                    )}
                </div>

                {/* Contact fields */}
                {(survey.collectEmail || survey.collectPhone) && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-4">
                        <p className="text-xs font-black uppercase tracking-widest text-white/40">Enfòmasyon Kontakt</p>
                        {survey.collectEmail && (
                            <div>
                                <label className="text-sm font-bold text-white/70 mb-1 block">Adrès Imèl *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(er => { const n = { ...er }; delete n.email; return n; }); }}
                                    placeholder="ou@egzanp.com"
                                    className={`w-full bg-white/5 border ${errors.email ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-white/20`}
                                />
                                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                            </div>
                        )}
                        {survey.collectPhone && (
                            <div>
                                <label className="text-sm font-bold text-white/70 mb-1 block">Nimewo Telefòn *</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => { setPhone(e.target.value); if (errors.phone) setErrors(er => { const n = { ...er }; delete n.phone; return n; }); }}
                                    placeholder="+509 3700 0000"
                                    className={`w-full bg-white/5 border ${errors.phone ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-white/20`}
                                />
                                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* Questions */}
                {survey.questions.map((q, idx) => (
                    <div key={q.id} className={`bg-white/[0.03] border ${errors[q.id] ? "border-red-500/30" : "border-white/10"} rounded-3xl p-6 space-y-4`}>
                        <div className="flex items-start gap-3">
                            <span className="size-7 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                            </span>
                            <div>
                                <p className="font-bold text-white leading-snug">
                                    {q.text}
                                    {q.required && <span className="text-red-400 ml-1">*</span>}
                                </p>
                                {errors[q.id] && <p className="text-red-400 text-xs mt-1">{errors[q.id]}</p>}
                            </div>
                        </div>

                        {q.type === "text" && (
                            <textarea
                                value={(answers[q.id] as string) || ""}
                                onChange={e => setAnswer(q.id, e.target.value)}
                                placeholder="Repons ou..."
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-white/20"
                            />
                        )}

                        {(q.type === "radio" || q.type === "checkbox") && (
                            <div className="space-y-2 pl-10">
                                {(q.options || []).map(opt => {
                                    const isSelected = q.type === "radio"
                                        ? answers[q.id] === opt
                                        : ((answers[q.id] as string[]) || []).includes(opt);
                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => setAnswer(q.id, opt, q.type === "checkbox")}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                                ? "border-primary/50 bg-primary/10 text-white"
                                                : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:bg-white/5"
                                                }`}
                                        >
                                            <span className={`size-5 rounded-${q.type === "radio" ? "full" : "md"} border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "border-primary bg-primary" : "border-white/30"}`}>
                                                {isSelected && (
                                                    <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        {q.type === "radio" ? "circle" : "check"}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-sm font-medium">{opt}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-4 bg-primary text-white rounded-full font-black text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                >
                    {submitting ? (
                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>Voye Repons Mwen</span>
                            <span className="material-symbols-outlined text-xl">send</span>
                        </>
                    )}
                </button>

                <p className="text-center text-xs text-white/20 pb-8">
                    Repons ou a konfidansyèl epi itilize pou amelyore sèvis nou yo.
                </p>
            </div>
        </div>
    );
}

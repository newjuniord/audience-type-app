"use client";

import { useState, useEffect, useCallback } from "react";
import {
    getSurveys,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    getSurveyResponses,
    Survey,
    SurveyQuestion,
    SurveyResponse,
} from "@/lib/surveys";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/context/ToastContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function newQuestion(): SurveyQuestion {
    return {
        id: crypto.randomUUID(),
        text: "",
        type: "radio",
        options: ["", ""],
        required: false,
    };
}

// ─── Drawer: Create / Edit ────────────────────────────────────────────────────
function SurveyDrawer({
    survey,
    onClose,
    onSaved,
}: {
    survey: Survey | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!survey?.id;
    const [title, setTitle] = useState(survey?.title || "");
    const [description, setDescription] = useState(survey?.description || "");
    const [collectEmail, setCollectEmail] = useState(survey?.collectEmail ?? false);
    const [collectPhone, setCollectPhone] = useState(survey?.collectPhone ?? false);
    const [isActive, setIsActive] = useState(survey?.isActive ?? true);
    const [questions, setQuestions] = useState<SurveyQuestion[]>(
        survey?.questions?.length ? survey.questions : [newQuestion()]
    );
    const [saving, setSaving] = useState(false);

    const addQuestion = () => setQuestions(prev => [...prev, newQuestion()]);
    const removeQuestion = (id: string) => setQuestions(prev => prev.filter(q => q.id !== id));

    const updateQ = (id: string, patch: Partial<SurveyQuestion>) =>
        setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)));

    const addOption = (qid: string) =>
        setQuestions(prev =>
            prev.map(q => (q.id === qid ? { ...q, options: [...(q.options || []), ""] } : q))
        );

    const removeOption = (qid: string, idx: number) =>
        setQuestions(prev =>
            prev.map(q =>
                q.id === qid
                    ? { ...q, options: (q.options || []).filter((_, i) => i !== idx) }
                    : q
            )
        );

    const updateOption = (qid: string, idx: number, val: string) =>
        setQuestions(prev =>
            prev.map(q =>
                q.id === qid
                    ? { ...q, options: (q.options || []).map((o, i) => (i === idx ? val : o)) }
                    : q
            )
        );

    const handleSave = async () => {
        if (!title.trim()) return alert("Mete yon tit pou sondaj la.");
        setSaving(true);
        try {
            const payload = {
                title,
                description,
                collectEmail,
                collectPhone,
                isActive,
                questions,
                createdAt: survey?.createdAt || new Date().toISOString(),
            };
            if (isEdit && survey?.id) {
                await updateSurvey(survey.id, payload);
            } else {
                await createSurvey(payload);
            }
            onSaved();
            onClose();
        } catch {
            alert("Gen yon erè, tanpri eseye ankò.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-black">
                        {isEdit ? "Modifye Sondaj" : "Kreye yon Sondaj"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Title & Description */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Tit Sondaj *</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Eks: Èske w enterese nan klas la ?"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Deskripsyon</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Eksplike bi sondaj la..."
                                rows={3}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Contact & Status toggles */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Opsyon Kontakt & Eta</p>
                        {[
                            { label: "Mande Imèl", desc: "Rekolte adrès imèl moun ki repon", value: collectEmail, setter: setCollectEmail },
                            { label: "Mande Telefòn", desc: "Rekolte nimewo telefòn", value: collectPhone, setter: setCollectPhone },
                            { label: "Aktif (Piblik)", desc: "Moun ka wè ak repon sondaj la", value: isActive, setter: setIsActive },
                        ].map(item => (
                            <label key={item.label} className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="text-sm font-bold text-gray-700">{item.label}</p>
                                    <p className="text-xs text-gray-400">{item.desc}</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={!!item.value}
                                    onChange={e => item.setter(e.target.checked)}
                                    className="sr-only peer"
                                    id={item.label}
                                />
                                <label htmlFor={item.label} className="relative w-11 h-6 bg-gray-200 peer-checked:bg-primary rounded-full cursor-pointer transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></label>
                            </label>
                        ))}
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Kesyon yo ({questions.length})</p>
                            <button
                                onClick={addQuestion}
                                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                Ajoute Kesyon
                            </button>
                        </div>

                        {questions.map((q, qIdx) => (
                            <div key={q.id} className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white">
                                <div className="flex items-start gap-2">
                                    <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-1">
                                        {qIdx + 1}
                                    </span>
                                    <input
                                        value={q.text}
                                        onChange={e => updateQ(q.id, { text: e.target.value })}
                                        placeholder="Ekri kesyon ou a..."
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                    <button onClick={() => removeQuestion(q.id)} className="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg text-gray-400 shrink-0">
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>

                                {/* Type selector */}
                                <div className="flex items-center gap-3 pl-8">
                                    <span className="text-xs font-bold text-gray-400">Tip:</span>
                                    {(["radio", "checkbox", "text"] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => updateQ(q.id, { type: t })}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${q.type === t ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                        >
                                            {t === "radio" ? "Yon sèl repons" : t === "checkbox" ? "Plizyè repons" : "Tèks lib"}
                                        </button>
                                    ))}
                                    <label className="ml-auto flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!q.required}
                                            onChange={e => updateQ(q.id, { required: e.target.checked })}
                                            className="rounded"
                                        />
                                        Obligatwa
                                    </label>
                                </div>

                                {/* Options for radio/checkbox */}
                                {(q.type === "radio" || q.type === "checkbox") && (
                                    <div className="pl-8 space-y-2">
                                        {(q.options || []).map((opt, oi) => (
                                            <div key={oi} className="flex items-center gap-2">
                                                <span className={`size-4 rounded-${q.type === "radio" ? "full" : "sm"} border-2 border-gray-300 shrink-0`} />
                                                <input
                                                    value={opt}
                                                    onChange={e => updateOption(q.id, oi, e.target.value)}
                                                    placeholder={`Opsyon ${oi + 1}`}
                                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                />
                                                {(q.options || []).length > 2 && (
                                                    <button onClick={() => removeOption(q.id, oi)} className="text-gray-300 hover:text-red-400">
                                                        <span className="material-symbols-outlined text-base">close</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => addOption(q.id)}
                                            className="text-xs text-primary font-bold hover:underline pl-6"
                                        >
                                            + Ajoute opsyon
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-full font-bold text-sm text-gray-600 hover:bg-gray-50">
                        Anile
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 bg-primary text-white rounded-full font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : null}
                        {isEdit ? "Anrejistre" : "Kreye Sondaj"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Drawer: View Responses ───────────────────────────────────────────────────
function ResponsesDrawer({ survey, onClose }: { survey: Survey; onClose: () => void }) {
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loadingResponses, setLoadingResponses] = useState(true);

    useEffect(() => {
        if (survey.id) {
            getSurveyResponses(survey.id).then(res => {
                setResponses(res);
                setLoadingResponses(false);
            });
        }
    }, [survey.id]);

    return (
        <div className="fixed inset-0 z-[60] flex">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black">{survey.title}</h2>
                        <p className="text-sm text-gray-400">{responses.length} repons resevwa</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {loadingResponses ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : responses.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                        <span className="material-symbols-outlined text-5xl">inbox</span>
                        <p className="font-bold">Okenn repons pou kounye a</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {responses.map((resp, idx) => (
                            <div key={resp.id} className="border border-gray-100 rounded-2xl p-5 space-y-3 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Repons #{idx + 1}</span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(resp.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>

                                {/* Contact info */}
                                {(resp.email || resp.phone) && (
                                    <div className="flex flex-wrap gap-2">
                                        {resp.email && (
                                            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                                                <span className="material-symbols-outlined text-xs">mail</span>
                                                {resp.email}
                                            </span>
                                        )}
                                        {resp.phone && (
                                            <span className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full font-medium">
                                                <span className="material-symbols-outlined text-xs">call</span>
                                                {resp.phone}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Answers */}
                                {survey.questions.map(q => {
                                    const answer = resp.answers?.[q.id];
                                    // Une réponse "0" (note, échelle) est valide : ne filtrer que le vide réel.
                                    if (answer === undefined || answer === null || answer === "") return null;
                                    return (
                                        <div key={q.id}>
                                            <p className="text-xs font-bold text-gray-500 mb-1">{q.text}</p>
                                            {Array.isArray(answer) ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {answer.map(a => (
                                                        <span key={a} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{a}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-700 font-medium">{answer as string}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SurveysPage() {
    const { showToast } = useToast();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerSurvey, setDrawerSurvey] = useState<Survey | null | "new">(null);
    const [responsesSurvey, setResponsesSurvey] = useState<Survey | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setSurveys(await getSurveys());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteSurvey(deleteId);
            setDeleteId(null);
            load();
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleActive = async (survey: Survey) => {
        if (!survey.id) return;
        await updateSurvey(survey.id, { isActive: !survey.isActive });
        load();
    };

    const shareLink = (id: string) => {
        const url = `${window.location.origin}/survey/${id}`;
        navigator.clipboard.writeText(url);
        showToast("Lyen an kopye avèk siksè!", "success");
    };

    return (
        <main className="flex flex-col h-full animate-in fade-in duration-700">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">Sondaj</h2>
                    <p className="text-slate-500 mt-1">Kreye sondaj pou valide yon ide oswa rekolte opinyon.</p>
                </div>
                <button
                    onClick={() => setDrawerSurvey("new")}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-base">add</span>
                    Nouvo Sondaj
                </button>
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
                </div>
            ) : surveys.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 bg-white rounded-2xl border border-gray-100">
                    <span className="material-symbols-outlined text-6xl">poll</span>
                    <p className="font-bold text-lg">Pa gen sondaj pou kounye a</p>
                    <button onClick={() => setDrawerSurvey("new")} className="px-5 py-2 bg-primary text-white rounded-full text-sm font-bold hover:opacity-90">
                        Kreye premye sondaj ou
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {surveys.map(survey => (
                        <div key={survey.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-gray-900 truncate">{survey.title}</h3>
                                    {survey.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{survey.description}</p>
                                    )}
                                </div>
                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${survey.isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                                    {survey.isActive ? "Aktif" : "Inaktif"}
                                </span>
                            </div>

                            {/* Stats */}
                            <div className="flex gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm text-primary">quiz</span>
                                    {survey.questions?.length || 0} kesyon
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm text-primary">group</span>
                                    {survey.responseCount || 0} repons
                                </span>
                                {survey.collectEmail && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-blue-400">mail</span>Imèl</span>}
                                {survey.collectPhone && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-green-400">call</span>Tel</span>}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-auto">
                                <button
                                    onClick={() => setResponsesSurvey(survey)}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-gray-100 rounded-full text-xs font-bold text-gray-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">bar_chart</span>
                                    Repons
                                </button>
                                <button
                                    onClick={() => survey.id && shareLink(survey.id)}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 hover:bg-blue-100 rounded-full text-xs font-bold text-blue-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">share</span>
                                    Pataje
                                </button>
                                <button
                                    onClick={() => setDrawerSurvey(survey)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
                                    title="Modifye"
                                >
                                    <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button
                                    onClick={() => survey.id && setDeleteId(survey.id)}
                                    className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500"
                                    title="Efase"
                                >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Drawers */}
            {drawerSurvey !== null && (
                <SurveyDrawer
                    survey={drawerSurvey === "new" ? null : drawerSurvey}
                    onClose={() => setDrawerSurvey(null)}
                    onSaved={load}
                />
            )}
            {responsesSurvey && (
                <ResponsesDrawer survey={responsesSurvey} onClose={() => setResponsesSurvey(null)} />
            )}

        </main>
    );
}

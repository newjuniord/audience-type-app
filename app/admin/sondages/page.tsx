"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
    id: string;
    text: string;
    type: "select" | "text";
    options?: string[];
    placeholder?: string;
}

interface ResponseItem {
    id: string;
    userId: string;
    answers: Record<string, string>;
    createdAt: any;
}

interface Survey {
    id: string;
    title: string;
    image: string;
    questions: Question[];
    responsesCount: number;
    responses: ResponseItem[];
}

export default function AdminSondagesPage() {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);

    // Form Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
    const [formTitle, setFormTitle] = useState("");
    const [formImage, setFormImage] = useState("");
    const [formQuestions, setFormQuestions] = useState<Question[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Results Modal states
    const [viewingResultsSurvey, setViewingResultsSurvey] = useState<Survey | null>(null);

    // Delete Confirmation states
    const [deletingSurveyId, setDeletingSurveyId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchSurveys = async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;
            const res = await fetch("/api/admin/sondages", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setSurveys(data);
            }
        } catch (error) {
            console.error("Error loading surveys:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSurveys();
    }, []);

    const handleOpenCreate = () => {
        setEditingSurvey(null);
        setFormTitle("");
        setFormImage("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop");
        setFormQuestions([
            { id: "q_" + Date.now(), text: "", type: "select", options: ["Option 1", "Option 2"] }
        ]);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (survey: Survey) => {
        setEditingSurvey(survey);
        setFormTitle(survey.title);
        setFormImage(survey.image);
        setFormQuestions(survey.questions);
        setIsFormOpen(true);
    };

    const handleAddQuestion = () => {
        setFormQuestions([
            ...formQuestions,
            { id: "q_" + Date.now(), text: "", type: "select", options: ["Option 1", "Option 2"] }
        ]);
    };

    const handleRemoveQuestion = (index: number) => {
        setFormQuestions(formQuestions.filter((_, idx) => idx !== index));
    };

    const handleQuestionTypeChange = (index: number, type: "select" | "text") => {
        const updated = [...formQuestions];
        updated[index] = {
            ...updated[index],
            type,
            options: type === "select" ? ["Option 1", "Option 2"] : undefined,
            placeholder: type === "text" ? "Ekri repons pa w la la..." : undefined
        };
        setFormQuestions(updated);
    };

    const handleQuestionTextChange = (index: number, text: string) => {
        const updated = [...formQuestions];
        updated[index] = { ...updated[index], text };
        setFormQuestions(updated);
    };

    const handleAddOption = (qIdx: number) => {
        const updated = [...formQuestions];
        const currentOptions = updated[qIdx].options || [];
        updated[qIdx] = {
            ...updated[qIdx],
            options: [...currentOptions, `Option ${currentOptions.length + 1}`]
        };
        setFormQuestions(updated);
    };

    const handleRemoveOption = (qIdx: number, optIdx: number) => {
        const updated = [...formQuestions];
        const currentOptions = updated[qIdx].options || [];
        updated[qIdx] = {
            ...updated[qIdx],
            options: currentOptions.filter((_, idx) => idx !== optIdx)
        };
        setFormQuestions(updated);
    };

    const handleOptionTextChange = (qIdx: number, optIdx: number, val: string) => {
        const updated = [...formQuestions];
        const currentOptions = [...(updated[qIdx].options || [])];
        currentOptions[optIdx] = val;
        updated[qIdx] = {
            ...updated[qIdx],
            options: currentOptions
        };
        setFormQuestions(updated);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            alert("Veuillez saisir un titre.");
            return;
        }
        if (formQuestions.length === 0) {
            alert("Veuillez ajouter au moins une question.");
            return;
        }

        setIsSaving(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const url = "/api/admin/sondages";
            const method = editingSurvey ? "PUT" : "POST";
            const payload = editingSurvey
                ? { id: editingSurvey.id, title: formTitle, image: formImage, questions: formQuestions }
                : { title: formTitle, image: formImage, questions: formQuestions };

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsFormOpen(false);
                fetchSurveys();
            } else {
                const err = await res.json();
                alert(err.error || "Erreur lors de l'enregistrement.");
            }
        } catch (error) {
            console.error("Error saving survey:", error);
            alert("Erreur lors de l'enregistrement.");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deletingSurveyId) return;
        setIsDeleting(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/admin/sondages?id=${deletingSurveyId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (res.ok) {
                setSurveys(surveys.filter(s => s.id !== deletingSurveyId));
                setDeletingSurveyId(null);
            } else {
                alert("Erreur lors de la suppression.");
            }
        } catch (error) {
            console.error("Error deleting survey:", error);
            alert("Erreur lors de la suppression.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-gray-900">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
                            <span className="material-symbols-outlined text-white text-xl">poll</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">Gestion des Sondages</h1>
                    </div>
                    <p className="text-sm text-black/50">Créez, modifiez les sondages et observez les réponses des utilisateurs.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Créer un sondage
                </button>
            </div>

            {/* Grid display */}
            {surveys.length === 0 ? (
                <div className="bg-white border border-black/5 rounded-2xl p-16 text-center">
                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl text-orange-400">poll</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2">Aucun sondage créé</h3>
                    <p className="text-sm text-black/40 mb-6 max-w-sm mx-auto">
                        Mettez en place votre premier sondage pour recueillir de précieux avis et commentaires.
                    </p>
                    <button onClick={handleOpenCreate} className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-all">
                        Créer mon premier sondage
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {surveys.map(survey => (
                        <div key={survey.id} className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            {/* Banner Image */}
                            <div className="h-40 bg-gray-100 overflow-hidden relative">
                                <img src={survey.image} alt={survey.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                <span className="absolute bottom-3 left-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                                    {survey.questions.length} question{survey.questions.length > 1 ? "s" : ""}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                                <div>
                                    <h3 className="font-bold text-lg mb-1 leading-tight text-gray-800">{survey.title}</h3>
                                    <div className="flex items-center gap-1.5 text-xs text-black/40 mt-1">
                                        <span className="material-symbols-outlined text-sm">group</span>
                                        <span>{survey.responsesCount} participants</span>
                                    </div>
                                </div>

                                {/* Actions buttons */}
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                    <button
                                        onClick={() => setViewingResultsSurvey(survey)}
                                        className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-base">bar_chart</span>
                                        Voir les Résultats
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenEdit(survey)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:text-primary hover:bg-primary/10 transition-all"
                                            title="Modifier"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                        <button
                                            onClick={() => setDeletingSurveyId(survey.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                            title="Supprimer"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* FORM MODAL (Create/Edit) */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl w-full max-w-[680px] p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[85vh]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold tracking-tight">
                                    {editingSurvey ? "Modifier le sondage" : "Créer un sondage"}
                                </h3>
                                <button
                                    onClick={() => setIsFormOpen(false)}
                                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-black/50">Titre du Sondage</label>
                                    <input
                                        type="text"
                                        value={formTitle || ""}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="Ex: AI ak Kreyasyon Kontni"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-black/50">Lien Image Bannière</label>
                                    <input
                                        type="text"
                                        value={formImage || ""}
                                        onChange={(e) => setFormImage(e.target.value)}
                                        placeholder="URL de l'image"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                        required
                                    />
                                </div>

                                {/* Questions Section */}
                                <div className="space-y-4 pt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-black/50">Questions</h4>
                                        <button
                                            type="button"
                                            onClick={handleAddQuestion}
                                            className="text-xs font-bold text-primary flex items-center gap-1 hover:opacity-85"
                                        >
                                            <span className="material-symbols-outlined text-base">add</span>
                                            Ajouter Question
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {formQuestions.map((q, qIdx) => (
                                            <div key={q.id} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl relative space-y-4">
                                                {/* Delete question button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveQuestion(qIdx)}
                                                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Supprimer Question"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>

                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-2 space-y-1.5">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Texte de la Question</label>
                                                        <input
                                                            type="text"
                                                            value={q.text || ""}
                                                            onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                                                            placeholder="Ki nivo ou nan itilize IA ?"
                                                            className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Type</label>
                                                        <select
                                                            value={q.type}
                                                            onChange={(e) => handleQuestionTypeChange(qIdx, e.target.value as "select" | "text")}
                                                            className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none"
                                                        >
                                                            <option value="select">Choix Multiple</option>
                                                            <option value="text">Texte Libre</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Options if select type */}
                                                {q.type === "select" && (
                                                    <div className="space-y-2.5">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Options de réponse</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddOption(qIdx)}
                                                                className="text-[10px] font-bold text-primary hover:opacity-85"
                                                            >
                                                                + Ajouter option
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {(q.options || []).map((opt, optIdx) => (
                                                                <div key={optIdx} className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={opt || ""}
                                                                        onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                                                                        placeholder={`Option ${optIdx + 1}`}
                                                                        className="flex-1 bg-white border border-gray-200 rounded-xl p-2 text-xs focus:outline-none focus:border-primary"
                                                                        required
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveOption(qIdx, optIdx)}
                                                                        disabled={(q.options || []).length <= 1}
                                                                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                                                    >
                                                                        <span className="material-symbols-outlined text-base">close</span>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full h-12 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? "Enregistrement..." : "Enregistrer le Sondage"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* RESULTS DETAILS MODAL */}
            <AnimatePresence>
                {viewingResultsSurvey && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl w-full max-w-[760px] p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[85vh] text-gray-800"
                        >
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight text-gray-800">{viewingResultsSurvey.title}</h3>
                                    <p className="text-xs text-black/50 mt-1">{viewingResultsSurvey.responsesCount} participants ont répondu</p>
                                </div>
                                <button
                                    onClick={() => setViewingResultsSurvey(null)}
                                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <div className="space-y-8">
                                {viewingResultsSurvey.questions.map((question, qIdx) => {
                                    // Calculate stats for select
                                    const selectStats: Record<string, number> = {};
                                    const textAnswers: string[] = [];

                                    if (question.type === "select") {
                                        // Initialize all options to zero
                                        question.options?.forEach(opt => {
                                            selectStats[opt] = 0;
                                        });

                                        viewingResultsSurvey.responses.forEach(resp => {
                                            const ans = resp.answers[question.id];
                                            if (ans) {
                                                selectStats[ans] = (selectStats[ans] || 0) + 1;
                                            }
                                        });
                                    } else {
                                        viewingResultsSurvey.responses.forEach(resp => {
                                            const ans = resp.answers[question.id];
                                            if (ans && ans.trim()) {
                                                textAnswers.push(ans);
                                            }
                                        });
                                    }

                                    return (
                                        <div key={question.id} className="space-y-4">
                                            <h4 className="text-sm font-bold text-gray-700 flex gap-2">
                                                <span className="text-primary font-black">Q{qIdx + 1}.</span>
                                                {question.text}
                                            </h4>

                                            {question.type === "select" ? (
                                                <div className="space-y-3 pl-4">
                                                    {question.options?.map((opt, optIdx) => {
                                                        const votes = selectStats[opt] || 0;
                                                        const pct = viewingResultsSurvey.responsesCount > 0
                                                            ? Math.round((votes / viewingResultsSurvey.responsesCount) * 100)
                                                            : 0;

                                                        return (
                                                            <div key={optIdx} className="space-y-1">
                                                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                                                    <span>{opt}</span>
                                                                    <span>{votes} vote{votes > 1 ? "s" : ""} ({pct}%)</span>
                                                                </div>
                                                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden w-full">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all"
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="pl-4 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                                    {textAnswers.length === 0 ? (
                                                        <p className="text-xs italic text-black/40">Aucun commentaire rédigé pour le moment.</p>
                                                    ) : (
                                                        textAnswers.map((ans, aIdx) => (
                                                            <div key={aIdx} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs leading-relaxed text-gray-600">
                                                                {ans}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DELETE CONFIRMATION MODAL */}
            <AnimatePresence>
                {deletingSurveyId && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl w-full max-w-[440px] p-6 md:p-8 shadow-2xl text-center text-gray-800 space-y-6"
                        >
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 shadow-inner">
                                <span className="material-symbols-outlined text-3xl">warning</span>
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold tracking-tight">Supprimer le sondage</h3>
                                <p className="text-sm text-black/50 leading-relaxed">
                                    Voulez-vous vraiment supprimer ce sondage ? Les réponses associées seront perdues.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setDeletingSurveyId(null)}
                                    disabled={isDeleting}
                                    className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isDeleting ? "Suppression..." : "Supprimer"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

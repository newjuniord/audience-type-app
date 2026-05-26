"use client";

import { useState } from "react";
import { Module, Lesson } from "@/lib/types";

interface SyllabusProps {
    modules?: Module[];
    currentLessonId?: string;
    completedLessons?: string[];
    onLessonSelect?: (lesson: Lesson) => void;
}

export default function Syllabus({ modules = [], currentLessonId, completedLessons = [], onLessonSelect = () => { } }: SyllabusProps) {
    const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.id || null);

    const isLessonCompleted = (lessonId: string) => completedLessons.includes(lessonId);

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold tracking-tight">Pwogram kou a</h3>
                <span className="text-sm text-zinc-500 font-medium">
                    {completedLessons.length}/{modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} leson fini
                </span>
            </div>
            {modules.map((mod, index) => (
                <div key={mod.id || index} className={`border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-background-dark/50 ${mod.id !== expandedModule ? "opacity-60 hover:opacity-100 transition-opacity" : ""}`}>
                    <button
                        onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id || null)}
                        className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left group"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 size-8 flex items-center justify-center rounded-lg">{(index + 1) < 10 ? `0${index + 1}` : index + 1}</span>
                            <div>
                                <p className="text-sm font-bold tracking-tight">{mod.title}</p>
                                <p className="text-xs text-zinc-500 font-medium">{mod.lessons?.length || 0} leson • {mod.duration || ""}</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-zinc-400 group-hover:text-primary dark:group-hover:text-white transition-colors">
                            {expandedModule === mod.id ? "expand_less" : "expand_more"}
                        </span>
                    </button>
                    {expandedModule === mod.id && mod.lessons && mod.lessons.length > 0 && (
                        <div className="border-t border-zinc-100 dark:border-zinc-800">
                            {mod.lessons.map((lesson, lIndex) => {
                                const lessonKey = lesson.id ? lesson.id : `lesson-${index}-${lIndex}`;
                                const isCurrent = lesson.id === currentLessonId;
                                // Relaxed check: if lesson has ID check completion, otherwise false
                                const isCompleted = lesson.id ? isLessonCompleted(lesson.id) : false;

                                return (
                                    <div
                                        key={lessonKey}
                                        onClick={() => onLessonSelect(lesson)}
                                        className={`flex items-center justify-between p-5 border-l-4 transition-all cursor-pointer ${isCurrent
                                            ? "bg-zinc-50 dark:bg-zinc-900 border-primary"
                                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900 border-transparent"
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {isCurrent ? (
                                                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                                            ) : isCompleted ? (
                                                <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-zinc-300 dark:text-zinc-700">radio_button_unchecked</span>
                                            )}
                                            <div>
                                                <p className={`text-sm font-bold ${isCurrent ? "text-primary dark:text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                                                    {lesson.title}
                                                </p>
                                                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                                                    {isCurrent && "Ap jwe kounye a"}
                                                    {!isCurrent && isCompleted && "Fini ✓"}
                                                    {!isCurrent && !isCompleted && "Pa ankò jwe"}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-zinc-500">{lesson.duration}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ))}
        </section>
    );
}

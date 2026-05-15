"use client";

import { useState, useEffect } from "react";
import VideoPlayer from "./VideoPlayer";

interface LessonDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    lesson?: {
        id?: string;
        title: string;
        description: string;
        videoUrl: string;
        resourceFileUrl?: string;
        duration?: string; // "15 min"
        formattedDuration?: string;
    } | null;
    onSave: (data: { title: string; description: string; videoUrl: string; resourceFileUrl: string; duration: string }) => Promise<void>;
}

export default function LessonDrawer({ isOpen, onClose, lesson, onSave }: LessonDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [resourceFileUrl, setResourceFileUrl] = useState("");
    const [duration, setDuration] = useState("");

    // Reset state when opening/closing or changing lesson
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
            if (lesson) {
                setTitle(lesson.title);
                setDescription(lesson.description);
                setVideoUrl(lesson.videoUrl);
                setResourceFileUrl(lesson.resourceFileUrl || "");
                // Extract minutes from "XX min"
                const minutes = lesson.duration ? String(lesson.duration).replace(/\D/g, '') : "";
                setDuration(minutes);
            } else {
                // Defaults for new lesson
                setTitle("");
                setDescription("");
                setVideoUrl("");
                setResourceFileUrl("");
                setDuration("");
            }
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen, lesson]);

    if (!isVisible && !isOpen) return null;

    const handleSave = async () => {
        try {
            setLoading(true);
            await onSave({ title, description, videoUrl, resourceFileUrl, duration });
            onClose();
        } catch (error) {
            console.error("Error saving lesson:", error);
            alert("Failed to save lesson.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] transition-all duration-700 overflow-hidden ${isOpen ? 'visible' : 'invisible delay-700'}`}>
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-[2px] transition-opacity duration-700 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`absolute top-0 right-0 h-full w-full max-w-[500px] bg-white dark:bg-background-dark shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-none flex flex-col transform transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-8 py-8 border-b border-black/5 dark:border-white/5 transition-all duration-700 delay-100 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">{lesson ? "Modifier la leçon" : "Nouvelle leçon"}</h2>
                        <p className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mt-1">Gérer le contenu et les ressources</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group"
                    >
                        <span className="material-symbols-outlined text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white">close</span>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar">

                    {/* Lesson Title */}
                    <section className={`transition-all duration-700 delay-200 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-4">Lesson Title</label>
                        <input
                            className="w-full px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all text-sm font-medium"
                            placeholder="e.g. Intro to Typography"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </section>

                    {/* Description */}
                    <section className={`transition-all duration-700 delay-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-4">Description</label>
                        <textarea
                            className="w-full px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-white/10 transition-all text-sm font-medium resize-none shadow-sm"
                            placeholder="Briefly describe what this lesson covers..."
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                    </section>

                    {/* Duration */}
                    <section className={`transition-all duration-700 delay-[350ms] ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-4">Duration (minutes)</label>
                        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03]">
                            <span className="material-symbols-outlined text-black/20 dark:text-white/20">schedule</span>
                            <input
                                className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                                placeholder="e.g. 15"
                                type="number"
                                min="0"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                            />
                            <span className="text-xs font-bold text-black/40 dark:text-white/40">min</span>
                        </div>
                    </section>

                    {/* Video URL */}
                    <section className={`transition-all duration-700 delay-[400ms] ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-4">Video URL</label>
                        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03]">
                            <span className="material-symbols-outlined text-black/20 dark:text-white/20">link</span>
                            <input
                                className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                                placeholder="https://vimeo.com/..."
                                type="text"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                            />
                        </div>
                    </section>

                    {/* Video Preview */}
                    <section className={`transition-all duration-700 delay-[450ms] ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-4">Video Preview</label>
                        <div className="w-full aspect-video rounded-3xl bg-black/10 dark:bg-white/10 overflow-hidden relative group">
                            <VideoPlayer url={videoUrl} roundedClassName="rounded-none" className="h-full object-cover" />
                        </div>
                    </section>

                    {/* Resource URL */}
                    <section className={`transition-all duration-700 delay-500 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <label className="block text-[10px] font-black uppercase text-black/40 dark:text-white/40 tracking-widest mb-4">Resource File URL</label>
                        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03]">
                            <span className="material-symbols-outlined text-black/20 dark:text-white/20">attach_file</span>
                            <input
                                className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                                placeholder="https://example.com/files/resource.pdf"
                                type="text"
                                value={resourceFileUrl}
                                onChange={(e) => setResourceFileUrl(e.target.value)}
                            />
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className={`px-8 py-8 border-t border-black/5 dark:border-white/5 bg-white dark:bg-background-dark flex items-center gap-4 transition-all duration-700 delay-[600ms] ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 py-4 bg-primary dark:bg-white text-white dark:text-primary rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/10 dark:shadow-white/5 disabled:opacity-50">
                        {loading ? "Enregistrement..." : "Enregistrer la leçon"}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-black/[0.05] dark:bg-white/[0.1] text-black dark:text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-black/[0.1] dark:hover:bg-white/[0.2] transition-colors"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
}

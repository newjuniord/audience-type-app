"use client";

import { useState, useEffect, use } from "react";
import LessonDrawer from "@/components/LessonDrawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Link from "next/link";
import { getCourse, getModules, addModule, updateModule, updateModuleLessons, deleteModule } from "@/lib/courses";
import { Course, Module, Lesson } from "@/lib/types";

export default function CourseSyllabusPage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = use(params);

    // Data State
    const [course, setCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [expandedModules, setExpandedModules] = useState<string[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<any>(null); // Ideally strictly typed as Lesson but drawer expects slightly different shape if needed
    const [isLessonDrawerOpen, setIsLessonDrawerOpen] = useState(false);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

    // Delete Confirmation State
    const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);
    const [lessonToDelete, setLessonToDelete] = useState<{ moduleId: string, lessonId: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const [courseData, modulesData] = await Promise.all([
            getCourse(courseId),
            getModules(courseId)
        ]);
        setCourse(courseData);
        setModules(modulesData);

        // Expand first module by default if exists
        if (modulesData.length > 0 && expandedModules.length === 0) {
            setExpandedModules([modulesData[0].id || ""]);
            // Optionally select the first lesson of the first module
            if (modulesData[0].lessons && modulesData[0].lessons.length > 0) {
                setActiveLesson(modulesData[0].lessons[0]);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        if (courseId) {
            loadData();
        }
    }, [courseId]);

    const toggleModule = (moduleId: string) => {
        if (!moduleId) return;
        setExpandedModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    // Module Management
    const handleAddModule = async () => {
        try {
            const newModule: Partial<Module> = {
                title: "New Module",
                duration: "0m",
                lessons: []
            };
            await addModule(courseId, newModule);
            await loadData(); // Reload to get new ID
        } catch (error) {
            console.error("Failed to add module", error);
        }
    };

    const handleUpdateModuleTitle = async (moduleId: string, newTitle: string) => {
        // Optimistic update
        setModules(modules.map(m => m.id === moduleId ? { ...m, title: newTitle } : m));
        try {
            await updateModule(courseId, moduleId, { title: newTitle });
        } catch (error) {
            console.error("Failed to update module title", error);
            loadData(); // Revert on error
        }
    };

    const handleDeleteModule = (moduleId: string) => {
        setModuleToDelete(moduleId);
    };

    const confirmDeleteModule = async () => {
        if (!moduleToDelete) return;
        setIsDeleting(true);
        try {
            await deleteModule(courseId, moduleToDelete);
            setModules(modules.filter(m => m.id !== moduleToDelete));
            setModuleToDelete(null);
        } catch (error) {
            console.error("Failed to delete module", error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Lesson Management
    const handleAddLesson = (moduleId: string) => {
        setActiveModuleId(moduleId);
        setSelectedLesson(null); // Clear selection for new lesson
        setIsLessonDrawerOpen(true);
    };

    const handleEditLesson = (moduleId: string, lesson: Lesson) => {
        setActiveModuleId(moduleId);
        setSelectedLesson(lesson);
        setIsLessonDrawerOpen(true);
    };

    const handleSaveLesson = async (data: { title: string; description: string; videoUrl: string; resourceFileUrl: string; duration: string }) => {
        if (!activeModuleId) return;

        const moduleToUpdate = modules.find(m => m.id === activeModuleId);
        if (!moduleToUpdate || !moduleToUpdate.id) return;

        let updatedLessons: Lesson[];

        if (selectedLesson) {
            // Update existing lesson
            updatedLessons = moduleToUpdate.lessons.map(l => l.id === selectedLesson.id ? {
                ...l,
                ...data,
                duration: `${data.duration} min`
            } : l);
        } else {
            // Add new lesson
            const newLesson: Lesson = {
                id: `lesson-${Date.now()}`,
                title: data.title,
                duration: `${data.duration} min`,
                description: data.description,
                videoUrl: data.videoUrl,
                resourceFileUrl: data.resourceFileUrl,
                completed: false
            };
            updatedLessons = [...moduleToUpdate.lessons, newLesson];
        }

        try {
            await updateModuleLessons(courseId, moduleToUpdate.id, updatedLessons);

            // Local update for immediate feedback
            setModules(modules.map(m => m.id === activeModuleId ? { ...m, lessons: updatedLessons } : m));

            setActiveModuleId(null);
            setIsLessonDrawerOpen(false);
        } catch (error) {
            console.error("Failed to save lesson", error);
            alert("Failed to save lesson.");
        }
    };

    const handleDeleteLesson = (moduleId: string, lessonId: string) => {
        setLessonToDelete({ moduleId, lessonId });
    };

    const confirmDeleteLesson = async () => {
        if (!lessonToDelete) return;
        setIsDeleting(true);

        const moduleToUpdate = modules.find(m => m.id === lessonToDelete.moduleId);
        if (!moduleToUpdate || !moduleToUpdate.id) {
            setIsDeleting(false);
            return;
        }

        const updatedLessons = moduleToUpdate.lessons.filter(l => l.id !== lessonToDelete.lessonId);

        try {
            await updateModuleLessons(courseId, moduleToUpdate.id, updatedLessons);
            // Local update
            setModules(modules.map(m => m.id === lessonToDelete.moduleId ? { ...m, lessons: updatedLessons } : m));
            setLessonToDelete(null);
        } catch (error) {
            console.error("Failed to delete lesson", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewLesson = (lesson: Lesson) => {
        setActiveLesson(lesson);
        // Scroll to top or player could be nice, but maybe annoying if just browsing
    };

    // Helper to render video
    const renderVideoPlayer = (url: string) => {
        if (!url) {
            return (
                <div className="absolute inset-0 flex items-center justify-center text-black/20 dark:text-white/20 select-none">
                    <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-4xl">videocam_off</span>
                        <span className="text-xs font-bold uppercase tracking-widest">No Video URL</span>
                    </div>
                </div>
            );
        }

        // YouTube
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const youtubeMatch = url.match(youtubeRegex);

        // Vimeo
        const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
        const vimeoMatch = url.match(vimeoRegex);

        if (youtubeMatch) {
            return (
                <iframe
                    src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                    className="w-full h-full"
                    title="Video Player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            );
        } else if (vimeoMatch) {
            return (
                <iframe
                    src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                    className="w-full h-full"
                    title="Video Player"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                ></iframe>
            );
        }

        // Bunny.net
        const bunnyRegex = /https?:\/\/(?:www\.)?(?:player|iframe)\.mediadelivery\.net\/(?:embed|play)\/([\w-]+)\/([\w-]+)/;
        const bunnyMatch = url.match(bunnyRegex);

        if (bunnyMatch) {
            return (
                <iframe
                    src={`https://iframe.mediadelivery.net/embed/${bunnyMatch[1]}/${bunnyMatch[2]}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`}
                    loading="lazy"
                    className="w-full h-full"
                    title="Video Player"
                    frameBorder="0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                ></iframe>
            );
        } else {
            // HTML5 Fallback
            return (
                <video
                    src={url}
                    controls
                    className="w-full h-full object-cover bg-black"
                >
                    Your browser does not support the video tag.
                </video>
            );
        }
    };


    if (loading) return <div className="flex h-screen items-center justify-center text-4xl font-black opacity-10 animate-pulse">LOADING...</div>;
    if (!course) return <div className="flex h-screen items-center justify-center text-xl font-bold opacity-50">Course not found.</div>;

    return (
        <main className="max-w-6xl animate-in fade-in duration-700 pb-20">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 mb-8 text-sm font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">
                <Link href="/admin/courses" className="hover:text-primary dark:hover:text-white transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Courses
                </Link>
                <span>/</span>
                <span className="text-black dark:text-white">{course.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Content (Video & Lesson Info) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Video Player Area */}
                    <div className="aspect-video bg-black rounded-3xl overflow-hidden relative shadow-2xl shadow-black/20 group">
                        {activeLesson ? (
                            renderVideoPlayer(activeLesson.videoUrl)
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-4xl ml-1">play_arrow</span>
                                </div>
                            </div>
                        )}

                        {/* Overlay Controls (Optional, maybe keep simple for now) */}
                    </div>

                    {/* Current Lesson Info */}
                    {activeLesson ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                                    {/* Find which module this lesson belongs to */}
                                    {modules.find(m => m.lessons.some(l => l.id === activeLesson.id))?.title || "Module"}
                                </span>
                                <span className="w-1 h-1 bg-black/20 dark:bg-white/20 rounded-full"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                                    {activeLesson.duration || "0 min"}
                                </span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight mb-4">{activeLesson.title}</h1>
                            <p className="text-black/60 dark:text-white/60 leading-relaxed max-w-2xl whitespace-pre-wrap">
                                {activeLesson.description || "No description available."}
                            </p>

                            <div className="flex gap-4 mt-8">
                                <button className="bg-black dark:bg-white text-white dark:text-primary px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-opacity">
                                    <span className="material-symbols-outlined text-base">check_circle</span>
                                    Mark as Complete
                                </button>
                                {activeLesson.resourceFileUrl && (
                                    <a
                                        href={activeLesson.resourceFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black dark:text-white"
                                    >
                                        <span className="material-symbols-outlined text-base">download</span>
                                        Resource Files
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-3xl font-black tracking-tight mb-4">Select a lesson to view details</h1>
                            <p className="text-black/60 dark:text-white/60 leading-relaxed max-w-2xl">
                                Click on a lesson in the syllabus to view its content.
                            </p>
                        </div>
                    )}
                </div>

                {/* Syllabus Sidebar */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black tracking-tight">Course Syllabus</h2>
                        <p className="text-xs font-bold text-black/40 dark:text-white/40">
                            {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} Lessons
                        </p>
                    </div>

                    <div className="space-y-4">
                        {modules.map((module) => (
                            <div key={module.id} className="bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden">
                                <div className="p-6 bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-4 group/module">
                                    <button
                                        onClick={() => module.id && toggleModule(module.id)}
                                        className="flex-shrink-0"
                                    >
                                        <span className={`material-symbols-outlined text-black/40 dark:text-white/40 transition-transform duration-300 ${module.id && expandedModules.includes(module.id) ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </button>

                                    <div className="flex-1">
                                        <input
                                            value={module.title}
                                            onChange={(e) => module.id && handleUpdateModuleTitle(module.id, e.target.value)}
                                            className="w-full bg-transparent border-none p-0 text-sm font-black tracking-tight focus:ring-0"
                                        />
                                        <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mt-1">
                                            {module.lessons?.length || 0} Lessons • {module.duration}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => module.id && handleDeleteModule(module.id)}
                                        className="opacity-0 group-hover/module:opacity-100 p-2 text-black/20 hover:text-red-500 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>

                                <div className={`transition-all duration-300 ease-in-out ${module.id && expandedModules.includes(module.id) ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                    <div className="p-2 space-y-1">
                                        {module.lessons?.map((lesson: any) => (
                                            <div
                                                key={lesson.id}
                                                onClick={() => handleViewLesson(lesson)}
                                                className={`group relative flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer ${activeLesson?.id === lesson.id ? 'bg-primary/5 dark:bg-white/10' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'}`}
                                            >
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); module.id && handleEditLesson(module.id, lesson); }}
                                                        className="p-2 rounded-full bg-white dark:bg-black shadow-sm hover:text-primary transition-colors"
                                                        title="Edit Lesson"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); module.id && handleDeleteLesson(module.id, lesson.id); }}
                                                        className="p-2 rounded-full bg-white dark:bg-black shadow-sm hover:text-red-500 transition-colors"
                                                        title="Delete Lesson"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>

                                                <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0 text-[10px] font-black text-black/40 dark:text-white/40 group-hover:bg-primary group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-base">play_arrow</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate group-hover:text-primary dark:group-hover:text-white transition-colors">
                                                        {lesson.title}
                                                    </p>
                                                    <p className="text-[10px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest">
                                                        {lesson.duration}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add Lesson Button */}
                                        <button
                                            onClick={() => module.id && handleAddLesson(module.id)}
                                            className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 dark:text-white/60 hover:text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all border border-dashed border-black/10 dark:border-white/10"
                                        >
                                            <span className="material-symbols-outlined text-sm">add_circle</span>
                                            Add Lesson
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add Module Button */}
                        <button
                            onClick={handleAddModule}
                            className="w-full py-4 bg-black/5 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-black/40 dark:text-white/40 hover:text-primary dark:hover:text-white hover:border-primary/20 dark:hover:border-white/20 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                        >
                            <span className="material-symbols-outlined">library_add</span>
                            Create New Module
                        </button>
                    </div>
                </div>
            </div>

            <LessonDrawer
                isOpen={isLessonDrawerOpen}
                onClose={() => setIsLessonDrawerOpen(false)}
                lesson={selectedLesson}
                onSave={handleSaveLesson}
            />

            <ConfirmModal
                isOpen={!!moduleToDelete || !!lessonToDelete}
                onClose={() => {
                    if (!isDeleting) {
                        setModuleToDelete(null);
                        setLessonToDelete(null);
                    }
                }}
                onConfirm={moduleToDelete ? confirmDeleteModule : confirmDeleteLesson}
                title={moduleToDelete ? "Delete Module?" : "Delete Lesson?"}
                message={moduleToDelete
                    ? "This will permanently delete the module and all contained lessons."
                    : "Are you sure you want to delete this lesson? This action cannot be undone."}
                confirmText="Delete"
                isDanger={true}
                isLoading={isDeleting}
            />
        </main>
    );
}

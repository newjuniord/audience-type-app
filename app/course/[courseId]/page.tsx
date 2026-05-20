"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import CoursePlayerHeader from "@/components/CoursePlayerHeader";
import Syllabus from "@/components/Syllabus";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getCourse, getModules } from "@/lib/courses";
import { getEnrollmentsByUser } from "@/lib/enrollments";
import { Course, Module, Lesson, Enrollment } from "@/lib/types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import ReviewModal from "@/components/ReviewModal";

export default function CoursePlayerPage() {
    const { courseId } = useParams();
    const { user } = useAuth();
    const router = useRouter();

    const [course, setCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!courseId) return;
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Course details
                const courseData = await getCourse(courseId as string);
                setCourse(courseData);

                // 2. Fetch Modules
                const modulesData = await getModules(courseId as string);

                // Sanitize modules: Ensure every lesson has an ID
                const sanitizedModules = modulesData.map((m, mIndex) => ({
                    ...m,
                    lessons: m.lessons?.map((l, lIndex) => ({
                        ...l,
                        id: l.id || `virtual-module-${mIndex}-lesson-${lIndex}`
                    }))
                }));

                setModules(sanitizedModules);

                // 3. Fetch Enrollment to get progress & completed lessons
                const userRef = doc(db, "users", user.uid);
                const enrollments = await getEnrollmentsByUser(userRef);
                const currentEnrollment = enrollments.find(e => e.productId.id === courseId);

                if (currentEnrollment) {
                    setEnrollment(currentEnrollment);

                    // Default to first lesson using sanitized data
                    if (sanitizedModules.length > 0 && sanitizedModules[0].lessons && sanitizedModules[0].lessons.length > 0) {
                        setCurrentLesson(sanitizedModules[0].lessons[0]);
                    }
                } else {
                    // Not enrolled? Preview mode: load first lesson using sanitized data
                    if (sanitizedModules.length > 0 && sanitizedModules[0].lessons && sanitizedModules[0].lessons.length > 0) {
                        setCurrentLesson(sanitizedModules[0].lessons[0]);
                    }
                }

            } catch (error) {
                console.error("Error fetching course data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, courseId]);

    const handleLessonSelect = (lesson: Lesson) => {
        if (!lesson) return;
        // Allow selecting lessons for viewing even if they lack an ID (legacy/bad data)
        setCurrentLesson(lesson);
    };

    const handleMarkCompleted = async () => {
        if (!enrollment || !enrollment.id || !currentLesson || !currentLesson.id) return;

        const completedLessons = enrollment.completedLessons || [];
        // Determine if we need to update completed lessons
        let newCompleted = [...completedLessons];
        if (!completedLessons.includes(currentLesson.id)) {
            newCompleted.push(currentLesson.id);
        }

        // Calculate progress
        const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
        const newProgress = totalLessons > 0 ? Math.round((newCompleted.length / totalLessons) * 100) : 0;

        // Find NEXT lesson
        let nextLessonId = currentLesson.id; // Default to current if no next
        let nextLesson: Lesson | null = null;

        // Flatten lessons to find current index
        const allLessons: Lesson[] = [];
        modules.forEach(m => {
            if (m.lessons) allLessons.push(...m.lessons);
        });

        const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
        if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
            nextLesson = allLessons[currentIndex + 1];
            if (nextLesson && nextLesson.id) {
                nextLessonId = nextLesson.id;
            }
        }

        const updates: any = {
            completedLessons: newCompleted,
            progress: newProgress,
            lastAccessedAt: new Date()
        };

        // Only advance if we found a next lesson and it has a valid ID
        /* currentLessonId update removed per request */

        try {
            const enrollmentRef = doc(db, "enrollments", enrollment.id);
            await updateDoc(enrollmentRef, updates);

            // Update local state
            setEnrollment({
                ...enrollment,
                ...updates
            });

            if (nextLesson) {
                setCurrentLesson(nextLesson);
            }

            // Check if course is completed and trigger review modal
            // Only trigger if we just reached 100% (prevent spamming if clicking again)
            if (newProgress === 100 && (enrollment?.progress || 0) < 100) {
                setIsReviewModalOpen(true);
            }

        } catch (error) {
            console.error("Error updating progress:", error);
        }
    };

    // Navigation logic handled in useEffect to avoid render-phase updates
    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (course && !enrollment) {
                router.push("/products");
            }
        }
    }, [loading, user, enrollment, course, router]);

    if (loading || !user || (course && !enrollment)) {
        return <div className="min-h-screen flex items-center justify-center dark:text-white">Chargement du cours...</div>;
    }

    if (!course) {
        return <div className="min-h-screen flex items-center justify-center dark:text-white">Cours introuvable.</div>;
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors duration-200 min-h-screen">
            <CoursePlayerHeader courseTitle={course.title} progress={enrollment?.progress || 0} />

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Video Stage */}
                <section className="w-full mb-10">
                    <div className="relative group aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                        {currentLesson?.videoUrl ? (
                            <iframe
                                src={currentLesson.videoUrl}
                                className="w-full h-full"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                title={currentLesson.title}
                            ></iframe>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                                <div className="text-center">
                                    <p className="mb-2 text-lg font-bold">Vidéo non disponible</p>
                                    <p className="text-sm opacity-60">Sélectionnez une leçon pour commencer</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Lesson Info */}
                <section className="mb-12 border-b border-zinc-200 dark:border-zinc-800 pb-12">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-widest rounded text-zinc-500">
                                    {/* Find Module Title for current lesson */}
                                    {modules.find(m => m.lessons?.some(l => l.id === currentLesson?.id))?.title || "Module"}
                                </span>
                                <span className="text-zinc-400 text-xs">•</span>
                                <span className="text-zinc-400 text-xs font-medium">{currentLesson?.duration || "00:00"}</span>
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight mb-4 text-primary dark:text-white">
                                {currentLesson?.title || "Sélectionnez une leçon"}
                            </h1>
                            <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                                {currentLesson?.description || "Aucune description disponible."}
                            </p>
                            <div className="flex flex-wrap gap-4 mt-8">
                                <button
                                    onClick={handleMarkCompleted}
                                    disabled={enrollment?.completedLessons?.includes(currentLesson?.id || "")}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${enrollment?.completedLessons?.includes(currentLesson?.id || "")
                                        ? "bg-green-500 text-white cursor-not-allowed opacity-80"
                                        : "bg-primary text-white dark:bg-white dark:text-black hover:opacity-90"
                                        }`}
                                >
                                    <span className="material-symbols-outlined !text-lg">
                                        {enrollment?.completedLessons?.includes(currentLesson?.id || "") ? "check" : "check_circle"}
                                    </span>
                                    {enrollment?.completedLessons?.includes(currentLesson?.id || "") ? "Terminé" : "Marquer comme terminé"}
                                </button>
                                {currentLesson?.resourceFileUrl && (
                                    <button
                                        onClick={() => window.open(currentLesson.resourceFileUrl, '_blank')}
                                        className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 px-6 py-3 rounded-lg font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <span className="material-symbols-outlined !text-lg">download</span>
                                        Fichiers de ressources
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <Syllabus
                    modules={modules}
                    currentLessonId={currentLesson?.id}
                    completedLessons={enrollment?.completedLessons || []}
                    onLessonSelect={handleLessonSelect}
                />

                {/* Footer */}
                <footer className="mt-24 pt-12 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6 pb-12">
                    <div className="flex items-center gap-2">
                        <div className="size-6 bg-primary dark:bg-white rounded flex items-center justify-center">
                            <span className="material-symbols-outlined !text-sm text-white dark:text-black">school</span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">DJR Akademi</p>
                    </div>
                    {/* Footer links */}
                </footer>
            </main>

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                courseId={course.id || ""}
                courseTitle={course.title}
            />
        </div>
    );
}

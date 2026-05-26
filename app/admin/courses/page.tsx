"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CourseDrawer from "@/components/CourseDrawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { getCourses, addCourse, updateCourse, deleteCourse } from "@/lib/courses";
import { Course } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function CourseManagementPage() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadCourses = async () => {
        setLoading(true);
        const data = await getCourses();
        setCourses(data);
        setLoading(false);
    };

    useEffect(() => {
        loadCourses();
    }, []);

    const handleCreate = () => {
        setSelectedCourse(null);
        setIsDrawerOpen(true);
    };

    const handleEdit = (course: Course) => {
        setSelectedCourse(course);
        setIsDrawerOpen(true);
    };

    const handleSave = async (data: Partial<Course>) => {
        try {
            if (selectedCourse && selectedCourse.id) {
                await updateCourse(selectedCourse.id, data);
            } else {
                await addCourse(data);
            }
            await loadCourses();
            setIsDrawerOpen(false);
        } catch (error) {
            console.error("Failed to save course", error);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteCourse(deleteId);
            setCourses(courses.filter(c => c.id !== deleteId));
            setDeleteId(null);
        } catch (error) {
            console.error("Failed to delete course", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <main className="max-w-6xl mx-auto animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Courses</h2>
                    <p className="text-black/50 dark:text-white/50 text-sm">Gérez tous vos cours et contenus éducatifs.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-primary text-white dark:bg-white dark:text-primary px-8 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nouveau Cours
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-black/10 border border-black/5 dark:border-white/10 rounded-xl overflow-hidden shadow-sm shadow-black/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/10">
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Nom du cours</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Statut</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Prix</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {courses.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 opacity-50">Aucun cours trouvé.</td>
                                </tr>
                            ) : (
                                courses.map((course) => (
                                    <tr key={course.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-lg bg-black/5 dark:bg-white/5 overflow-hidden flex-shrink-0 relative border border-black/5 dark:border-white/10">
                                                    {course.thumbnail ? (
                                                        <img
                                                            alt={course.title}
                                                            className="w-full h-full object-cover"
                                                            src={course.thumbnail}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                                                            <span className="material-symbols-outlined text-gray-400">image</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold tracking-tight">{course.title}</p>
                                                    <p className="text-[10px] text-black/40 dark:text-white/40 uppercase font-black tracking-widest">
                                                        {course.updatedAt ? format(course.updatedAt.toDate(), "d MMM yyyy", { locale: fr }) : "-"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${(course.statut === "published" || course.statut === "Published")
                                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                                                : (course.statut === "archived" || course.statut === "Archived")
                                                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                                    : "bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50"
                                                }`}>
                                                {(course.statut === "published" || course.statut === "Published")
                                                    ? "Publié"
                                                    : (course.statut === "archived" || course.statut === "Archived")
                                                        ? "Archivé"
                                                        : "Brouillon"}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-bold tracking-tight">${course.price}</p>
                                        </td>

                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={`/admin/courses/${course.id}`} className="p-2 rounded-full border border-black/5 dark:border-white/10 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-primary transition-all" title="Ajouter des leçons">
                                                    <span className="material-symbols-outlined text-sm">playlist_add</span>
                                                </Link>
                                                <button
                                                    onClick={() => handleEdit(course)}
                                                    className="p-2 rounded-full border border-black/5 dark:border-white/10 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-primary transition-all" title="Modifier le cours">
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => course.id && setDeleteId(course.id)}
                                                    className="p-2 rounded-full border border-black/5 dark:border-white/10 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all" title="Supprimer le cours">
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )))}
                        </tbody>
                    </table>
                </div>
            </div>

            <CourseDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                initialData={selectedCourse}
                onSave={handleSave}
            />

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => !isDeleting && setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Supprimer le cours ?"
                message="Êtes-vous sûr de vouloir supprimer ce cours ? Cette action est irréversible."
                confirmText="Supprimer"
                isDanger={true}
                isLoading={isDeleting}
            />
        </main>
    );
}

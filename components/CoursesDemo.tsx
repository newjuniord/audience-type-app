"use client";

import { useState, useEffect } from "react";
import { getCourses, getModules, addCourse, addModule } from "@/lib/courses";
import { Course, Module } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

/**
 * Démo pour la gestion des Cours et Modules (Sous-collection)
 */
export default function CoursesDemo() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [modules, setModules] = useState<Module[]>([]);

    useEffect(() => {
        loadCourses();
    }, []);

    // Charger les cours au démarrage
    const loadCourses = async () => {
        const data = await getCourses();
        setCourses(data);
    };

    // Quand on clique sur un cours, on charge ses modules
    const handleSelectCourse = async (courseId: string) => {
        setSelectedCourseId(courseId);
        const modulesData = await getModules(courseId);
        setModules(modulesData);
    };

    const handleAddTestCourse = async () => {
        // Exemple d'ajout de cours
        await addCourse({
            title: "Nouveau Cours " + Date.now(),
            description: "Description du cours...",
            price: 99,
            sales: 0,
            statut: "draft",
            thumbnail: "url_image",
            includedItems: ["pdf"],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        loadCourses();
    };

    const handleAddTestModule = async () => {
        if (!selectedCourseId) return alert("Sélectionnez d'abord un cours !");

        // Exemple d'ajout de module dans la sous-collection
        await addModule(selectedCourseId, {
            title: "Module 1 : Introduction",
            lessons: [
                {
                    id: "lesson-" + Date.now(),
                    title: "Leçon 1",
                    description: "Bienvenue dans ce cours",
                    duration: "05:00",
                    videoUrl: "http://...",
                    resourceFileUrl: "http://..."
                }
            ]
        });
        // Recharger les modules pour voir le nouveau
        handleSelectCourse(selectedCourseId);
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div>
                <h1 className="text-3xl font-bold mb-4">Mes Cours</h1>
                <button onClick={handleAddTestCourse} className="bg-blue-600 text-white px-4 py-2 rounded">
                    + Ajouter Cours Test
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {courses.map(course => (
                        <div
                            key={course.id}
                            onClick={() => course.id && handleSelectCourse(course.id)}
                            className={`p-4 border cursor-pointer ${selectedCourseId === course.id ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}
                        >
                            <h3 className="font-bold">{course.title}</h3>
                            <p>{course.price} €</p>
                        </div>
                    ))}
                </div>
            </div>

            {selectedCourseId && (
                <div className="border-t pt-8">
                    <h2 className="text-2xl font-bold mb-4">Modules du cours sélectionné</h2>
                    <button onClick={handleAddTestModule} className="bg-green-600 text-white px-4 py-2 rounded">
                        + Ajouter Module Test
                    </button>

                    <div className="space-y-4 mt-4">
                        {modules.map(mod => (
                            <div key={mod.id} className="bg-white p-4 rounded shadow">
                                <h4 className="font-bold text-lg">{mod.title}</h4>
                                <div className="pl-4 mt-2">
                                    {mod.lessons.map((lesson, idx) => (
                                        <div key={idx} className="text-sm text-gray-600">
                                            • {lesson.title} ({lesson.duration}s)
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {modules.length === 0 && <p>Aucun module pour ce cours.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { getEnrollments, createEnrollment, updateEnrollmentProgress } from "@/lib/enrollments";
import { Enrollment } from "@/lib/types";

export default function EnrollmentsDemo() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEnrollments();
    }, []);

    const loadEnrollments = async () => {
        try {
            setLoading(true);
            const data = await getEnrollments();
            setEnrollments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTestEnrollment = async () => {
        const newEnrollment: Omit<Enrollment, "id"> = {
            accessGranted: true,
            completedLessons: [],
            currentLessonId: "lesson-1",
            downloadCount: "0",
            enrolledAt: new Date().toISOString() as any, // Using ISO string for Supabase
            lastAccessedAt: new Date().toISOString() as any, // Using ISO string for Supabase
            productId: "some-course-id" as any,
            productThumbnailUrl: "https://via.placeholder.com/50",
            productTitle: "Mon Cours Complet",
            productType: "course",
            progress: 0,
            status: "active",
            totalLessons: 10,
            userEmail: "student@example.com",
            userId: "some-user-id" as any,
            userName: "Sophie Étudiante"
        };

        await createEnrollment(newEnrollment);
        loadEnrollments();
    };

    const handleProgress = async (id: string) => {
        // Simuler une progression
        await updateEnrollmentProgress(id, ["lesson-1"], "lesson-2", 10);
        loadEnrollments();
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="p-8 border-t mt-8">
            <h1 className="text-2xl font-bold mb-4">Inscriptions (Enrollments)</h1>
            <button onClick={handleAddTestEnrollment} className="bg-indigo-600 text-white px-4 py-2 rounded mb-6">
                + Créer Inscription Test
            </button>

            <div className="space-y-4">
                {enrollments.map(enroll => (
                    <div key={enroll.id} className="border p-4 rounded bg-white shadow">
                        <div className="flex justify-between">
                            <h3 className="font-bold">{enroll.productTitle}</h3>
                            <span className="text-sm bg-gray-200 px-2 rounded">{enroll.progress}%</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Étudiant: {enroll.userName} ({enroll.userEmail})
                        </p>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${enroll.progress}%` }}></div>
                        </div>
                        <button onClick={() => enroll.id && handleProgress(enroll.id)} className="text-blue-500 underline text-xs mt-2">
                            Avancer à 10%
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { getBookingApplications, createBookingApplication } from "@/lib/booking-applications";
import { BookingApplication } from "@/lib/types";
import { Timestamp, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function BookingApplicationsDemo() {
    const [applications, setApplications] = useState<BookingApplication[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = async () => {
        try {
            setLoading(true);
            const data = await getBookingApplications();
            setApplications(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTestApplication = async () => {
        const newApp: Omit<BookingApplication, "id"> = {
            bookingsId: "some-booking-id",
            createdAt: Timestamp.now(),
            message: "Je suis très intéressé par ce coaching.",
            status: "pending",
            userName: "Alice Merveille",
            userPhone: "+33612345678",
            usersId: "some-user-id"
        };

        await createBookingApplication(newApp);
        loadApplications();
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="p-8 border-t mt-8">
            <h1 className="text-2xl font-bold mb-4">Demandes de Réservation (Booking Applications)</h1>
            <button onClick={handleAddTestApplication} className="bg-pink-600 text-white px-4 py-2 rounded mb-6">
                + Envoyer Demande Test
            </button>

            <div className="space-y-4">
                {applications.map(app => (
                    <div key={app.id} className="border p-4 rounded bg-white shadow">
                        <h3 className="font-bold">{app.userName} ({app.userPhone})</h3>
                        <p className="italic text-gray-600">"{app.message}"</p>
                        <div className="mt-2 text-sm">
                            <span className={`px-2 py-1 rounded text-white ${app.status === 'pending' ? 'bg-orange-400' : 'bg-green-500'}`}>
                                {app.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

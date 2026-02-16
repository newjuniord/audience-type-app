"use client";

import { useState, useEffect } from "react";
import { getBookings, addBooking, deleteBooking } from "@/lib/bookings";
import { Booking } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

export default function BookingsDemo() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        try {
            setLoading(true);
            const data = await getBookings();
            setBookings(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTestBooking = async () => {
        const newBooking: Omit<Booking, "id"> = {
            createdAt: Timestamp.now(),
            description: "Réservation test pour coaching",
            price: "150€",
            serviceName: "Coaching 1h",
            status: "pending",
            userNumber: 12345,
            whatIncluded: ["Appel zoom", "Plan d'action"]
        };

        await addBooking(newBooking);
        loadBookings();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Supprimer ?")) {
            await deleteBooking(id);
            loadBookings();
        }
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Gestion des Réservations</h1>
            <button onClick={handleAddTestBooking} className="bg-purple-600 text-white px-4 py-2 rounded mb-6">
                + Créer Réservation Test
            </button>

            <div className="space-y-4">
                {bookings.map(booking => (
                    <div key={booking.id} className="border p-4 rounded bg-white shadow flex justify-between">
                        <div>
                            <h3 className="font-bold">{booking.serviceName}</h3>
                            <p className="text-sm text-gray-500">{booking.description}</p>
                            <p className="font-mono text-xs mt-2">Status: {booking.status} | Prix: {booking.price}</p>
                            <ul className="text-xs list-disc pl-4 mt-2">
                                {booking.whatIncluded.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                        <button onClick={() => booking.id && handleDelete(booking.id)} className="text-red-500 underline text-sm">
                            Supprimer
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

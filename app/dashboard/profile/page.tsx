"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { getUserById, updateUser } from "@/lib/users";
import { getEnrollmentsByUser } from "@/lib/enrollments";
import { getBookingApplicationsByUser } from "@/lib/booking-applications";
import { updateProfile } from "firebase/auth";
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure db is imported to create DocumentReference if needed, though get functions use it internally
// Note: We need to pass a DocumentReference to getEnrollmentsByUser/getBookingApplicationsByUser
import { doc as firestoreDoc } from "firebase/firestore";

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [displayName, setDisplayName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [memberSince, setMemberSince] = useState("");
    const [email, setEmail] = useState("");

    // Stats State
    const [stats, setStats] = useState({
        coursesRaw: 0,
        ebooks: 0,
        bookings: 0
    });

    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        async function fetchProfileData() {
            if (!user) return;

            try {
                // 1. Fetch User Document from Firestore
                const userDoc = await getUserById(user.uid);

                if (userDoc) {
                    setDisplayName(userDoc.displayName || user.displayName || "");
                    setPhoneNumber(userDoc.phoneNumber || "");
                    setPhotoURL(userDoc.photoURL || user.photoURL || "");
                    setEmail(userDoc.email || user.email || "");

                    if (userDoc.createdAt) {
                        setMemberSince(userDoc.createdAt.toDate().toLocaleDateString('fr-FR', {
                            month: 'short',
                            year: 'numeric'
                        }));
                    }
                } else {
                    // Fallback to Auth data if Firestore doc missing
                    setDisplayName(user.displayName || "");
                    setPhotoURL(user.photoURL || "");
                    setEmail(user.email || "");
                }

                // 2. Fetch Stats
                const userRef = firestoreDoc(db, "users", user.uid);

                const [enrollments, bookings] = await Promise.all([
                    getEnrollmentsByUser(userRef),
                    getBookingApplicationsByUser(userRef)
                ]);

                const coursesCount = enrollments.filter(e => e.productType === 'Course' || e.productType === 'course').length;
                const ebooksCount = enrollments.filter(e => e.productType === 'Ebook' || e.productType === 'ebook').length;
                const activeBookings = bookings.filter(b => b.status === 'pending' || b.status === 'accepted').length;

                setStats({
                    coursesRaw: coursesCount,
                    ebooks: ebooksCount,
                    bookings: activeBookings
                });

            } catch (error: any) {
                console.error("Error fetching profile data FULL:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
                // Also log to console as standard
                console.error(error);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchProfileData().catch(e => {
                console.error("Unhandled promise rejection in fetchProfileData:", e);
            });
        }
    }, [user, authLoading]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            // 1. Update Firestore
            await updateUser(user.uid, {
                displayName,
                phoneNumber
                // Photo URL is now read-only, so we don't update it from here
            });

            // 2. Update Auth Profile (optional but good for consistency)
            await updateProfile(user, {
                displayName: displayName
            });

            // Show success popup
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (error) {
            console.error("Error updating profile", error);
            alert("Erreur lors de la mise à jour du profil.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        const { signOut } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase");
        await signOut(auth);
        window.location.href = "/login";
    };

    if (authLoading || loading) {
        return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
    }

    if (!user) {
        return <div className="min-h-screen flex items-center justify-center">Veuillez vous connecter.</div>;
    }

    return (
        <div className="relative flex h-auto flex-col w-full bg-background-light dark:bg-background-dark text-primary min-h-screen group/design-root overflow-x-hidden font-display">
            <div className="layout-container flex h-full grow flex-col">
                {/* Success Popup */}
                {showSuccess && (
                    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
                        <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                            <span className="material-symbols-outlined text-xl">check_circle</span>
                            <span className="font-bold text-sm">Profil mis à jour avec succès !</span>
                        </div>
                    </div>
                )}

                <main className="flex flex-1 justify-center py-10 px-4 md:px-10">
                    <div className="layout-content-container flex flex-col max-w-[800px] flex-1">
                        {/* Profile Hero */}
                        <section className="flex flex-col items-center mb-12">
                            <div className="relative group">
                                <div
                                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full border-4 border-white dark:border-primary/20 shadow-sm min-h-32 w-32 mb-4"
                                    style={{ backgroundImage: `url("${photoURL || 'https://lh3.googleusercontent.com/a/default-user'}")` }}
                                >
                                </div>
                                {/* Photo Edit Button (disabled or maybe opens valid update modal later) */}
                                {/* <button className="absolute bottom-4 right-0 bg-primary text-white p-2 rounded-full shadow-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                </button> */}
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                <h1 className="text-primary dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em] text-center">{displayName || "Utilisateur"}</h1>
                                {memberSince && (
                                    <p className="text-primary/60 dark:text-white/60 text-base font-normal leading-normal text-center mt-1">Membre depuis {memberSince}</p>
                                )}
                            </div>
                        </section>

                        <div className="grid grid-cols-1 gap-12">
                            {/* Personal Information Form */}
                            <section>
                                <h2 className="text-primary dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-6">Informations personnelles</h2>
                                <div className="space-y-4">
                                    <div className="flex flex-col w-full">
                                        <p className="text-primary dark:text-white text-sm font-semibold leading-normal pb-2">Nom complet</p>
                                        <input
                                            className="form-input flex w-full rounded-xl text-primary dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-primary/10 bg-white dark:bg-background-dark/50 h-12 px-4 text-base font-normal"
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col w-full">
                                        <div className="flex items-center justify-between pb-2">
                                            <p className="text-primary dark:text-white text-sm font-semibold leading-normal">Adresse e-mail</p>
                                            <span className="text-[10px] uppercase tracking-wider text-primary/40 dark:text-white/40 font-bold">Lecture seule</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                className="form-input flex w-full rounded-xl text-primary/50 dark:text-white/50 border border-primary/5 bg-primary/5 dark:bg-white/5 h-12 px-4 text-base font-normal cursor-not-allowed"
                                                readOnly
                                                type="email"
                                                value={email}
                                            />
                                            <span className="material-symbols-outlined absolute right-4 top-3 text-sm text-primary/30">lock</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col w-full">
                                        <p className="text-primary dark:text-white text-sm font-semibold leading-normal pb-2">Numéro de téléphone</p>
                                        <input
                                            className="form-input flex w-full rounded-xl text-primary dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-primary/10 bg-white dark:bg-background-dark/50 h-12 px-4 text-base font-normal"
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                    <div className="flex flex-col w-full">
                                        <div className="flex items-center justify-between pb-2">
                                            <p className="text-primary dark:text-white text-sm font-semibold leading-normal">Photo URL</p>
                                            <span className="text-[10px] uppercase tracking-wider text-primary/40 dark:text-white/40 font-bold">Lecture seule</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                className="form-input flex w-full rounded-xl text-primary/50 dark:text-white/50 border border-primary/5 bg-primary/5 dark:bg-white/5 h-12 px-4 text-base font-normal cursor-not-allowed"
                                                type="text"
                                                value={photoURL}
                                                readOnly
                                                // onChange={(e) => setPhotoURL(e.target.value)} // Disabled
                                                placeholder="https://..."
                                            />
                                            <span className="material-symbols-outlined absolute right-4 top-3 text-sm text-primary/30">lock</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Activity Summary */}
                            <section>
                                <h2 className="text-primary dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-6">Résumé de l'activité</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-background-dark/50 border border-primary/10 p-5 rounded-xl">
                                        <span className="material-symbols-outlined text-primary/40 mb-2">menu_book</span>
                                        <p className="text-2xl font-bold text-primary dark:text-white">{stats.coursesRaw}</p>
                                        <p className="text-sm text-primary/60 dark:text-white/60">Cours possédés</p>
                                    </div>
                                    <div className="bg-white dark:bg-background-dark/50 border border-primary/10 p-5 rounded-xl">
                                        <span className="material-symbols-outlined text-primary/40 mb-2">auto_stories</span>
                                        <p className="text-2xl font-bold text-primary dark:text-white">{stats.ebooks}</p>
                                        <p className="text-sm text-primary/60 dark:text-white/60">Ebooks possédés</p>
                                    </div>
                                    <div className="bg-white dark:bg-background-dark/50 border border-primary/10 p-5 rounded-xl">
                                        <span className="material-symbols-outlined text-primary/40 mb-2">event_available</span>
                                        <p className="text-2xl font-bold text-primary dark:text-white">{stats.bookings}</p>
                                        <p className="text-sm text-primary/60 dark:text-white/60">Réservations actives</p>
                                    </div>
                                </div>
                            </section>

                            {/* Footer Actions */}
                            <section className="pt-6 border-t border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full md:w-auto flex min-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-8 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 text-[#d32f2f] hover:text-red-700 font-semibold text-sm transition-colors group"
                                >
                                    <span className="material-symbols-outlined text-lg">logout</span>
                                    <span>Se déconnecter</span>
                                </button>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

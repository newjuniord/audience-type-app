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
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [memberSince, setMemberSince] = useState("");
    const [email, setEmail] = useState("");
    const [copied, setCopied] = useState(false);

    // Temp Link states
    const [canGenerateTempLinks, setCanGenerateTempLinks] = useState(false);
    const [tempLinksCount, setTempLinksCount] = useState(0);
    const [generatedLink, setGeneratedLink] = useState("");
    const [generatingLink, setGeneratingLink] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

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
                console.log("🔍 Fetching profile data for:", user.uid);
                // 1. Fetch User Document from Firestore
                const userDoc = await getUserById(user.uid);
                console.log("✅ User Doc status:", userDoc ? "Found" : "Not Found");

                if (userDoc) {
                    setDisplayName(userDoc.displayName || user.displayName || "");
                    setPhoneNumber(userDoc.phoneNumber || "");
                    setWhatsappNumber(userDoc.whatsappNumber || "");
                    setPhotoURL(userDoc.photoURL || user.photoURL || "");
                    setEmail(userDoc.email || user.email || "");
                    setCanGenerateTempLinks(userDoc.canGenerateTempLinks || false);
                    setTempLinksCount(userDoc.tempLinksCount || 0);

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
                console.log("🔍 Fetching stats (enrollments & bookings)...");
                const userRef = firestoreDoc(db, "users", user.uid);
                
                try {
                    const [enrollments, bookings] = await Promise.all([
                        getEnrollmentsByUser(user.uid).catch(e => {
                            console.warn("⚠️ Failed to fetch enrollments:", e.message);
                            return [];
                        }),
                        getBookingApplicationsByUser(userRef).catch(e => {
                            console.warn("⚠️ Failed to fetch bookings:", e.message);
                            return [];
                        })
                    ]);
                    console.log("✅ Stats fetched:", { enrollments: enrollments.length, bookings: bookings.length });

                    const coursesCount = enrollments.filter(e => e.productType === 'Course' || e.productType === 'course').length;
                    const ebooksCount = enrollments.filter(e => e.productType === 'Ebook' || e.productType === 'ebook').length;
                    const activeBookings = bookings.filter(b => b.status === 'pending' || b.status === 'accepted').length;

                    setStats({
                        coursesRaw: coursesCount,
                        ebooks: ebooksCount,
                        bookings: activeBookings
                    });
                } catch (statsError) {
                    console.error("⚠️ Global stats error:", statsError);
                }

            } catch (error: any) {
                console.error("❌ PROFILE ERROR DETECTED:");
                console.error("Type:", error?.name || "Unknown");
                console.error("Message:", error?.message || "No message");
                console.error("Full Error:", error);
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
                phoneNumber,
                whatsappNumber,
                email
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerateTempLink = async () => {
        if (!user) return;
        setGeneratingLink(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/auth/temp-link/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la génération");
            }

            const { link } = await res.json();
            setGeneratedLink(link);
            setTempLinksCount(prev => prev + 1);
        } catch (error: any) {
            console.error("Error generating temp link", error);
            alert(error.message || "Erreur lors de la génération du lien.");
        } finally {
            setGeneratingLink(false);
        }
    };

    const copyLinkToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
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
                                    {user.email ? (
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
                                                    value={user.email}
                                                />
                                                <span className="material-symbols-outlined absolute right-4 top-3 text-sm text-primary/30">lock</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col w-full">
                                            <div className="flex items-center justify-between pb-2">
                                                <p className="text-primary dark:text-white text-sm font-semibold leading-normal">Numéro de téléphone</p>
                                                <span className="text-[10px] uppercase tracking-wider text-primary/40 dark:text-white/40 font-bold">Lecture seule</span>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    className="form-input flex w-full rounded-xl text-primary/50 dark:text-white/50 border border-primary/5 bg-primary/5 dark:bg-white/5 h-12 px-4 text-base font-normal cursor-not-allowed"
                                                    readOnly
                                                    type="tel"
                                                    value={user.phoneNumber || ""}
                                                />
                                                <span className="material-symbols-outlined absolute right-4 top-3 text-sm text-primary/30">lock</span>
                                            </div>
                                        </div>
                                    )}

                                    {user.email ? (
                                        <div className="flex flex-col w-full">
                                            <p className="text-primary dark:text-white text-sm font-semibold leading-normal pb-2">Numéro de téléphone (Contact)</p>
                                            <input
                                                className="form-input flex w-full rounded-xl text-primary dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-primary/10 bg-white dark:bg-background-dark/50 h-12 px-4 text-base font-normal"
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col w-full">
                                            <p className="text-primary dark:text-white text-sm font-semibold leading-normal pb-2">Adresse e-mail (Contact)</p>
                                            <input
                                                className="form-input flex w-full rounded-xl text-primary dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-primary/10 bg-white dark:bg-background-dark/50 h-12 px-4 text-base font-normal"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="votre@email.com"
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-col w-full">
                                        <div className="flex items-center gap-2 pb-2">
                                            <p className="text-primary dark:text-white text-sm font-semibold leading-normal">Numéro WhatsApp</p>
                                            <span className="material-symbols-outlined text-emerald-500 text-sm">forum</span>
                                        </div>
                                        <input
                                            className="form-input flex w-full rounded-xl text-primary dark:text-white focus:outline-0 focus:ring-2 focus:ring-emerald-500/20 border border-emerald-500/10 bg-emerald-500/5 h-12 px-4 text-base font-normal"
                                            type="tel"
                                            value={whatsappNumber}
                                            onChange={(e) => setWhatsappNumber(e.target.value)}
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

                            {/* Section Accès Partagé (Magic Link) */}
                            {canGenerateTempLinks === true && (
                                <section className="bg-primary/5 dark:bg-white/5 p-8 rounded-2xl border border-primary/10 transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <span className="material-symbols-outlined text-primary text-xl">share_reviews</span>
                                        </div>
                                        <div>
                                            <h2 className="text-primary dark:text-white text-xl font-bold leading-tight">Accès Partagé</h2>
                                            <p className="text-[10px] text-primary/40 dark:text-white/40 uppercase font-black tracking-widest mt-1">Lien de connexion temporaire</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-background-dark/50 p-6 rounded-xl border border-primary/5 shadow-sm">
                                            <p className="text-sm text-primary/70 dark:text-white/70 leading-relaxed mb-6">
                                                Vous pouvez générer un lien spécial pour permettre à une personne d'accéder à vos cours <span className="font-bold text-primary dark:text-white">sans partager votre mot de passe</span>.
                                            </p>
                                            
                                            <ul className="space-y-3 mb-8">
                                                <li className="flex items-start gap-2 text-xs text-primary/60 dark:text-white/60">
                                                    <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                                                    <span>Valide pendant 24 heures uniquement.</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-xs text-primary/60 dark:text-white/60">
                                                    <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                                                    <span>Usage unique (expire après la première connexion).</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-xs text-primary/60 dark:text-white/60">
                                                    <span className="material-symbols-outlined text-sm text-primary/40">info</span>
                                                    <span>Quota : {2 - tempLinksCount} lien(s) restant(s).</span>
                                                </li>
                                            </ul>

                                            {generatedLink ? (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                    <p className="text-[10px] uppercase font-bold text-primary/40 dark:text-white/40 tracking-widest">Votre lien généré :</p>
                                                    <div className="relative group">
                                                        <input
                                                            readOnly
                                                            className="w-full bg-primary/5 dark:bg-white/5 border-2 border-primary/10 rounded-xl px-4 py-3 text-xs font-mono text-primary/70 dark:text-white/70 pr-24"
                                                            value={generatedLink}
                                                        />
                                                        <button 
                                                            onClick={() => copyLinkToClipboard(generatedLink)}
                                                            className="absolute right-2 top-2 h-8 px-4 bg-primary text-white text-[10px] font-bold rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-sm"
                                                        >
                                                            <span className="material-symbols-outlined text-xs">{linkCopied ? 'check' : 'content_copy'}</span>
                                                            <span>{linkCopied ? 'Copié' : 'Copier'}</span>
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-red-500 italic">Attention : ce lien ne peut être utilisé qu'une seule fois.</p>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleGenerateTempLink}
                                                    disabled={generatingLink || tempLinksCount >= 2}
                                                    className="w-full h-14 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-md"
                                                >
                                                    {generatingLink ? (
                                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <span className="material-symbols-outlined">add_link</span>
                                                    )}
                                                    <span>{tempLinksCount >= 2 ? 'Quota de liens atteint' : 'Générer un lien d\'accès unique'}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            )}

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

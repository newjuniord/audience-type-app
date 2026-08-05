"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { updateUser } from "@/lib/users";
import { uploadFile } from "@/lib/storage";
import { updateProfile } from "firebase/auth";


// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
                <h2 className="text-sm font-black uppercase tracking-widest text-white/60">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ─── INPUT FIELD ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { user, userData, loading: authLoading, signOutUser } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [displayName, setDisplayName] = useState("");
    const [phoneDisplay, setPhoneDisplay] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [memberSince, setMemberSince] = useState("");
    const [editingPhone, setEditingPhone] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [stats, setStats] = useState({ coursesRaw: 0, ebooks: 0, bookings: 0 });



    useEffect(() => {
        async function fetchProfileData() {
            try {
                if (userData) {
                    setDisplayName(userData.name || user?.displayName || "Itilizatè");
                    setPhotoURL(userData.photoURL || user?.photoURL || "");
                    setPhoneDisplay(userData.phone || "");
                    setWhatsappNumber(userData.phone || "");
                    
                    if (userData.createdAt) {
                        const date = new Date(userData.createdAt);
                        setMemberSince(date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
                    }
                } else if (user) {
                    setDisplayName(user.displayName || "Itilizatè");
                    setPhotoURL(user.photoURL || "");
                }
                
                // Mocks for stats until we connect them
                setStats({ coursesRaw: 0, ebooks: 0, bookings: 0 });
            } catch (error) {
                console.error("Profile error:", error);
            } finally {
                setLoading(false);
            }
        }
        if (!authLoading) fetchProfileData();
    }, [user, userData, authLoading]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateUser(user.uid, {
                name: displayName,
                phone: whatsappNumber,
                photoURL: photoURL
            });
            // Update Auth profile as well to keep them in sync
            await updateProfile(user, { displayName, photoURL });
            
            setEditingPhone(false);
            showToast("Pwofil ou mete ajou avèk siksè !", "success");
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast("Erè pandan mete ajou pwofil ou.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await signOutUser();
        window.location.href = "/login";
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark text-white/40 text-sm">
                Tanpri konekte w.
            </div>
        );
    }

    const initials = (displayName || user.email || "?")
        .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

    return (
        <div className="min-h-screen bg-background-dark text-white font-display">
            <main className="max-w-[640px] mx-auto px-4 pt-28 pb-28 flex flex-col gap-5">

                {/* ── Avatar & Identity ── */}
                <div className="flex items-center gap-5 px-6 py-5 bg-white/[0.03] border border-white/10 rounded-3xl">
                    {/* Avatar */}
                    <div className="relative shrink-0 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                        <input
                            type="file"
                            hidden
                            ref={avatarInputRef}
                            accept="image/*"
                            onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                    try {
                                        setIsUploading(true);
                                        const file = await uploadFile(e.target.files[0]);
                                        setPhotoURL(file.url);
                                    } catch (error) {
                                        console.error("Upload failed", error);
                                        showToast("L'upload a échoué.", "error");
                                    } finally {
                                        setIsUploading(false);
                                        if (avatarInputRef.current) avatarInputRef.current.value = "";
                                    }
                                }
                            }}
                        />
                        {isUploading ? (
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : photoURL ? (
                            <img src={photoURL} alt={displayName} className="w-16 h-16 rounded-2xl object-cover group-hover:opacity-75 transition-opacity" />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-xl font-black text-primary group-hover:bg-primary/30 transition-colors">
                                {initials}
                            </div>
                        )}
                        {/* Hover Overlay */}
                        {!isUploading && (
                            <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="material-symbols-outlined text-white text-sm">edit</span>
                            </div>
                        )}
                        {/* Online dot */}
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background-dark" />
                    </div>

                    {/* Name & since */}
                    <div className="min-w-0 flex-1">
                        <p className="text-lg font-black text-white truncate">{displayName || "Itilizatè"}</p>
                        <p className="text-xs text-white/40 font-semibold mt-0.5">{user.email || phoneDisplay}</p>
                        {memberSince && (
                            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary">
                                <span className="material-symbols-outlined text-[12px]">verified</span>
                                Manm depi {memberSince}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { icon: "school", label: "Kou", value: stats.coursesRaw, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
                        { icon: "auto_stories", label: "Ebook", value: stats.ebooks, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
                        { icon: "event_available", label: "Konsiltasyon", value: stats.bookings, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
                    ].map(s => (
                        <div key={s.label} className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border ${s.bg}`}>
                            <span className={`material-symbols-outlined text-[22px] ${s.color}`}>{s.icon}</span>
                            <span className="text-2xl font-black text-white">{s.value}</span>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-white/40">{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* ── Info Card ── */}
                <Section title="Enfòmasyon" icon="person">
                    <div className="flex flex-col gap-4">
                        <Field label="Non konplè">
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Jean Ronald"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 text-sm text-white placeholder:text-white/20 transition-all"
                            />
                        </Field>

                        <Field label={user.email ? "Adrès e-mail" : "Nimewo telefòn"}>
                            <div className="relative">
                                <input
                                    readOnly
                                    type={user.email ? "email" : "tel"}
                                    value={user.email || phoneDisplay || ""}
                                    className="w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white/40 cursor-not-allowed"
                                />
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-white/20">
                                    {user.email ? "alternate_email" : "phone"}
                                </span>
                            </div>
                        </Field>

                        {/* WhatsApp Number — simple editable field */}
                        <Field label="Nimewo WhatsApp">
                            {!editingPhone ? (
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none">💬</span>
                                        <input
                                            readOnly
                                            type="tel"
                                            value={whatsappNumber || "Ou poko ajoute nimewo"}
                                            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white/50 cursor-not-allowed font-mono"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEditingPhone(true)}
                                        className="shrink-0 px-3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                        title="Chanje nimewo a"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={whatsappNumber}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // Seulement chiffres et le signe +
                                                if (/^[\d+]*$/.test(val)) {
                                                    setWhatsappNumber(val);
                                                }
                                            }}
                                            pattern="[\d+]*"
                                            title="Seulement des chiffres ou le signe +, sans espaces"
                                            placeholder="+50937123456"
                                            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 text-sm text-white placeholder:text-white/20 font-mono"
                                            autoFocus
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none">💬</span>
                                    </div>
                                    <p className="text-xs font-medium text-white/80 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/10 mt-1">
                                        📊 Tanpri mete kòd peyi a (+509, +1, elatriye) devan nimewo w la. Nimewo sa a ap itilize pou kontakte w sou WhatsApp. Klike “Sove” pou konfime.
                                    </p>
                                </div>
                            )}
                        </Field>
                    </div>

                    {/* Save button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-6 w-full py-3.5 rounded-xl bg-primary text-white font-black text-sm tracking-wide hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                        {saving ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                N ap sove...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                Sove chanjman yo
                            </>
                        )}
                    </button>
                </Section>

                {/* ── Danger Zone ── */}
                <Section title="Kont" icon="manage_accounts">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all group"
                    >
                        <span className="text-sm font-bold">Dekonekte</span>
                        <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">logout</span>
                    </button>
                </Section>

            </main>



        </div>
    );
}

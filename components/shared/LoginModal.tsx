"use client";

import { useState, useEffect } from "react";
import { ActionModal } from "@/components/ui/ActionModal";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productName: string;
}

export default function LoginModal({
    isOpen,
    onClose,
    onSuccess,
    productName
}: LoginModalProps) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setMode('login');
            setEmail("");
            setFullName("");
            setWhatsappNumber("");
            setPassword("");
            setError(null);
            setInfoMessage(null);
        }
    }, [isOpen]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) return;
        setIsLoading(true);
        setError(null);

        try {
            const { signInWithEmailAndPassword } = await import("firebase/auth");
            const { auth } = await import("@/lib/firebase");
            await signInWithEmailAndPassword(auth, email.trim(), password);
            
            document.cookie = "logged_in=true; path=/; max-age=86400; SameSite=Strict;";
            onSuccess();
            onClose();
            window.location.reload();
        } catch (err: any) {
            console.error("Login error:", err);
            setError("Imel oswa modpas la pa bon. Tanpri re-eseye.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            setError("Tanpri antre yon adrès imel ki valab.");
            return;
        }
        if (!fullName.trim()) {
            setError("Tanpri antre non konplè ou.");
            return;
        }
        if (!whatsappNumber.trim()) {
            setError("Tanpri antre nimewo WhatsApp ou.");
            return;
        }
        if (!password || password.length < 6) {
            setError("Modpas la dwe gen omwen 6 karaktè.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
            const { doc, setDoc } = await import("firebase/firestore");
            const { auth, db } = await import("@/lib/firebase");
            
            const trimmedName = fullName.trim()
                .split(/\s+/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;
            
            // Update Auth Profile
            await updateProfile(user, {
                displayName: trimmedName
            });

            // Create user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                name: trimmedName,
                phone: whatsappNumber.trim(),
                role: "customer",
                status: "active",
                createdAt: new Date().toISOString()
            });
            
            document.cookie = "logged_in=true; path=/; max-age=86400; SameSite=Strict;";
            onSuccess();
            onClose();
            window.location.reload();
        } catch (err: any) {
            console.error("Signup error:", err);
            if (err.code === "auth/email-already-in-use") {
                setError("Imel sa a gen yon kont deja. Tanpri pase nan Tab 'Konekte' a pou w konekte.");
            } else {
                setError("Erè pandan kreyasyon kont la. Tanpri re-eseye.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email.trim()) {
            setError("Tanpri antre imel ou anvan pou w ka resevwa lyen chanjman modpas la.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setInfoMessage(null);
        try {
            const { sendPasswordResetEmail } = await import("firebase/auth");
            const { auth } = await import("@/lib/firebase");
            await sendPasswordResetEmail(auth, email.trim());
            setInfoMessage("Nou voye yon imel pou chanje modpas la. Tcheke bwat resepsyon w lan.");
        } catch (err: any) {
            console.error("Password reset error:", err);
            setError("Erè pandan voye imel la. Tanpri re-eseye.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'login' ? "Koneksyon" : "Enskripsyon"}
            subtitle={`Aksede ak fòmasyon ak kontni w yo sou ${productName}`}
            iconEmoji="🔐"
        >
            <div className="space-y-5 pt-1">
                {/* Navigation Tabs : Konekte / Enskri */}
                <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => { setMode('login'); setError(null); setInfoMessage(null); }}
                        className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                            mode === 'login'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Konekte
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('register'); setError(null); setInfoMessage(null); }}
                        className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                            mode === 'register'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Enskri
                    </button>
                </div>

                {mode === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                                Adrès imel
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20 pr-10"
                                    placeholder="nom@exemple.com"
                                    required
                                    autoFocus
                                />
                                <span className="material-symbols-outlined notranslate absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-lg">
                                    mail
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                                    Modpas
                                </label>
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                                >
                                    Modpas bliye?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20 pr-10"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                                >
                                    <span className="material-symbols-outlined notranslate text-[18px]">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-[11px] font-bold text-red-400 text-center mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                {error}
                            </p>
                        )}
                        {infoMessage && (
                            <p className="text-[11px] font-bold text-emerald-400 text-center mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                {infoMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !email.trim() || password.length < 6}
                            className="w-full h-14 mt-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span>Konekte</span>
                            )}
                        </button>

                        <p className="text-center text-xs text-white/50 pt-2">
                            Pa gen yon kont?{" "}
                            <button
                                type="button"
                                onClick={() => { setMode('register'); setError(null); setInfoMessage(null); }}
                                className="font-bold text-primary hover:underline"
                            >
                                Enskri kounye a
                            </button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                                Non konplè w
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20 pr-10 capitalize"
                                    placeholder="Jean Dupont"
                                    required
                                    autoFocus
                                />
                                <span className="material-symbols-outlined notranslate absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-lg">
                                    person
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                                Adrès imel
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20 pr-10"
                                    placeholder="nom@exemple.com"
                                    required
                                />
                                <span className="material-symbols-outlined notranslate absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-lg">
                                    mail
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                                Nimewo WhatsApp / Telefòn
                            </label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={whatsappNumber}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (/^[\d+]*$/.test(val)) {
                                            setWhatsappNumber(val);
                                        }
                                    }}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20 pr-10"
                                    placeholder="+50937123456"
                                    required
                                />
                                <span className="material-symbols-outlined notranslate absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-lg">
                                    call
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                                Modpas (omwen 6 karaktè)
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20 pr-10"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                                >
                                    <span className="material-symbols-outlined notranslate text-[18px]">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-[11px] font-bold text-red-400 text-center mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !fullName.trim() || !email.trim() || !whatsappNumber.trim() || password.length < 6}
                            className="w-full h-14 mt-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span>Enskri ✨</span>
                            )}
                        </button>

                        <p className="text-center text-xs text-white/50 pt-2">
                            Gen yon kont deja?{" "}
                            <button
                                type="button"
                                onClick={() => { setMode('login'); setError(null); setInfoMessage(null); }}
                                className="font-bold text-primary hover:underline"
                            >
                                Konekte
                            </button>
                        </p>
                    </form>
                )}
            </div>
        </ActionModal>
    );
}


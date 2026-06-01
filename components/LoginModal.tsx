"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ActionModal } from "@/components/ui/ActionModal";
import Link from "next/link";

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
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setFullName("");
            setError(null);
            setIsLoginView(true);
        }
    }, [isOpen]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Login error:", err);
            setError("Imel oswa modpas la pa bon.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Modpas yo pa menm.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        displayName: fullName.trim(),
                        name: fullName.trim(),
                        role: "customer"
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                // Ensure profile is created
                const { error: insertError } = await supabase.from('users').upsert({
                    id: data.user.id,
                    email: data.user.email,
                    name: fullName.trim(),
                    role: "customer",
                    status: "active"
                }, { onConflict: 'id' });
                
                if (insertError) console.error("Error creating user profile:", insertError);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message || "Erè pandan enskripsyon an.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title={isLoginView ? "Konekte" : "Kreye Kont"}
            subtitle={`Konekte pou w ka jwenn ${productName}`}
            iconEmoji="🔐"
        >
            <div className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            setIsLoginView(true);
                            setError(null);
                        }}
                        className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all duration-200 ${isLoginView
                                ? 'bg-primary text-white font-bold shadow-md'
                                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                            }`}
                    >
                        <span className="material-symbols-outlined notranslate text-lg mb-0.5">login</span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Konekte</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsLoginView(false);
                            setError(null);
                        }}
                        className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all duration-200 ${!isLoginView
                                ? 'bg-primary text-white font-bold shadow-md'
                                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                            }`}
                    >
                        <span className="material-symbols-outlined notranslate text-lg mb-0.5">person_add</span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Kreye Kont</span>
                    </button>
                </div>

                <form onSubmit={isLoginView ? handleLogin : handleRegister} className="space-y-4">
                    {!isLoginView && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Non konplè</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                                placeholder="Jean Dupont"
                                required
                            />
                        </div>
                    )}
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Adrès imel</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                            placeholder="nom@exemple.com"
                            required
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Modpas</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20 pr-10"
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

                    {!isLoginView && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Konfime modpas la</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    {error && (
                        <p className="text-[10px] font-black uppercase text-red-500 tracking-widest text-center mt-2">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || password.length < 6}
                        className="w-full h-14 mt-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            isLoginView ? "Konekte" : "Kreye Kont"
                        )}
                    </button>
                </form>
            </div>
        </ActionModal>
    );
}

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoginView, setIsLoginView] = useState(true);
    const router = useRouter();
    const { user, role, loading: authLoading } = useAuth();
    const supabase = createClient();

    // Redirection automatique après connexion
    useEffect(() => {
        if (!authLoading && user) {
            if (role?.trim().toLowerCase() === "admin") {
                router.push("/admin");
            } else {
                router.push("/dashboard");
            }
        }
    }, [user, role, authLoading, router]);

    const handleResetPassword = async () => {
        if (!email) {
            setError("Tanpri antre adrès imel ou pou nou ka voye yon lyen pou chanje modpas ou.");
            setMessage(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setMessage("Nou voye yon imel pou chanje modpas ou nan adrès ou a.");
        } catch (err: any) {
            console.error("Reset password error:", err);
            setError("Erè pandan n ap voye imel pou chanje modpas la.");
        }
        setIsLoading(false);
    };

    const handleEmailRegistration = async (e: React.FormEvent) => {
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
                        full_name: fullName.trim(),
                        name: fullName.trim(),
                        role: "customer"
                    }
                }
            });

            if (error) {
                // Handle specific Supabase errors with friendly messages
                if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
                    setError("Yon kont deja egziste ak imel sa a. Tanpri konekte.");
                    setIsLoginView(true); // Switch to login tab automatically
                } else {
                    setError(error.message || "Gen yon erè ki fèt pandan enskripsyon an.");
                }
                return;
            }

            if (data.user) {
                setMessage("Enskripsyon an reyisi! Tanpri verifye imel ou pou aktive kont ou.");
            }
        } catch (err: any) {
            console.error("Registration error:", err);
            setError("Gen yon erè ki fèt pandan enskripsyon an. Eseye ankò.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        setIsLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                const { data: userData } = await supabase.from('users').select('role').eq('uid', data.user.id).single();
                
                if (userData?.role?.trim().toLowerCase() === "admin") {
                    window.location.href = "/admin";
                } else {
                    window.location.href = "/dashboard";
                }
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            setError("Imel oswa modpas la pa bon.");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-background-dark text-white overflow-hidden">
            {/* Left Side: Auth Form */}
            <div className="w-full lg:w-[62%] xl:w-[68%] flex flex-col px-1.5 md:px-16 lg:px-24 xl:px-32 py-6 md:py-12 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full bg-[#080808]">
                {/* Logo Area */}
                <Link href="/" className="flex items-center gap-3 mb-20 group">
                    <img src="/logo.png" alt="DJR Akademi" className="size-10 rounded-xl object-cover" />
                    <span className="text-white text-xl font-black tracking-tighter uppercase">DJR Akademi</span>
                </Link>

                <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
                    <div className="mb-10">
                        <p className="text-primary text-xs font-black uppercase tracking-[0.25em] mb-3">Byenvini</p>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase leading-[0.9] text-white">
                            Aprann sèvi <br /> ak IA.
                        </h1>
                        <p className="text-white/50 text-base">
                            Antre nan kou w, ebook ak rezèvasyon w yo fasil.
                        </p>
                    </div>

                    <div className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium text-center">
                                {message}
                            </div>
                        )}

                        <div className="flex flex-col gap-4">
                            {/* TABS SELECTOR */}
                            <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLoginView(true);
                                        setError(null);
                                        setMessage(null);
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
                                        setMessage(null);
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

                            <form onSubmit={isLoginView ? handleEmailAuth : handleEmailRegistration} className="flex flex-col gap-4 py-5 px-4 sm:p-5 border border-white/10 rounded-2xl bg-white/[0.03]">
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
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Modpas</label>
                                        {isLoginView && (
                                            <button
                                                type="button"
                                                onClick={handleResetPassword}
                                                className="text-xs text-white/40 hover:text-primary transition-colors"
                                            >
                                                Ou bliye modpas ou?
                                            </button>
                                        )}
                                    </div>
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
                                    <p className="text-[11px] text-white/40 pl-1 mt-1">
                                        Modpas la dwe gen omwen 6 karaktè.
                                    </p>
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
                                <button
                                    type="submit"
                                    disabled={isLoading || password.length < 6}
                                    className="w-full py-3 mt-1 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {isLoading ? (
                                        <div className="h-5 w-5 mx-auto border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        isLoginView ? "Konekte" : "Kreye yon kont"
                                    )}
                                </button>
                            </form>
                        </div>

                        <p className="text-center text-xs text-white/30">
                            Lè ou kontinye, ou dakò ak{" "}
                            <Link href="/terms" className="underline hover:text-primary transition-colors">
                                Kondisyon itilizasyon
                            </Link>{" "}
                            ak{" "}
                            <Link href="/privacy" className="underline hover:text-primary transition-colors">
                                Règleman konfidansyalite
                            </Link>.
                        </p>
                    </div>
                </div>

                {/* Footer Quote */}
                <div className="mt-auto pt-12">
                    <p className="text-xs font-medium italic text-white/20">
                        "Mond lan Gen ase richès pou tout moun jwenn epi viv byen."
                    </p>
                </div>
            </div>

            {/* Right Side: Sleek Designer Panel */}
            <div className="hidden lg:flex lg:w-[38%] xl:w-[32%] flex-col justify-between p-12 relative bg-[#070707] border-l border-white/[0.06] overflow-hidden">
                {/* Background Grid Pattern & Radial Glows */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/15 blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange-500/10 blur-[120px]" />

                {/* Top Badge */}
                <div className="relative z-10 flex justify-end">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-full">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Live Platform</span>
                    </div>
                </div>

                {/* Interactive Preview Cards (Sleek Visuals) */}
                <div className="relative z-10 my-auto space-y-5">
                    {/* Course Card Preview */}
                    <div className="p-4 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl transition-all duration-300 hover:border-white/20 group">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined notranslate">school</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Kou Aktif</p>
                                <h4 className="text-sm font-bold text-white truncate">Metriz Entelijans Atifisyèl (IA)</h4>
                            </div>
                        </div>
                        <div className="mt-4 space-y-1.5">
                            <div className="flex justify-between text-[10px] text-white/50">
                                <span>Pwogrè</span>
                                <span className="font-bold text-primary">68%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: '68%' }} />
                            </div>
                        </div>
                    </div>

                    {/* Booking Card Preview */}
                    <div className="p-4 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl transition-all duration-300 hover:border-white/20 group">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined notranslate">calendar_today</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Konsiltasyon</p>
                                <h4 className="text-sm font-bold text-white truncate">Rezèv konfime ak DJR</h4>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-white/60 bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="material-symbols-outlined notranslate text-sm text-emerald-400">check_circle</span>
                            <span>Jodi a a 15:00 (15 min)</span>
                        </div>
                    </div>
                </div>

                {/* Footer Content */}
                <div className="relative z-10 mt-auto">
                    <h3 className="text-white text-2xl font-black uppercase tracking-tight leading-none mb-4">
                        Kominote <br />
                        <span className="text-primary">DJR Akademi</span>
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2.5">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="size-8 rounded-full border border-black bg-white/20 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User" />
                                </div>
                            ))}
                            <div className="size-8 rounded-full border border-black bg-primary flex items-center justify-center text-[9px] font-black text-white">
                                +100
                            </div>
                        </div>
                        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Plis pase 100 elèv</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

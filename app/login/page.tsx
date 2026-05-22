"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
// Importation des fonctions Firestore pour manipuler les documents
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoginView, setIsLoginView] = useState(true);
    const router = useRouter();
    const { user, role, loading: authLoading } = useAuth();

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
            setError("Veuillez entrer votre adresse e-mail pour réinitialiser le mot de passe.");
            setMessage(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        setMessage(null);
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Un e-mail de réinitialisation a été envoyé à votre adresse.");
        } catch (err: any) {
            console.error("Reset password error:", err);
            if (err.code === 'auth/user-not-found') {
                setError("Aucun utilisateur trouvé avec cette adresse e-mail.");
            } else {
                setError("Erreur lors de l'envoi de l'e-mail de réinitialisation.");
            }
        }
        setIsLoading(false);
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        if (!isLoginView) {
            if (password !== confirmPassword) {
                setError("Les mots de passe ne correspondent pas.");
                return;
            }
            if (password.length < 6) {
                setError("Le mot de passe doit contenir au moins 6 caractères.");
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        setMessage(null);
        try {
            let user;
            if (isLoginView) {
                const result = await signInWithEmailAndPassword(auth, email, password);
                user = result.user;
            } else {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                user = result.user;
            }
            
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    fullName: email.split('@')[0],
                    email: user.email,
                    photoURL: "",
                    phone: "",
                    role: "customer",
                    createdAt: serverTimestamp(),
                });
                
                window.location.href = "/dashboard";
                return;
            }

            if (userSnap.exists()) {
                if (!userSnap.data().createdAt) {
                    await setDoc(userRef, { createdAt: serverTimestamp() }, { merge: true });
                }

                if (userSnap.data().role?.trim().toLowerCase() === "admin") {
                    window.location.href = "/admin";
                } else {
                    window.location.href = "/dashboard";
                }
                return;
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            if (isLoginView) {
                setError("Email ou mot de passe incorrect.");
            } else {
                if (err.code === 'auth/email-already-in-use') {
                    setError("Cette adresse e-mail est déjà utilisée.");
                } else if (err.code === 'auth/weak-password') {
                    setError("Le mot de passe doit contenir au moins 6 caractères.");
                } else {
                    setError("Une erreur est survenue lors de l'inscription.");
                }
            }
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Déclenche le popup de connexion Google
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // 2. Création d'une référence vers le document de l'utilisateur dans la collection "users"
            // On utilise l'UID unique de l'utilisateur comme identifiant de document
            const userRef = doc(db, "users", user.uid);

            // 3. Vérifie si l'utilisateur existe déjà dans Firestore
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // SI L'UTILISATEUR N'EXISTE PAS : On crée son profil complet
                await setDoc(userRef, {
                    displayName: user.displayName || "Anonyme", // Nom récupéré de Google
                    email: user.email,                      // Email récupéré de Google
                    photoURL: user.photoURL,                // Photo de profil récupérée de Google
                    phoneNumber: user.phoneNumber || "",          // Numéro de téléphone (si disponible)
                    role: "user",                           // Rôle par défaut
                    createdAt: serverTimestamp(),           // Date de création via le serveur Firebase
                });
            } else {
                // SI L'UTILISATEUR EXISTE DÉJÀ : On met à jour ses infos et on s'assure qu'il a une date de création
                const existingData = userSnap.data();
                const updates: any = {
                    displayName: user.displayName || existingData.displayName || existingData.fullName,
                    photoURL: user.photoURL || existingData.photoURL,
                };
                
                if (!existingData.createdAt) {
                    updates.createdAt = serverTimestamp();
                }

                await setDoc(userRef, updates, { merge: true });
            }
            // 4. Redirection vers le tableau approprié
            if (userSnap.exists() && userSnap.data().role?.trim().toLowerCase() === "admin") {
                window.location.href = "/admin";
            } else {
                window.location.href = "/dashboard";
            }
        } catch (err: any) {
            console.error("Login error:", err);
            setError("Une erreur est survenue lors de la connexion. Veuillez réessayer.");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-background-dark text-white overflow-hidden">
            {/* Left Side: Auth Form */}
            <div className="w-full lg:w-[45%] flex flex-col px-8 md:px-16 lg:px-24 py-12 overflow-y-auto bg-[#0d0d0d]">
                {/* Logo Area */}
                <Link href="/" className="flex items-center gap-3 mb-20 group">
                    <img src="/logo.png" alt="DJR Akademi" className="size-10 rounded-xl object-cover" />
                    <span className="text-white text-xl font-black tracking-tighter uppercase">DJR Akademi</span>
                </Link>

                <div className="max-w-md w-full mx-auto lg:mx-0 flex-1 flex flex-col justify-center">
                    <div className="mb-10">
                        <p className="text-primary text-xs font-black uppercase tracking-[0.25em] mb-3">Bienvenu</p>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase leading-[0.9] text-white">
                            Aprann sèvi <br /> ak IA.
                        </h1>
                        <p className="text-white/50 text-base">
                            Accède à tes cours, ebooks et réservations en un clic.
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

                        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 p-5 border border-white/10 rounded-2xl bg-white/[0.03]">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Adresse e-mail</label>
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
                                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Mot de passe</label>
                                        {isLoginView && (
                                            <button
                                                type="button"
                                                onClick={handleResetPassword}
                                                className="text-xs text-white/40 hover:text-primary transition-colors"
                                            >
                                                Mot de passe oublié ?
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm text-white placeholder:text-white/20"
                                        placeholder="••••••••"
                                        required
                                        minLength={isLoginView ? undefined : 6}
                                    />
                                </div>
                                {!isLoginView && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Confirmer le mot de passe</label>
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
                                    disabled={isLoading}
                                    className="w-full py-3 mt-1 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {isLoading ? (
                                        <div className="h-5 w-5 mx-auto border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        isLoginView ? "Se connecter" : "S'inscrire"
                                    )}
                                </button>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsLoginView(!isLoginView);
                                            setError(null);
                                            setMessage(null);
                                        }}
                                        className="text-sm text-white/40 hover:text-white transition-colors"
                                    >
                                        {isLoginView ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
                                    </button>
                                </div>
                            </form>


                        <p className="text-center text-xs text-white/30">
                            En continuant, vous acceptez nos{" "}
                            <Link href="/terms" className="underline hover:text-primary transition-colors">
                                Conditions d'utilisation
                            </Link>{" "}
                            et notre{" "}
                            <Link href="/privacy" className="underline hover:text-primary transition-colors">
                                Politique de confidentialité
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

            {/* Right Side: Hero Image */}
            <div className="hidden lg:block flex-1 relative bg-black overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop"
                    alt="DJR Akademi"
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
                {/* Overlay gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d] via-transparent to-transparent"></div>

                {/* Floating Content */}
                <div className="absolute bottom-16 left-12 right-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Plateforme Active</span>
                    </div>
                    <h2 className="text-white text-4xl font-black uppercase tracking-tighter leading-tight max-w-md mb-6">
                        Yon kominote ki ap grandi chak jou.
                    </h2>
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="size-10 rounded-full border-2 border-black bg-white/20 backdrop-blur-md overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                            </div>
                        ))}
                        <div className="size-10 rounded-full border-2 border-black bg-primary flex items-center justify-center text-[10px] font-black text-white">
                            +100
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

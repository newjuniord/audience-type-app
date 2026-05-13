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
                    fullName: user.displayName || "Anonyme", // Nom récupéré de Google
                    email: user.email,                      // Email récupéré de Google
                    photoURL: user.photoURL,                // Photo de profil récupérée de Google
                    phone: user.phoneNumber || "",          // Numéro de téléphone (si disponible)
                    role: "user",                           // Rôle par défaut
                    createdAt: serverTimestamp(),           // Date de création via le serveur Firebase
                });
            } else {
                // SI L'UTILISATEUR EXISTE DÉJÀ : On met à jour ses infos et on s'assure qu'il a une date de création
                const existingData = userSnap.data();
                const updates: any = {
                    fullName: user.displayName || existingData.fullName,
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
        <div className="flex h-screen w-full bg-white dark:bg-background-dark text-primary dark:text-white overflow-hidden">
            {/* Left Side: Auth Form */}
            <div className="w-full lg:w-[45%] flex flex-col px-8 md:px-16 lg:px-24 py-12 overflow-y-auto">
                {/* Logo Area */}
                <Link href="/" className="flex items-center gap-3 mb-20 group">
                    <div className="size-10 bg-black dark:bg-white rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12">
                        <span className="material-symbols-outlined text-white dark:text-black">bolt</span>
                    </div>
                    <span className="text-xl font-black tracking-tighter uppercase italic">Audience Type</span>
                </Link>

                <div className="max-w-md w-full mx-auto lg:mx-0 flex-1 flex flex-col justify-center">
                    <div className="mb-10">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase leading-[0.9]">
                            Élève ton <br /> niveau.
                        </h1>
                        <p className="text-primary/60 dark:text-white/60 text-lg">
                            Accède à tes cours, ebooks et réservations en un clic.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium text-center">
                                {message}
                            </div>
                        )}

                        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 p-[20px] border border-primary/10 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-primary/80 dark:text-white/80">Adresse e-mail</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-primary/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-white/20 transition-all text-sm"
                                    placeholder="nom@exemple.com"
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-primary/80 dark:text-white/80">Mot de passe</label>
                                    {isLoginView && (
                                        <button 
                                            type="button" 
                                            onClick={handleResetPassword}
                                            className="text-xs text-primary/60 dark:text-white/60 hover:text-primary dark:hover:text-white transition-colors"
                                        >
                                            Mot de passe oublié ?
                                        </button>
                                    )}
                                </div>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-primary/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-white/20 transition-all text-sm"
                                    placeholder="••••••••"
                                    required
                                    minLength={isLoginView ? undefined : 6}
                                />
                            </div>
                            {!isLoginView && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-primary/80 dark:text-white/80">Confirmer le mot de passe</label>
                                    <input 
                                        type="password" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-primary/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-white/20 transition-all text-sm"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            )}
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 mt-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isLoading ? (
                                    <div className="h-5 w-5 mx-auto border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    isLoginView ? "Se connecter" : "S'inscrire"
                                )}
                            </button>

                            <div className="text-center mt-2">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsLoginView(!isLoginView);
                                        setError(null);
                                        setMessage(null);
                                    }}
                                    className="text-sm text-primary/60 dark:text-white/60 hover:text-primary dark:hover:text-white transition-colors"
                                >
                                    {isLoginView ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
                                </button>
                            </div>
                        </form>

                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-primary/10 dark:border-white/10"></div>
                            </div>
                            <div className="relative bg-white dark:bg-background-dark px-4 text-xs font-medium text-primary/40 dark:text-white/40 uppercase tracking-wider">
                                Ou continuer avec
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="group relative w-full h-16 flex items-center justify-center gap-4 bg-white dark:bg-white/5 border-2 border-primary/10 dark:border-white/10 rounded-2xl text-lg font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 shadow-xl shadow-black/5 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                        >
                            {isLoading ? (
                                <div className="h-6 w-6 border-3 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Continuer avec Google
                                </>
                            )}
                        </button>

                        <p className="text-center text-sm text-primary/40 dark:text-white/40">
                            En continuant, vous acceptez nos{" "}
                            <Link href="/terms" className="underline hover:text-primary dark:hover:text-white transition-colors">
                                Conditions d'utilisation
                            </Link>{" "}
                            et notre{" "}
                            <Link href="/privacy" className="underline hover:text-primary dark:hover:text-white transition-colors">
                                Politique de confidentialité
                            </Link>.
                        </p>
                    </div>
                </div>

                {/* Footer Quote */}
                <div className="mt-auto pt-12">
                    <p className="text-sm font-medium italic opacity-40">
                        "L'avenir appartient à ceux qui se lèvent tôt pour construire leur audience."
                    </p>
                </div>
            </div>

            {/* Right Side: Hero Image */}
            <div className="hidden lg:block flex-1 relative bg-black">
                <img
                    src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop"
                    alt="Futuristic Landscape"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

                {/* Floating Content over Image */}
                <div className="absolute bottom-20 left-20 right-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Plateforme Live</span>
                    </div>
                    <h2 className="text-white text-4xl font-black uppercase tracking-tighter leading-tight max-w-lg mb-4">
                        Rejoins +100 <br /> membres actifs.
                    </h2>
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="size-10 rounded-full border-2 border-black bg-white/20 backdrop-blur-md overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                            </div>
                        ))}
                        <div className="size-10 rounded-full border-2 border-black bg-white dark:bg-background-dark flex items-center justify-center text-[10px] font-bold">
                            +100
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

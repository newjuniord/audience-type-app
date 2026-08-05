"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as DBUser } from "../lib/types";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

interface AuthContextType {
    user: FirebaseUser | null;
    userData: DBUser | null;
    role: string | null;
    loading: boolean;
    signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    role: null,
    loading: true,
    signOutUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<DBUser | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Écouter les données du profil utilisateur depuis Firestore
                const userRef = doc(db, "users", firebaseUser.uid);
                
                const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data() as DBUser;
                        data.id = docSnap.id;
                        data.uid = docSnap.id;
                        setUserData(data);
                        setRole(data.role || "customer");
                    } else {
                        setUserData(null);
                        setRole("customer"); // fallback par défaut
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Erreur de récupération des données utilisateur:", error);
                    setUserData(null);
                    setRole("customer");
                    setLoading(false);
                });
                
                return () => unsubscribeDoc();
            } else {
                setUserData(null);
                setRole(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const signOutUser = async () => {
        try {
            await signOut(auth);
            document.cookie = "logged_in=; path=/; max-age=0; SameSite=Strict;";
            window.location.href = "/";
        } catch (error) {
            console.error("Erreur lors de la déconnexion:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userData, role, loading, signOutUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { User as FirestoreUser } from "../lib/types";

interface AuthContextType {
    user: FirebaseUser | null;
    userData: FirestoreUser | null;
    role: string | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    role: null,
    loading: true,
});

import { onAuthStateChanged } from "firebase/auth";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<FirestoreUser | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                setUser(authUser);
                // Fetch user data and role from Firestore
                try {
                    const userDoc = await getDoc(doc(db, "users", authUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data() as FirestoreUser;
                        setUserData({ ...data, uid: authUser.uid });
                        setRole(data.role || "customer");
                    } else {
                        setUserData(null);
                        setRole("customer");
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUserData(null);
                    setRole("customer");
                }
            } else {
                setUser(null);
                setUserData(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, userData, role, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

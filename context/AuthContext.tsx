"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";
import { User as FirestoreUser } from "../lib/types";

interface AuthContextType {
    user: FirebaseUser | null;
    userData: FirestoreUser | null;
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

import { onAuthStateChanged, signOut } from "firebase/auth";

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
                    let data: any = null;
                    let foundByUid = false;

                    if (userDoc.exists()) {
                        data = userDoc.data();
                        // Check if this is a "real" profile (has a role) or just a "shadow" presence doc
                        if (data.role || data.Role || data.ROLE) {
                            console.log("AuthContext: Real profile found by UID:", data);
                            foundByUid = true;
                        } else {
                            console.warn("AuthContext: Shadow/empty doc found by UID, trying email fallback...");
                        }
                    }

                    if (!foundByUid && authUser.email) {
                        // FALLBACK: Search by email if UID fails or if UID doc is empty
                        console.log("AuthContext: Searching by email for:", authUser.email);
                        const q = query(collection(db, "users"), where("email", "==", authUser.email), limit(1));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                            const foundDoc = querySnapshot.docs[0];
                            data = foundDoc.data();
                            console.log("AuthContext: Real profile found by Email Fallback:", data);
                            
                            // Optional: If we found by email but it's not the same as UID, 
                            // we should probably link them later, but for now just use this data.
                        } else {
                            console.warn("AuthContext: No document found by UID or Email with a role.");
                        }
                    }

                    if (data) {
                        // BACKFILL: If missing createdAt, generate and assign it
                        const updates: any = {};
                        if (!data.createdAt) {
                            updates.createdAt = serverTimestamp();
                            console.log("AuthContext: Backfilling missing createdAt for user:", authUser.uid);
                        }

                        if (Object.keys(updates).length > 0) {
                            await setDoc(doc(db, "users", authUser.uid), updates, { merge: true });
                            // Update local data object too
                            Object.assign(data, updates);
                        }

                        setUserData({ ...data, uid: authUser.uid } as FirestoreUser);
                        const rawRole = (data.role || data.Role || data.ROLE || "customer")?.toString();
                        const finalRole = rawRole.trim().toLowerCase();
                        setRole(finalRole);
                    } else {
                        setUserData(null);
                        setRole("customer");
                    }
                } catch (error) {
                    console.error("AuthContext: Error fetching user data:", error);
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

    // Presence management - ONLY start after loading is done and we have a real user
    useEffect(() => {
        if (!user || loading) return;

        const presenceRef = doc(db, "users", user.uid);

        const updatePresence = async () => {
            try {
                // Fetch latest data to avoid overwriting fullName/displayName with null
                const snap = await getDoc(presenceRef);
                const currentData = snap.exists() ? snap.data() : {};
                
                const finalName = user.displayName || currentData.displayName || currentData.fullName || "";
                const finalPhoto = user.photoURL || currentData.photoURL || currentData.photoUrl || "";

                await setDoc(presenceRef, {
                    isOnline: true,
                    lastActive: serverTimestamp(),
                    email: user.email,
                    displayName: finalName,
                    photoURL: finalPhoto
                }, { merge: true });
            } catch (error) {
                console.error("Error updating presence:", error);
            }
        };

        // Initial Ping
        updatePresence();

        // Ping every 1 hour (3600000 ms)
        const interval = setInterval(updatePresence, 3600000);

        // Disconnect hook (best effort on web)
        const handleBeforeUnload = () => {
            setDoc(presenceRef, { isOnline: false }, { merge: true }).catch(() => {});
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            // Marquer comme hors ligne au démontage
            setDoc(presenceRef, { isOnline: false }, { merge: true }).catch(() => {});
        };
    }, [user, loading]);

    const signOutUser = async () => {
        if (user) {
            try {
                const presenceRef = doc(db, "users", user.uid);
                await setDoc(presenceRef, { isOnline: false }, { merge: true });
            } catch (error) {
                console.error("Error setting offline status on logout:", error);
            }
        }
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, userData, role, loading, signOutUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

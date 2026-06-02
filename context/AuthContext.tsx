"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";
import { User as DBUser } from "../lib/types";

interface AuthContextType {
    user: SupabaseUser | null;
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
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [userData, setUserData] = useState<DBUser | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        const fetchUserData = async (authUser: SupabaseUser) => {
            try {
                // Fetch user data from Supabase "users" table
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('uid', authUser.id)
                    .single();

                if (error) {
                    console.error("AuthContext: Error fetching user data:", error);
                    setUserData(null);
                    setRole("customer");
                    return;
                }

                if (data) {
                    // Update local data object
                    setUserData({ ...data, uid: authUser.id } as DBUser);
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
        };

        let isMounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                try {
                    const authUser = session?.user;
                    if (authUser) {
                        if (isMounted) setUser(authUser);
                        await fetchUserData(authUser);
                    } else {
                        if (isMounted) {
                            setUser(null);
                            setUserData(null);
                            setRole(null);
                        }
                    }
                } catch (err) {
                    console.error("AuthContext: onAuthStateChange error", err);
                } finally {
                    if (isMounted) setLoading(false);
                }
            }
        );

        // Initial check
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) throw error;
            const authUser = session?.user;
            if (authUser) {
                if (isMounted) setUser(authUser);
                fetchUserData(authUser).finally(() => {
                    if (isMounted) setLoading(false);
                });
            } else {
                if (isMounted) setLoading(false);
            }
        }).catch(err => {
            console.error("AuthContext: getSession error", err);
            if (isMounted) setLoading(false);
        });

        // Failsafe: force loading to false after 5 seconds max
        const failsafeTimer = setTimeout(() => {
            if (isMounted && loading) {
                console.warn("AuthContext: Loading stuck for 5s, forcing false.");
                setLoading(false);
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearTimeout(failsafeTimer);
            subscription.unsubscribe();
        };
    }, []);

    const signOutUser = async () => {
        // Remove logged_in cookie
        document.cookie = "logged_in=; path=/; max-age=0; SameSite=Strict; Secure";
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, userData, role, loading, signOutUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

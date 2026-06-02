"use client";

import React, { createContext, useContext, useState } from "react";

// Mock User pour l'interface
const mockUser = {
    id: "mock-user-123",
    email: "admin@audiencetype.com",
    user_metadata: {
        displayName: "Admin User"
    }
};

const mockUserData = {
    uid: "mock-user-123",
    email: "admin@audiencetype.com",
    displayName: "Admin User",
    role: "admin",
    createdAt: new Date().toISOString()
};

const AuthContext = createContext<any>({
    user: mockUser,
    userData: mockUserData,
    role: "admin",
    loading: false,
    signOutUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <AuthContext.Provider value={{ 
            user: mockUser, 
            userData: mockUserData, 
            role: "admin", 
            loading: false, 
            signOutUser: async () => {} 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

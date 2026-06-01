"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAnnouncementSettings, AnnouncementBarSettings, defaultSettings } from "@/lib/announcement";
import { getEnrollmentsByUser } from "@/lib/enrollments";
import Link from "next/link";

export default function AnnouncementBar() {
    const { user, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<AnnouncementBarSettings | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const data = await getAnnouncementSettings();
                setSettings(data);
            } catch (error) {
                console.error("Error fetching announcement settings:", error);
                setSettings(defaultSettings);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    useEffect(() => {
        if (!settings || authLoading) return;

        const currentSettings = settings; // Capture for TS

        async function checkVisibility() {
            if (!currentSettings.isActive) {
                setIsVisible(false);
                return;
            }

            // Check displayFor
            if (currentSettings.displayFor === 'logged-in' && !user) {
                setIsVisible(false);
                return;
            }
            if (currentSettings.displayFor === 'guest' && user) {
                setIsVisible(false);
                return;
            }

            // Check productFilter
            if (currentSettings.productFilter !== 'all' && user) {
                try {
                    const uid = user.id || (user as any).uid;
                    const enrollments = await getEnrollmentsByUser(uid);
                    const hasProduct = enrollments.length > 0;

                    if (currentSettings.productFilter === 'has-product' && !hasProduct) {
                        setIsVisible(false);
                        return;
                    }
                    if (currentSettings.productFilter === 'no-product' && hasProduct) {
                        setIsVisible(false);
                        return;
                    }
                } catch (error) {
                    console.error("Error checking enrollments:", error);
                    if (currentSettings.productFilter === 'has-product') {
                        setIsVisible(false);
                        return;
                    }
                }
            } else if (currentSettings.productFilter !== 'all' && !user) {
                if (currentSettings.productFilter === 'has-product') {
                    setIsVisible(false);
                    return;
                }
            }

            setIsVisible(true);
        }

        checkVisibility();
    }, [settings, user, authLoading]);

    if (loading || authLoading || !isVisible || !settings) return null;

    const barContent = (
        <div 
            className="w-full py-2 px-4 text-center text-sm font-medium transition-all duration-300 animate-in slide-in-from-top"
            style={{ 
                backgroundColor: settings.backgroundColor, 
                color: settings.textColor 
            }}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
                <span>{settings.text}</span>
            </div>
        </div>
    );

    if (settings.link) {
        return (
            <Link href={settings.link} className="block hover:opacity-90 transition-opacity">
                {barContent}
            </Link>
        );
    }

    return barContent;
}

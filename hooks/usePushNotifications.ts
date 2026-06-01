import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export function usePushNotifications() {
    const { user } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const [isSupportedBrowser, setIsSupportedBrowser] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPermissionStatus(Notification.permission);
            setIsSupportedBrowser(false); // Disabled for Supabase migration
        }
    }, []);

    const requestPermissionAndGetToken = async () => {
        if (!user) return null;
        console.warn('Push messaging is disabled pending a Supabase compatible solution (e.g., OneSignal).');
        return null;
    };

    return {
        token,
        permissionStatus,
        isSupportedBrowser,
        requestPermissionAndGetToken
    };
}

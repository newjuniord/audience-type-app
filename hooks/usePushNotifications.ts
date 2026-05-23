import { useState, useEffect } from 'react';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export function usePushNotifications() {
    const { user } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const [isSupportedBrowser, setIsSupportedBrowser] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPermissionStatus(Notification.permission);
            isSupported().then(supported => {
                setIsSupportedBrowser(supported);
                if (supported && Notification.permission === 'granted') {
                    const messaging = getMessaging(app);
                    onMessage(messaging, (payload) => {
                        console.log('Foreground message received. ', payload);
                        if (Notification.permission === 'granted') {
                            new Notification(payload.notification?.title || 'Notifikasyon', {
                                body: payload.notification?.body,
                                icon: '/logo.png'
                            });
                        }
                    });
                }
            });
        }
    }, []);

    const requestPermissionAndGetToken = async () => {
        if (!user) return null;
        if (!isSupportedBrowser) {
            console.warn('Push messaging is not supported by this browser.');
            return null;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);

            if (permission === 'granted') {
                const messaging = getMessaging(app);
                const currentToken = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                });

                if (currentToken) {
                    setToken(currentToken);
                    // Save token to user's Firestore document
                    await updateDoc(doc(db, 'users', user.uid), {
                        fcmToken: currentToken
                    });
                    console.log('FCM Token generated and saved successfully.');
                    return currentToken;
                } else {
                    console.log('No registration token available. Request permission to generate one.');
                }
            } else {
                console.log('Notification permission denied.');
            }
        } catch (error) {
            console.error('An error occurred while retrieving token. ', error);
        }
        return null;
    };

    return {
        token,
        permissionStatus,
        isSupportedBrowser,
        requestPermissionAndGetToken
    };
}

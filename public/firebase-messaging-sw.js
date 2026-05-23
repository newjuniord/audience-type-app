importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDEXwnF2AtQtJ3LXVaSAkaXgwCF__ieKw4",
    authDomain: "audience-type.firebaseapp.com",
    projectId: "audience-type",
    storageBucket: "audience-type.firebasestorage.app",
    messagingSenderId: "598058051445",
    appId: "1:598058051445:web:9e368f7ab54e23ccf1553c",
    measurementId: "G-4XD71CSZM0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || 'Notifikasyon';
    const notificationOptions = {
        body: payload.notification?.body,
        icon: '/logo.png',
        badge: '/icons/icon-192.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAuhNKygw6dv8jqfNY8qnmIrX-TsLy2jvI",
    authDomain: "dairy-app-abhijit.firebaseapp.com",
    databaseURL: "https://dairy-app-abhijit-default-rtdb.firebaseio.com",
    projectId: "dairy-app-abhijit",
    storageBucket: "dairy-app-abhijit.appspot.com",
    messagingSenderId: "196152880143",
    appId: "1:196152880143:web:bec02170e30932a7d5877a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Dairy App Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/Dairy-App/logo.png',
        badge: '/Dairy-App/logo.png',
        tag: 'dairy-notification',
        requireInteraction: true,
        actions: [
            { action: 'view', title: 'View Details' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    } else if (event.action === 'dismiss') {
        console.log('Notification dismissed');
    } else {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// Handle push events (alternative to onBackgroundMessage)
self.addEventListener('push', (event) => {
    console.log('Push event received:', event);
    
    if (event.data) {
        const payload = event.data.json();
        const notificationTitle = payload.notification?.title || 'Dairy App';
        const notificationOptions = {
            body: payload.notification?.body || 'You have a new notification',
            icon: '/Dairy-App/logo.png',
            badge: '/Dairy-App/logo.png',
            tag: 'dairy-push-notification',
            requireInteraction: true,
            data: payload.data || {}
        };

        event.waitUntil(
            self.registration.showNotification(notificationTitle, notificationOptions)
        );
    }
});

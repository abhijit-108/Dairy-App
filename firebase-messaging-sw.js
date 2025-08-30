// Import and configure Firebase
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

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

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background FCM messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: '/Dairy-App/logo.png',
        data: { 
            ...payload.data,
            type: "FCM"   // 👈 mark as FCM for clarity
        }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click (both LOCAL + FCM)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    let targetUrl = 'https://abhijit-108.github.io/Dairy-App/';

    // Distinguish LOCAL vs FCM
    if (event.notification.data?.type === "LOCAL") {
        const personName = event.notification.data.name || "";
        const encodedName = encodeURIComponent(personName);
        targetUrl = `https://abhijit-108.github.io/Dairy-App/all_member.html?name=${encodedName}`;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.startsWith(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

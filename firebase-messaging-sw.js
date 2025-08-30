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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/Dairy-App/logo.png', // make sure path is correct in GitHub Pages
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const appUrl = 'https://abhijit-108.github.io/Dairy-App/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === appUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(appUrl);
      }
    })
  );
});

// Service Worker for Push Notifications
const CACHE_NAME = 'morning-coffee-v1';

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
    console.log('Push notification received');
    
    const options = {
        body: "Time to fuel your mind and start strong! ☕",
        icon: '/coffee-icon.png',
        badge: '/coffee-badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            url: self.registration.scope
        },
        actions: [
            { action: 'open', title: 'Open App' },
            { action: 'close', title: 'Dismiss' }
        ],
        requireInteraction: true,
        tag: 'morning-coffee-reminder'
    };
    
    event.waitUntil(
        self.registration.showNotification('Get After It! 🔥', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked');
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    // Open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.registration.scope) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// Background sync for scheduled notifications
self.addEventListener('sync', (event) => {
    if (event.tag === 'morning-reminder') {
        event.waitUntil(showMorningNotification());
    }
});

async function showMorningNotification() {
    const options = {
        body: "Your morning wisdom awaits! Time to learn something new. ☕",
        icon: '/coffee-icon.png',
        vibrate: [100, 50, 100],
        tag: 'morning-coffee-reminder',
        requireInteraction: true
    };
    
    await self.registration.showNotification('Get After It! 🔥', options);
}

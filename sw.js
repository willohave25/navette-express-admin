/**
 * NAVETTE EXPRESS - Service Worker
 * Gestion du cache offline et notifications push
 * W2K-Digital 2025
 */

const CACHE_NAME = 'navette-express-admin-v1.0.0';
const STATIC_CACHE = 'nx-static-v1';
const DYNAMIC_CACHE = 'nx-dynamic-v1';
const API_CACHE = 'nx-api-v1';

// Fichiers à mettre en cache lors de l'installation
const STATIC_ASSETS = [
    '/',
    '/login.html',
    '/dashboard.html',
    '/utilisateurs.html',
    '/lignes.html',
    '/creer-ligne.html',
    '/flotte.html',
    '/chauffeurs.html',
    '/dispatch.html',
    '/reservations.html',
    '/paiements.html',
    '/facturation.html',
    '/gps.html',
    '/notifications.html',
    '/rapports.html',
    '/parametres.html',
    '/erreur.html',
    '/css/admin.css',
    '/js/admin.js',
    '/js/charts.js',
    '/js/supabase-config.js',
    '/js/fineopay-config.js',
    '/manifest.json',
    '/images/logo-navette-express.svg',
    '/images/icons/icon-192x192.png',
    '/images/icons/icon-512x512.png'
];

// URLs à ne jamais mettre en cache
const EXCLUDED_URLS = [
    '/api/',
    'supabase.co',
    'fineopay.com',
    'analytics',
    'hot-update'
];

// Durée de validité du cache API (en millisecondes)
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Installation du Service Worker
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installation en cours...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Mise en cache des ressources statiques');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Installation terminée');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Erreur installation:', error);
            })
    );
});

/**
 * Activation du Service Worker
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation en cours...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name !== STATIC_CACHE && 
                                   name !== DYNAMIC_CACHE && 
                                   name !== API_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Suppression ancien cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation terminée');
                return self.clients.claim();
            })
    );
});

/**
 * Interception des requêtes
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer certaines URLs
    if (shouldExclude(url)) {
        return;
    }

    // Stratégie selon le type de ressource
    if (request.method !== 'GET') {
        // POST, PUT, DELETE: Network only
        event.respondWith(networkOnly(request));
    } else if (isApiRequest(url)) {
        // Requêtes API: Network first avec cache
        event.respondWith(networkFirstWithCache(request, API_CACHE));
    } else if (isStaticAsset(url)) {
        // Assets statiques: Cache first
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else {
        // Autres: Stale while revalidate
        event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    }
});

/**
 * Stratégie: Cache First
 */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return offlineFallback(request);
    }
}

/**
 * Stratégie: Network First avec cache
 */
async function networkFirstWithCache(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        return offlineFallback(request);
    }
}

/**
 * Stratégie: Stale While Revalidate
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);
    
    return cached || await fetchPromise || offlineFallback(request);
}

/**
 * Stratégie: Network Only
 */
async function networkOnly(request) {
    try {
        return await fetch(request);
    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Connexion requise pour cette action' }),
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * Fallback pour le mode hors ligne
 */
function offlineFallback(request) {
    const url = new URL(request.url);
    
    // Pages HTML: Retourner la page d'erreur
    if (request.headers.get('accept')?.includes('text/html')) {
        return caches.match('/erreur.html');
    }
    
    // Images: Retourner placeholder
    if (request.headers.get('accept')?.includes('image')) {
        return caches.match('/images/offline-placeholder.svg');
    }
    
    // API: Retourner erreur JSON
    if (isApiRequest(url)) {
        return new Response(
            JSON.stringify({ 
                error: 'Mode hors ligne',
                offline: true,
                message: 'Les données seront synchronisées lors de la reconnexion'
            }),
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
    
    return new Response('Contenu non disponible hors ligne', { status: 503 });
}

/**
 * Vérifications d'URL
 */
function shouldExclude(url) {
    return EXCLUDED_URLS.some(excluded => url.href.includes(excluded));
}

function isApiRequest(url) {
    return url.pathname.startsWith('/api/') || 
           url.hostname.includes('supabase.co');
}

function isStaticAsset(url) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.woff', '.woff2'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Gestion des notifications Push
 */
self.addEventListener('push', (event) => {
    console.log('[SW] Notification Push reçue');
    
    let data = {
        title: 'Navette Express',
        body: 'Nouvelle notification',
        icon: '/images/icons/icon-192x192.png',
        badge: '/images/icons/badge-72x72.png',
        tag: 'nx-notification',
        requireInteraction: false
    };
    
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        requireInteraction: data.requireInteraction,
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/dashboard.html',
            timestamp: Date.now()
        },
        actions: data.actions || [
            { action: 'view', title: 'Voir' },
            { action: 'dismiss', title: 'Ignorer' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

/**
 * Clic sur une notification
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Clic sur notification:', event.action);
    
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
    const urlToOpen = event.notification.data?.url || '/dashboard.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Chercher une fenêtre existante
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Ouvrir nouvelle fenêtre
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

/**
 * Synchronisation en arrière-plan
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Sync event:', event.tag);
    
    if (event.tag === 'sync-reservations') {
        event.waitUntil(syncReservations());
    } else if (event.tag === 'sync-dispatch') {
        event.waitUntil(syncDispatch());
    }
});

/**
 * Synchroniser les réservations en attente
 */
async function syncReservations() {
    try {
        const pendingReservations = await getFromIndexedDB('pending-reservations');
        
        for (const reservation of pendingReservations) {
            await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reservation)
            });
            await removeFromIndexedDB('pending-reservations', reservation.id);
        }
        
        console.log('[SW] Réservations synchronisées');
    } catch (error) {
        console.error('[SW] Erreur sync réservations:', error);
    }
}

/**
 * Synchroniser les modifications dispatch
 */
async function syncDispatch() {
    try {
        const pendingChanges = await getFromIndexedDB('pending-dispatch');
        
        for (const change of pendingChanges) {
            await fetch('/api/dispatch', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(change)
            });
            await removeFromIndexedDB('pending-dispatch', change.id);
        }
        
        console.log('[SW] Dispatch synchronisé');
    } catch (error) {
        console.error('[SW] Erreur sync dispatch:', error);
    }
}

/**
 * Helpers IndexedDB (simplifiés)
 */
async function getFromIndexedDB(storeName) {
    // Implémentation simplifiée - à étendre selon besoins
    return [];
}

async function removeFromIndexedDB(storeName, id) {
    // Implémentation simplifiée - à étendre selon besoins
    return true;
}

/**
 * Message depuis le client
 */
self.addEventListener('message', (event) => {
    console.log('[SW] Message reçu:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((names) => {
                return Promise.all(names.map(name => caches.delete(name)));
            })
        );
    }
    
    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('[SW] Service Worker Navette Express chargé');

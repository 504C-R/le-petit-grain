// Service worker : le jeu marche hors ligne après une première visite.
// Stratégie « réseau d'abord » : on prend toujours la version en ligne si possible, le cache sert de secours.
const CACHE = 'petit-grain-gestion-v4';   // cache à part de la version idle
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', ev => ev.waitUntil(self.clients.claim()));
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const utile = url.origin === location.origin;   // tout est embarqué : rien à mettre en cache ailleurs
  if (!utile) return;
  ev.respondWith(
    fetch(req)
      .then(rep => { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); return rep; })
      .catch(() => caches.match(req))
  );
});

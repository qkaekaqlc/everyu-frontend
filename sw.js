const CACHE_NAME = 'everyu-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// 설치 - 정적 파일 캐싱
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 활성화 - 이전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 처리
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API 요청은 캐싱 안 함 (항상 네트워크)
  if (url.hostname.includes('onrender.com') || url.hostname.includes('supabase.co')) {
    return;
  }

  // GET 요청만 캐싱
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // 네트워크 우선, 실패 시 캐시
      return fetch(e.request)
        .then(res => {
          // 성공 시 캐시 업데이트
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached || new Response('오프라인 상태예요.', { status: 503 }));
    })
  );
});

// 푸시 알림
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || '에브리유니', {
      body: data.body || '새로운 알림이 있어요.',
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      tag: data.tag || 'everyu-notif',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

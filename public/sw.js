// 띠링 서비스 워커
// - 페이지(HTML): 네트워크 우선 → 실패 시 캐시 (오프라인에서도 열림)
// - JS·CSS·이미지·폰트: 캐시 우선 + 백그라운드 갱신
// 배포할 때마다 VERSION을 올리면 이전 캐시가 정리됩니다.
const VERSION = 'ttiring-v7';
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/icons/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname);
  if (!sameOrigin && !isFont) return;

  // 페이지 이동: 네트워크 우선
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // 정적 파일·폰트: 캐시 우선, 뒤에서 갱신
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// ── 알림 ─────────────────────────────────────────────────────
// 앱이 설정한 알림 시각을 보관해 두었다가, 주기적 동기화가 깨울 때 알림을 띄웁니다.
let notifyConfig = { on: false, hour: 8, minute: 0 };
let lastNotified = '';

self.addEventListener('message', (event) => {
  if (event.data?.type === 'notify-config') notifyConfig = event.data.config;
});

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

async function maybeNotify() {
  if (!notifyConfig.on) return;
  const now = new Date();
  const due = new Date();
  due.setHours(notifyConfig.hour, notifyConfig.minute, 0, 0);
  if (now < due) return;
  if (lastNotified === todayKey()) return;
  lastNotified = todayKey();
  await self.registration.showNotification('띠링! 오늘의 운세가 도착했어요', {
    body: '내 띠 캐릭터가 오늘 점수를 기다리고 있어요.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'ttiring-daily',
    data: { url: '/' },
  });
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'ttiring-daily') event.waitUntil(maybeNotify());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = list.find((c) => c.url.includes(self.location.origin));
    if (open) return open.focus();
    return self.clients.openWindow('/');
  })());
});

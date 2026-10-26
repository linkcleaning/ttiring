// 띠링 서비스 워커
// - 페이지(HTML): 네트워크 우선 → 실패 시 캐시 (오프라인에서도 열림)
// - JS·CSS·이미지·폰트: 캐시 우선 + 백그라운드 갱신
// 배포할 때마다 VERSION을 올리면 이전 캐시가 정리됩니다.
const VERSION = 'ttiring-v9';
const NOTIFY_CACHE = 'ttiring-notify'; // 버전을 올려도 지우지 않는 알림 설정 보관함
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/icons/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== NOTIFY_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  // 글꼴과 관상 분석기(MediaPipe wasm·모델)는 한 번 받아 두고 캐시해요
  const isFont = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'storage.googleapis.com'].includes(url.hostname);
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
// 서비스 워커는 할 일이 없으면 브라우저가 수시로 꺼 버립니다. 그래서 알림 설정을
// 변수에 두면 다시 깨어났을 때 사라져 알림이 울리지 않습니다. 캐시에 적어 둡니다.
const NOTIFY_KEY = '/__ttiring-notify__';
const NOTIFY_DEFAULT = { on: false, hour: 8, minute: 0, last: '' };

async function readNotify() {
  try {
    const c = await caches.open(NOTIFY_CACHE);
    const res = await c.match(NOTIFY_KEY);
    return res ? { ...NOTIFY_DEFAULT, ...(await res.json()) } : { ...NOTIFY_DEFAULT };
  } catch {
    return { ...NOTIFY_DEFAULT };
  }
}

async function writeNotify(v) {
  try {
    const c = await caches.open(NOTIFY_CACHE);
    await c.put(NOTIFY_KEY, new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json' } }));
  } catch { /* 저장 불가 */ }
}

self.addEventListener('message', (event) => {
  const d = event.data;
  if (d?.type !== 'notify-config') return;
  event.waitUntil((async () => {
    const cur = await readNotify();
    await writeNotify({ ...cur, ...d.config });
  })());
});

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

async function maybeNotify() {
  const cfg = await readNotify();
  if (!cfg.on) return;
  const now = new Date();
  const due = new Date();
  due.setHours(cfg.hour, cfg.minute, 0, 0);
  if (now < due) return;
  const key = todayKey();
  if (cfg.last === key) return; // 앱에서 이미 띄웠거나 오늘 보낸 적 있으면 건너뜀
  await writeNotify({ ...cfg, last: key });
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

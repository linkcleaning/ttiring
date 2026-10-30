// ─────────────────────────────────────────────────────────────
//  매일 아침 알림
//
//  휴대폰은 앱이 꺼져 있을 때 스스로 알림을 띄울 수 없어요. 특히 아이폰은
//  홈 화면에 추가한 PWA에서 "서버가 보내는 푸시"로만 알림을 받습니다.
//  그래서 알림을 켜면 구독 정보를 서버에 올려 두고, 서버가 그 시각에 보내 줘요.
//
//  푸시가 안 되는 환경(서버 미설정, 브라우저 탭 등)에서는 앱을 열었을 때
//  "오늘 알림을 아직 못 봤으면 그때 띄우기"로 물러섭니다.
// ─────────────────────────────────────────────────────────────
const KEY = 'ttiring.notify';
const LAST = 'ttiring.notify.last';

const read = (k, fb) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 */ }
};

export const DEFAULT_NOTIFY = { on: false, hour: 8, minute: 0 };
export const loadNotify = () => ({ ...DEFAULT_NOTIFY, ...read(KEY, {}) });
export const saveNotify = (v) => write(KEY, v);

export const notifySupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export const notifyPermission = () => (notifySupported() ? Notification.permission : 'unsupported');

/** 홈 화면에 추가해서 실행 중인지 (아이폰은 이때만 알림을 받을 수 있어요) */
export const isStandalone = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch { return false; }
};
export const isIOS = () => {
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  } catch { return false; }
};

/** 아이폰인데 홈 화면 앱이 아니면 알림 자체가 막혀 있어요 */
export const notifyBlockedReason = () => {
  if (!notifySupported()) return isIOS() && !isStandalone() ? 'ios-not-installed' : 'unsupported';
  if (isIOS() && !isStandalone()) return 'ios-not-installed';
  return null;
};

export async function askPermission() {
  if (!notifySupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

// ── 서버 푸시 ───────────────────────────────────────────────
const urlB64ToUint8 = (s) => {
  const pad = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** 서버가 푸시를 보낼 준비가 됐는지 */
export async function pushReady() {
  try {
    const res = await fetch('/api/push/key', { cache: 'no-store' });
    if (!res.ok) return { ready: false, key: null };
    const d = await res.json();
    return { ready: !!d.ready, key: d.key || null };
  } catch {
    return { ready: false, key: null };
  }
}

/**
 * 알림 켜기: 권한 → 푸시 구독 → 서버에 시각 등록
 * @returns 'push' 서버 푸시로 받음 | 'local' 앱 열 때만 | 'denied' | 'unsupported'
 */
export async function enableNotify(cfg) {
  if (!notifySupported()) return 'unsupported';
  if (notifyPermission() !== 'granted') {
    const p = await askPermission();
    if (p !== 'granted') return 'denied';
  }
  const { ready, key } = await pushReady();
  if (!ready || !key) { syncConfigToSW(); return 'local'; }
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) { syncConfigToSW(); return 'local'; }
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(key) });
    }
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        hour: cfg.hour,
        minute: cfg.minute,
        tzOffset: -new Date().getTimezoneOffset(), // 한국이면 +540
      }),
    });
    if (!res.ok) { syncConfigToSW(); return 'local'; }
    write('ttiring.push.endpoint', sub.endpoint);
    write('ttiring.push.tz', -new Date().getTimezoneOffset());
    syncConfigToSW();
    return 'push';
  } catch {
    syncConfigToSW();
    return 'local';
  }
}

/** 알림 끄기: 서버에서 구독 지우기 */
export async function disableNotify() {
  const endpoint = read('ttiring.push.endpoint', null);
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) await sub.unsubscribe().catch(() => {});
    if (endpoint) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
  } catch { /* 무시 */ }
  write('ttiring.push.endpoint', null);
  write('ttiring.push.tz', null);
  syncConfigToSW();
}

/** 알림 보내기 (서비스 워커를 통해야 안드로이드에서 안정적으로 떠요) */
export async function showNotification(body) {
  if (notifyPermission() !== 'granted') return false;
  const opts = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'ttiring-daily',
    data: { url: '/' },
  };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.showNotification('띠링! 오늘의 운세가 도착했어요', opts);
      return true;
    }
    new Notification('띠링! 오늘의 운세가 도착했어요', opts);
    return true;
  } catch {
    return false;
  }
}

/** 푸시가 못 가는 환경을 위한 보조: 앱을 열었을 때 오늘 못 봤으면 그때 띄움 */
export async function catchUp(body = '내 띠 캐릭터가 오늘 점수를 기다리고 있어요.') {
  const cfg = loadNotify();
  if (!cfg.on || notifyPermission() !== 'granted') return false;
  const now = new Date();
  const due = new Date();
  due.setHours(cfg.hour, cfg.minute, 0, 0);
  if (now < due) return false;
  if (read(LAST, '') === todayKey()) return false;
  const ok = await showNotification(body);
  if (ok) {
    write(LAST, todayKey());
    syncConfigToSW();
  }
  return ok;
}

/**
 * 앱을 열 때 서버 등록을 손봐요. 서머타임처럼 시차가 바뀌면 알림이 한 시간
 * 밀리는데, 바뀐 걸 발견했을 때만 다시 올려서 맞춥니다.
 */
export async function refreshSubscription() {
  const cfg = loadNotify();
  if (!cfg.on || notifyPermission() !== 'granted') return false;
  const tz = -new Date().getTimezoneOffset();
  const saved = read('ttiring.push.tz', null);
  const endpoint = read('ttiring.push.endpoint', null);
  if (!endpoint) return false;
  if (saved === tz) return false;
  const r = await enableNotify({ hour: cfg.hour, minute: cfg.minute });
  if (r === 'push') write('ttiring.push.tz', tz);
  return r === 'push';
}

/** 서비스 워커가 알림 시각과 "오늘 보낸 날"을 알 수 있게 전달 */
export async function syncConfigToSW() {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (!(await navigator.serviceWorker.getRegistration())) return;
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active || navigator.serviceWorker.controller;
    sw?.postMessage({ type: 'notify-config', config: { ...loadNotify(), last: read(LAST, '') } });
  } catch { /* 무시 */ }
}

/** 안드로이드 설치형에서 하루 한 번 깨워 주는 주기적 동기화 (지원 안 하면 조용히 넘어감) */
export async function registerPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !('periodicSync' in reg)) return false;
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state !== 'granted') return false;
    await reg.periodicSync.register('ttiring-daily', { minInterval: 12 * 60 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}

export const markNotifiedToday = () => write(LAST, todayKey());

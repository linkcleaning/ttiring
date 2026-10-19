// 매일 아침 알림
// PWA는 앱이 꺼진 상태에서 정확한 시각에 알림을 울리는 방법이 제한적이라,
// 1) 주기적 백그라운드 동기화(안드로이드 설치형에서 지원)와
// 2) 앱을 열었을 때 그날 알림을 아직 못 봤으면 바로 띄우는 방식을 함께 씁니다.
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

/** 알림 권한 요청. 'granted' | 'denied' | 'unsupported' */
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

/** 알림 보내기 (서비스 워커를 통해야 안드로이드에서 안정적으로 뜸) */
export async function showNotification(body) {
  if (notifyPermission() !== 'granted') return false;
  const opts = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'ttiring-daily',
    renotify: false,
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

/** 설정한 시각이 지났고 오늘 아직 안 보냈으면 알림을 띄움 */
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
    syncConfigToSW(); // 서비스 워커가 같은 날 또 띄우지 않도록 알려 줌
  }
  return ok;
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

/** 서비스 워커가 알림 시각과 "오늘 보낸 날"을 알 수 있게 전달 */
export async function syncConfigToSW() {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (!(await navigator.serviceWorker.getRegistration())) return; // 아직 등록 전(개발 모드 등)
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active || navigator.serviceWorker.controller;
    sw?.postMessage({ type: 'notify-config', config: { ...loadNotify(), last: read(LAST, '') } });
  } catch { /* 무시 */ }
}

export const markNotifiedToday = () => write(LAST, todayKey());

// ─────────────────────────────────────────────────────────────
//  아이폰/안드로이드 앱 안에서 돌 때만 쓰는 다리
//
//  앱 안(WKWebView)에서는 웹 푸시(서비스 워커 푸시)가 동작하지 않아요.
//  그래서 앱 안에서는 알림을 휴대폰 자체 알림(로컬 알림)으로 넘깁니다.
//  · Capacitor 앱(스토어 출시용): @capacitor/local-notifications 로 직접 예약
//  · Expo 래퍼(예전 방식): ReactNativeWebView 메시지로 부탁
//  브라우저에서 열었을 때는 이 파일이 하는 일이 없고, 기존 웹 푸시를 그대로 씁니다.
// ─────────────────────────────────────────────────────────────
import { Capacitor } from '@capacitor/core';

/** 앱 안에서 공유할 때 붙이는 주소 (앱 안 주소는 capacitor://localhost 라서 남이 못 열어요) */
export const PUBLIC_URL = 'https://ttiring.han0829.workers.dev';
export const shareUrl = () => (isCapacitor() ? PUBLIC_URL : location.origin);

export const isCapacitor = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};
const isExpo = () => typeof window !== 'undefined'
  && typeof window.ReactNativeWebView?.postMessage === 'function';

/** 앱(껍데기) 안에서 실행 중인가 */
export const inNativeApp = () => isCapacitor() || isExpo();

function send(type, payload = {}) {
  if (!isExpo()) return false;
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
    return true;
  } catch { return false; }
}

/** 앱 쪽 답을 웹 화면에 알려 줘요 (Expo 래퍼와 같은 모양) */
const reply = (msg) => { try { window.__ttiringNative?.(msg); } catch { /* 무시 */ } };

// ── Capacitor 로컬 알림 ─────────────────────────────────────
const DAYS_AHEAD = 14; // 앞으로 2주치를 미리 예약하고, 앱을 열 때마다 다시 채워요
const BASE_ID = 7000;

/** 날마다 바뀌는 알림 문구 (내 사주 × 그날 일진 총운) */
async function dailyLines(days) {
  let me = null;
  try {
    const list = JSON.parse(localStorage.getItem('ttiring.people.v1') || '[]');
    me = list.find((p) => p.id === 'me') || list[0] || null;
  } catch { me = null; }
  if (!me) return days.map(() => '내 띠 캐릭터가 오늘의 운세를 들고 기다리고 있어요.');
  const { computeFortune } = await import('./saju.js');
  const { gradeOf } = await import('./fortune.js');
  return days.map((d) => {
    try {
      const r = computeFortune(me, d);
      const t = r.scores.total;
      const g = gradeOf(t);
      const gl = typeof g === 'string' ? g : (g?.label || g?.name || '');
      const hint = t >= 70 ? '기운이 좋은 날이에요. 미뤄 둔 일을 꺼내 보세요!'
        : t >= 48 ? '무난한 하루예요. 오늘 피할 것 하나만 확인하고 가요.'
          : '쉬어 가는 날이에요. 조심할 것부터 살짝 보고 가요.';
      return `오늘 총운 ${t}점${gl ? ` · ${gl}` : ''}. ${hint}`;
    } catch {
      return '내 띠 캐릭터가 오늘의 운세를 들고 기다리고 있어요.';
    }
  });
}

async function capSchedule(hour, minute) {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return false;
  await capCancel();
  const now = new Date();
  const days = [];
  for (let i = 0; i <= DAYS_AHEAD; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute, 0, 0);
    if (d > now) days.push(d);
  }
  const lines = await dailyLines(days);
  await LocalNotifications.schedule({
    notifications: days.map((at, i) => ({
      id: BASE_ID + i,
      title: '띠링! 오늘의 운세가 도착했어요',
      body: lines[i],
      schedule: { at },
    })),
  });
  return true;
}

async function capCancel() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { notifications } = await LocalNotifications.getPending();
    const mine = notifications.filter((n) => n.id >= BASE_ID && n.id < BASE_ID + 100);
    if (mine.length) await LocalNotifications.cancel({ notifications: mine.map((n) => ({ id: n.id })) });
  } catch { /* 무시 */ }
}

/** 껍데기 앱에 "매일 이 시각에 알림 걸어 줘"라고 부탁 */
export const nativeEnableNotify = (hour, minute) => {
  if (isCapacitor()) {
    capSchedule(hour, minute)
      .then((ok) => reply({ type: 'notify:result', ok }))
      .catch(() => reply({ type: 'notify:result', ok: false }));
    return true;
  }
  return send('notify:enable', { hour, minute });
};

/** 껍데기 앱에 "알림 꺼 줘" */
export const nativeDisableNotify = () => {
  if (isCapacitor()) {
    capCancel().then(() => reply({ type: 'notify:result', off: true }));
    return true;
  }
  return send('notify:disable');
};

/** 껍데기 앱에 알림 권한을 물어봐 달라고 부탁 */
export const nativeAskPermission = () => {
  if (isCapacitor()) {
    import('@capacitor/local-notifications')
      .then(({ LocalNotifications }) => LocalNotifications.requestPermissions())
      .then((p) => reply({ type: 'notify:permission', ok: p.display === 'granted' }))
      .catch(() => reply({ type: 'notify:permission', ok: false }));
    return true;
  }
  return send('notify:permission');
};

/** 앱을 열 때마다 앞으로 2주치 알림을 다시 채워요 (문구도 그날 운세로 새로) */
export async function nativeRefreshNotify(cfg) {
  if (!isCapacitor() || !cfg?.on) return;
  try { await capSchedule(cfg.hour, cfg.minute); } catch { /* 무시 */ }
}

/** 운세 카드 이미지를 앱 공유 창으로 (사진 저장·카톡 보내기 모두 여기서) */
export async function nativeShareImage(blob, fileName, text) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const data = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1]);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
  const saved = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
  await Share.share({ title: '띠링', text, files: [saved.uri] });
}

/** 글 공유 (앱 안) */
export async function nativeShareText(text) {
  const { Share } = await import('@capacitor/share');
  await Share.share({ title: '띠링', text, url: PUBLIC_URL });
}

/**
 * 껍데기 앱이 보내 주는 답을 받습니다.
 * 앱은 window.__ttiringNative(msg) 를 호출해요.
 * @param handler ({type, ok, reason}) => void
 * @returns 구독 해지 함수
 */
export function onNativeMessage(handler) {
  if (typeof window === 'undefined') return () => {};
  const list = window.__ttiringNativeHandlers || (window.__ttiringNativeHandlers = []);
  list.push(handler);
  if (!window.__ttiringNative) {
    window.__ttiringNative = (raw) => {
      let msg = raw;
      if (typeof raw === 'string') { try { msg = JSON.parse(raw); } catch { msg = { type: raw }; } }
      (window.__ttiringNativeHandlers || []).forEach((h) => { try { h(msg); } catch { /* 무시 */ } });
    };
  }
  return () => {
    const i = list.indexOf(handler);
    if (i >= 0) list.splice(i, 1);
  };
}

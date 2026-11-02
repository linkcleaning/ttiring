// ─────────────────────────────────────────────────────────────
//  아이폰/안드로이드 앱(Expo 래퍼) 안에서 돌 때만 쓰는 다리
//
//  앱 안(WKWebView)에서는 웹 푸시(서비스 워커 푸시)가 동작하지 않아요.
//  그래서 앱 안에서는 알림을 껍데기 앱 쪽 '네이티브 알림'으로 넘깁니다.
//  브라우저에서 열었을 때는 이 파일이 하는 일이 없고, 기존 웹 푸시를 그대로 씁니다.
// ─────────────────────────────────────────────────────────────

/** Expo 래퍼 안에서 실행 중인가 */
export const inNativeApp = () => typeof window !== 'undefined'
  && typeof window.ReactNativeWebView?.postMessage === 'function';

function send(type, payload = {}) {
  if (!inNativeApp()) return false;
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
    return true;
  } catch { return false; }
}

/** 껍데기 앱에 "매일 이 시각에 알림 걸어 줘"라고 부탁 */
export const nativeEnableNotify = (hour, minute) => send('notify:enable', { hour, minute });

/** 껍데기 앱에 "알림 꺼 줘" */
export const nativeDisableNotify = () => send('notify:disable');

/** 껍데기 앱에 알림 권한을 물어봐 달라고 부탁 */
export const nativeAskPermission = () => send('notify:permission');

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

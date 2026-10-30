// ─────────────────────────────────────────────────────────────
//  띠링 서버 (Cloudflare Worker)
//
//  하는 일은 둘뿐이에요.
//  1) 알림 구독 받아 두기 (KV에 저장)
//  2) 15분마다 깨어나 "지금이 그 사람의 알림 시각"인 구독에 푸시 보내기
//
//  아이폰은 홈 화면에 추가한 PWA에서 서버 푸시로만 알림을 받을 수 있어서,
//  앱 혼자서는 정해진 시각에 알림을 띄울 방법이 없어요.
//
//  설정(KV·비밀값)이 아직 없어도 홈페이지는 그대로 열리도록 만들었어요.
// ─────────────────────────────────────────────────────────────
import { sendPush } from './push.js';

const PREFIX = 'sub:';
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const ready = (env) => !!(env.SUBS && env.VAPID_PRIVATE_KEY && env.VAPID_PUBLIC_KEY);

/** 구독 하나를 KV 키로 (엔드포인트가 길어서 해시로 줄여요) */
async function keyOf(endpoint) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return PREFIX + [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const todayIn = (offsetMin) => {
  const d = new Date(Date.now() + offsetMin * 60000);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
};
const minutesIn = (offsetMin) => {
  const d = new Date(Date.now() + offsetMin * 60000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/push/key') {
      return json({ key: env.VAPID_PUBLIC_KEY || null, ready: ready(env) });
    }

    if (url.pathname === '/api/push/subscribe' && request.method === 'POST') {
      if (!ready(env)) return json({ ok: false, error: 'not-configured' }, 503);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
      const { endpoint, hour, minute, tzOffset } = body || {};
      if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) return json({ ok: false, error: 'bad-endpoint' }, 400);
      const rec = {
        endpoint,
        hour: Math.min(23, Math.max(0, Number(hour) || 0)),
        minute: Math.min(59, Math.max(0, Number(minute) || 0)),
        // 분 단위 오프셋. getTimezoneOffset()은 부호가 반대라 클라이언트에서 뒤집어 보내요
        tzOffset: Math.min(840, Math.max(-840, Number(tzOffset) || 540)),
        at: Date.now(),
      };
      await env.SUBS.put(await keyOf(endpoint), JSON.stringify(rec));
      return json({ ok: true });
    }

    if (url.pathname === '/api/push/unsubscribe' && request.method === 'POST') {
      if (!env.SUBS) return json({ ok: true }); // 저장소가 없으면 지울 것도 없어요
      let body;
      try { body = await request.json(); } catch { return json({ ok: false }, 400); }
      if (typeof body?.endpoint === 'string') await env.SUBS.delete(await keyOf(body.endpoint));
      return json({ ok: true });
    }

    // 그 밖의 요청은 정적 파일로
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },

  /** 15분마다 깨어나서, 지금이 알림 시각인 사람에게만 보내요 */
  async scheduled(event, env, ctx) {
    if (!ready(env)) return;
    const WINDOW = 15; // 분
    let cursor;
    do {
      const list = await env.SUBS.list({ prefix: PREFIX, cursor, limit: 1000 });
      cursor = list.list_complete ? null : list.cursor;
      for (const { name } of list.keys) {
        const raw = await env.SUBS.get(name);
        if (!raw) continue;
        let rec;
        try { rec = JSON.parse(raw); } catch { await env.SUBS.delete(name); continue; }

        const nowMin = minutesIn(rec.tzOffset);
        const dueMin = rec.hour * 60 + rec.minute;
        const diff = nowMin - dueMin;
        // 알림 시각이 지난 지 15분 안쪽일 때만 (자정을 넘긴 경우도 감안)
        const due = (diff >= 0 && diff < WINDOW) || (diff < 0 && diff + 1440 < WINDOW);
        if (!due) continue;

        const today = todayIn(rec.tzOffset);
        if (rec.sent === today) continue; // 오늘 이미 보냈어요

        const r = await sendPush(rec.endpoint, env);
        if (r.gone) {
          await env.SUBS.delete(name);
        } else if (r.ok) {
          await env.SUBS.put(name, JSON.stringify({ ...rec, sent: today }));
        }
      }
    } while (cursor);
  },
};

// ─────────────────────────────────────────────────────────────
//  Web Push 보내기 (VAPID, 본문 없는 알림)
//
//  본문을 실어 보내려면 수신자 공개키로 암호화해야 해서 복잡한데,
//  우리는 "깨워 주기"만 하면 되므로 본문 없이 보냅니다.
//  서비스 워커가 push 이벤트를 받아 알림 문구를 직접 만들어 띄워요.
// ─────────────────────────────────────────────────────────────

const enc = new TextEncoder();

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (s) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '==='.slice((pad.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** P-256 키쌍 새로 만들기 → { publicKey(b64url raw), d(b64url) } */
export async function generateKeys() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = await crypto.subtle.exportKey('raw', kp.publicKey);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return { publicKey: b64url(raw), d: jwk.d };
}

/** VAPID 개인키(base64url 원시 d값) → 서명용 CryptoKey */
async function importPrivateKey(d, publicKey) {
  const pub = fromB64url(publicKey);          // 0x04 || X(32) || Y(32)
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d,
    x: b64url(pub.slice(1, 33)),
    y: b64url(pub.slice(33, 65)),
    ext: true,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/** VAPID JWT 만들기 */
async function vapidJwt(audience, subject, privateKey, publicKey) {
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(enc.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 11 * 3600, // 12시간 미만이어야 해요
    sub: subject,
  })));
  const key = await importPrivateKey(privateKey, publicKey);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(sig)}`;
}

/**
 * 구독 하나에 푸시 보내기
 * @param keys { publicKey, d } VAPID 키쌍
 * @returns {Promise<{ok:boolean, status:number, gone:boolean}>}
 *          gone=true면 구독이 못 쓰게 된 것이니 지워야 해요 (403/404/410)
 */
export async function sendPush(endpoint, keys, subject, { ttl = 43200, urgency = 'normal' } = {}) {
  let aud;
  try {
    aud = new URL(endpoint).origin;
  } catch {
    return { ok: false, status: 0, gone: true };
  }
  const jwt = await vapidJwt(aud, subject || 'mailto:admin@example.com', keys.d, keys.publicKey);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: String(ttl),
      Urgency: urgency,
      'Content-Length': '0',
      Authorization: `vapid t=${jwt}, k=${keys.publicKey}`,
    },
  });
  // 403은 키가 바뀌어 구독과 안 맞는 경우예요. 지우면 앱이 다시 등록해요.
  return { ok: res.ok, status: res.status, gone: [403, 404, 410].includes(res.status) };
}

export { b64url, fromB64url, vapidJwt };

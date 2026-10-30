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
 * @returns {Promise<{ok:boolean, status:number, gone:boolean}>}
 *          gone=true면 구독이 사라진 것이니 지워야 해요 (404/410)
 */
export async function sendPush(endpoint, env, { ttl = 43200, urgency = 'normal' } = {}) {
  let aud;
  try {
    aud = new URL(endpoint).origin;
  } catch {
    return { ok: false, status: 0, gone: true };
  }
  const jwt = await vapidJwt(aud, env.VAPID_SUBJECT || 'mailto:admin@example.com', env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: String(ttl),
      Urgency: urgency,
      'Content-Length': '0',
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
    },
  });
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}

export { b64url, fromB64url, vapidJwt };

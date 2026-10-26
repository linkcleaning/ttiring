// 관상 기록 저장소 — 사람마다 따로 보관해요.
// 사진은 저장하지 않고, 사진에서 잰 수치(measures)와 표시용 좌표(markers)만 남겨요.
const PREFIX = 'ttiring.face.';
const KEY = (id) => `${PREFIX}${id}`;

export function loadFace(id) {
  try {
    const v = localStorage.getItem(KEY(id));
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

export function saveFace(id, v) {
  try { localStorage.setItem(KEY(id), JSON.stringify(v)); } catch { /* 저장 불가 */ }
}

export function clearFace(id) {
  try { localStorage.removeItem(KEY(id)); } catch { /* 무시 */ }
}

/** 저장된 관상이 있는 사람 수 */
export function countFaces() {
  try {
    let n = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      if (localStorage.key(i)?.startsWith(PREFIX)) n += 1;
    }
    return n;
  } catch { return 0; }
}

/** 모든 사람의 관상 기록 지우기 */
export function clearAllFaces() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    return keys.length;
  } catch { return 0; }
}

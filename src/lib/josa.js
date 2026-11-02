// ─────────────────────────────────────────────────────────────
//  조사 붙이기 — 앞말의 받침 유무에 따라 골라 줍니다.
//  오행 이름(목/화/토/금/수)이나 부위 이름처럼 값이 바뀌는 자리에 쓰세요.
//  괄호가 붙은 표기(예: '화(火)')는 읽는 글자로 판정해야 해서,
//  괄호·공백·한자를 걷어낸 마지막 한글 글자를 기준으로 봅니다.
// ─────────────────────────────────────────────────────────────

/** 판정에 쓸 마지막 한글 글자 (없으면 null) */
function lastHangul(word) {
  const s = String(word ?? '');
  for (let i = s.length - 1; i >= 0; i -= 1) {
    const ch = s[i];
    if (ch >= '가' && ch <= '힣') return ch;
  }
  return null;
}

/** 받침이 있으면 true. 한글이 아니면 null (조사를 고를 수 없음) */
export function hasJong(word) {
  const ch = lastHangul(word);
  if (ch === null) return null;
  return (ch.charCodeAt(0) - 0xac00) % 28 !== 0;
}

/**
 * 받침 유무로 조사를 고릅니다.
 * 한글이 아니면 '은/는'처럼 둘 다 적는 대신 받침 있는 쪽을 씁니다.
 */
export function josa(word, withJong, noJong) {
  const j = hasJong(word);
  return j === null ? withJong : (j ? withJong : noJong);
}

const make = (a, b) => (w) => `${w}${josa(w, a, b)}`;

export const eun = make('은', '는');     // 목은 / 화는
export const i = make('이', '가');        // 목이 / 화가
export const eul = make('을', '를');      // 목을 / 화를
export const gwa = make('과', '와');      // 목과 / 화와
export const euro = make('으로', '로');   // 목으로 / 화로
export const ira = make('이라', '라');    // 목이라 / 화라
export const yeyo = make('이에요', '예요'); // 목이에요 / 화예요

/** 'a/b' 한 덩이로 넘기는 형태 (예: josaPair('목', '은/는') → '목은') */
export const josaPair = (word, pair) => {
  const [a, b] = String(pair).split('/');
  return `${word}${josa(word, a, b)}`;
};

/** 'ㄹ' 받침은 '로'를 쓰는 예외까지 보는 버전 (예: 서울로) */
export const euroStrict = (w) => {
  const ch = lastHangul(w);
  if (ch === null) return `${w}으로`;
  const jong = (ch.charCodeAt(0) - 0xac00) % 28;
  return `${w}${jong === 0 || jong === 8 ? '로' : '으로'}`;
};

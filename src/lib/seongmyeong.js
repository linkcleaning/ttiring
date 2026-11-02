// ─────────────────────────────────────────────────────────────
//  성명학 — 한글 이름 풀이
//
//  한글만으로 정확히 볼 수 있는 것을 중심에 뒀어요.
//   · 발음오행(음령오행): 글자의 첫소리 자음을 오행으로 보고, 이어지는
//     흐름이 상생인지 상극인지 봅니다. (木→火→土→金→水→木)
//   · 음양: 한글 자모 획수의 홀짝 배열
//   · 사주 교차: 사주에 모자란 기운을 이름이 채워 주는지
//  한자 획수가 있어야 하는 원형이정 4격은 획수를 직접 넣을 때만 계산해요.
//
//  ※ ㅇ·ㅎ을 토(土)로 보는 쪽과 금(金)으로 보는 쪽이 갈립니다.
//    여기서는 훈민정음 발음 위치를 따라 목구멍소리를 토(土)로 봤어요.
// ─────────────────────────────────────────────────────────────
import { elementCount } from './saju.js';

export const EL_KO = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
const EL1 = ['목', '화', '토', '금', '수'];
export const EL_COLOR = ['#3f9a6a', '#d2553e', '#d5a63a', '#8d8f98', '#2f3a52'];

// 초성 19개 (유니코드 순서)
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/** 첫소리 자음 → 오행 (훈민정음 발음 위치) */
const CHO_EL = {
  ㄱ: 0, ㄲ: 0, ㅋ: 0,                 // 어금닛소리 木
  ㄴ: 1, ㄷ: 1, ㄸ: 1, ㄹ: 1, ㅌ: 1,   // 혓소리 火
  ㅇ: 2, ㅎ: 2,                        // 목구멍소리 土
  ㅅ: 3, ㅆ: 3, ㅈ: 3, ㅉ: 3, ㅊ: 3,   // 잇소리 金
  ㅁ: 4, ㅂ: 4, ㅃ: 4, ㅍ: 4,          // 입술소리 水
};
export const EL_SOUND = [
  { el: 0, name: '어금닛소리', letters: 'ㄱ ㅋ ㄲ' },
  { el: 1, name: '혓소리', letters: 'ㄴ ㄷ ㄹ ㅌ' },
  { el: 2, name: '목구멍소리', letters: 'ㅇ ㅎ' },
  { el: 3, name: '잇소리', letters: 'ㅅ ㅈ ㅊ' },
  { el: 4, name: '입술소리', letters: 'ㅁ ㅂ ㅍ' },
];

/** 한글 자모 획수 (성명학에서 흔히 쓰는 표. 유파마다 조금씩 달라요) */
const STROKE = {
  ㄱ: 1, ㄴ: 1, ㄷ: 2, ㄹ: 3, ㅁ: 3, ㅂ: 4, ㅅ: 2, ㅇ: 1, ㅈ: 3, ㅊ: 4, ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 3,
  ㄲ: 2, ㄸ: 4, ㅃ: 8, ㅆ: 4, ㅉ: 6,
  ㄳ: 3, ㄵ: 4, ㄶ: 4, ㄺ: 4, ㄻ: 6, ㄼ: 7, ㄽ: 5, ㄾ: 6, ㄿ: 7, ㅀ: 6, ㅄ: 6,
  ㅏ: 2, ㅑ: 3, ㅓ: 2, ㅕ: 3, ㅗ: 2, ㅛ: 3, ㅜ: 2, ㅠ: 3, ㅡ: 1, ㅣ: 1,
  ㅐ: 3, ㅒ: 4, ㅔ: 3, ㅖ: 4, ㅘ: 4, ㅙ: 5, ㅚ: 3, ㅝ: 4, ㅞ: 5, ㅟ: 3, ㅢ: 2,
};

const isHangul = (ch) => ch >= '가' && ch <= '힣';

/** 한글 한 글자 → { cho, jung, jong } */
export function decompose(ch) {
  if (!isHangul(ch)) return null;
  const n = ch.charCodeAt(0) - 0xac00;
  return { cho: CHO[Math.floor(n / 588)], jung: JUNG[Math.floor((n % 588) / 28)], jong: JONG[n % 28] };
}

/** 글자 하나의 획수 */
export function strokesOf(ch) {
  const d = decompose(ch);
  if (!d) return 0;
  return (STROKE[d.cho] || 0) + (STROKE[d.jung] || 0) + (d.jong ? (STROKE[d.jong] || 0) : 0);
}

/** 이름을 글자별로 뜯어보기 */
export function readLetters(name) {
  return [...(name || '')].filter(isHangul).map((ch) => {
    const d = decompose(ch);
    return { ch, cho: d.cho, el: CHO_EL[d.cho] ?? null, strokes: strokesOf(ch) };
  });
}

// ── 오행 흐름 ───────────────────────────────────────────────
const gen = (a, b) => (a + 1) % 5 === b;   // a가 b를 낳음 (상생)
const ctrl = (a, b) => (a + 2) % 5 === b;  // a가 b를 이김 (상극)

const PAIR_TEXT = {
  상생: (a, b) => `${EL1[a]}생${EL1[b]}(${EL1[a]}生${EL1[b]}) — 앞 소리가 뒤 소리를 밀어 줘요. 말이 매끄럽게 이어지고 기운이 끊기지 않아요.`,
  설기: (a, b) => `${EL1[b]}생${EL1[a]}을 거꾸로 받는 자리예요. 뒤 소리가 앞 소리를 받쳐 주니 나쁘진 않지만, 힘이 뒤로 쏠려요.`,
  상극: (a, b) => `${EL1[a]}극${EL1[b]}(${EL1[a]}剋${EL1[b]}) — 앞 소리가 뒤 소리를 누르는 자리예요. 추진력은 붙지만 이어짐이 한 번 끊겨요.`,
  피극: (a, b) => `${EL1[b]}극${EL1[a]}로 앞 소리가 눌리는 자리예요. 겉보다 속에서 버티는 힘을 쓰게 돼요.`,
  비화: (a) => `같은 ${EL1[a]} 소리가 겹쳤어요. 성향이 또렷해지는 대신 한쪽으로 쏠리기 쉬워요.`,
};

export function pairKind(a, b) {
  if (a === b) return '비화';
  if (gen(a, b)) return '상생';
  if (gen(b, a)) return '설기';
  if (ctrl(a, b)) return '상극';
  return '피극';
}

/** 글자 사이의 흐름 + 전체 판정 */
export function soundFlow(letters) {
  const els = letters.map((l) => l.el).filter((e) => e !== null);
  const pairs = [];
  for (let i = 0; i + 1 < els.length; i += 1) {
    const kind = pairKind(els[i], els[i + 1]);
    pairs.push({
      from: els[i], to: els[i + 1], kind,
      text: kind === '비화' ? PAIR_TEXT.비화(els[i]) : PAIR_TEXT[kind](els[i], els[i + 1]),
    });
  }
  const good = pairs.filter((p) => p.kind === '상생').length;
  const soft = pairs.filter((p) => p.kind === '설기' || p.kind === '비화').length;
  const hard = pairs.filter((p) => p.kind === '상극' || p.kind === '피극').length;
  const score = pairs.length === 0 ? 50
    : Math.round(((good * 1 + soft * 0.55 + hard * 0.15) / pairs.length) * 100);

  let grade;
  if (hard === 0 && good === pairs.length && pairs.length > 0) grade = { label: '상생격', desc: '첫소리가 처음부터 끝까지 서로를 밀어 주는 배열이에요. 성명학에서 가장 좋게 보는 흐름입니다.' };
  else if (hard === 0) grade = { label: '순한 배열', desc: '막히는 자리 없이 무난하게 이어지는 배열이에요. 튀지 않고 오래 가는 이름입니다.' };
  else if (hard < pairs.length) grade = { label: '혼합격', desc: '밀어 주는 자리와 눌리는 자리가 섞였어요. 굴곡이 있는 대신 밋밋하지 않은 이름입니다.' };
  else grade = { label: '상극격', desc: '소리끼리 부딪히는 배열이에요. 옛 책은 꺼렸지만, 부딪히는 힘이 추진력으로 쓰이는 경우도 많습니다.' };

  return { pairs, score, grade, counts: { good, soft, hard } };
}

// ── 음양 ────────────────────────────────────────────────────
export function yinYang(letters) {
  const marks = letters.map((l) => ({ ch: l.ch, strokes: l.strokes, yang: l.strokes % 2 === 1 }));
  const yang = marks.filter((m) => m.yang).length;
  const yin = marks.length - yang;
  const allSame = marks.length > 1 && (yang === 0 || yin === 0);
  const text = allSame
    ? `획수가 모두 ${yang ? '홀수(양)' : '짝수(음)'}로 한쪽에 몰렸어요. 성명학에서는 음양이 섞인 쪽을 좋게 보는데, 한쪽으로 모이면 성향이 뚜렷해지는 대신 완급 조절이 숙제가 돼요.`
    : `양(홀수) ${yang}자, 음(짝수) ${yin}자로 섞였어요. 음양이 갈마드는 배열이라 나아갈 때와 물러설 때의 균형이 잡힌 이름으로 봅니다.`;
  return { marks, yang, yin, balanced: !allSame, text };
}

// ── 원형이정 4격 (한자 획수를 알 때만) ──────────────────────
// 81수리 길흉 분류 — 전통 수리성명학에서 길수로 꼽는 수를 따랐어요.
const SURI_GOOD = new Set([1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 31, 32, 33, 35, 37, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81]);
const SURI_CARE = new Set([2, 4, 9, 10, 12, 14, 19, 20, 22, 26, 28, 34, 36, 40, 44, 46, 54, 56, 60, 62, 64, 66]);
export const suriKind = (n) => {
  const v = ((n - 1) % 81) + 1;
  if (SURI_GOOD.has(v)) return { v, kind: '길', desc: '길하게 보는 수예요.' };
  if (SURI_CARE.has(v)) return { v, kind: '주의', desc: '조심스럽게 보는 수예요.' };
  return { v, kind: '중간', desc: '길흉이 섞인 중간 수예요.' };
};

const GYEOK = [
  { key: '원격', hanja: '元格', life: '초년운', how: '이름 첫 글자 획수' },
  { key: '형격', hanja: '亨格', life: '청장년운', how: '성 + 이름 첫 글자' },
  { key: '이격', hanja: '利格', life: '중년운', how: '이름 글자 획수 합' },
  { key: '정격', hanja: '貞格', life: '말년·총운', how: '성 + 이름 전체' },
];

/**
 * 한자 획수로 4격 계산
 * @param sur 성 획수, given 이름 글자 획수 배열
 */
export function fourGyeok(sur, given) {
  const g = given.filter((n) => Number.isFinite(n) && n > 0);
  if (!Number.isFinite(sur) || sur <= 0 || g.length === 0) return null;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const vals = [g[0], sur + g[0], sum(g), sur + sum(g)];
  return GYEOK.map((meta, i) => ({ ...meta, n: vals[i], ...suriKind(vals[i]) }));
}

// ── 이름 오행이 사주를 어떻게 돕는지 ────────────────────────
const EL_TRAIT = [
  '뻗어 나가고 시작하는 기운이에요. 새 일을 벌이고 사람을 모으는 쪽에 힘이 실려요.',
  '드러내고 표현하는 기운이에요. 밝고 솔직한 인상을 주고, 사람 앞에 서는 자리가 잘 맞아요.',
  '품고 버티는 기운이에요. 중심을 잡아 주고 믿음을 사는 쪽에 힘이 실려요.',
  '맺고 끊는 기운이에요. 판단이 분명하고 마무리가 깔끔한 인상을 줘요.',
  '흐르고 스며드는 기운이에요. 눈치가 빠르고 상황에 맞춰 길을 찾는 쪽이에요.',
];

/**
 * 이름 풀이 만들기
 * @param name 한글 이름 (성 포함)
 * @param ctx  { analysis, pillars } — 없으면 사주 교차는 건너뜀
 * @param opts { surStrokes, givenStrokes[] } 한자 획수 (선택)
 */
export function readName(name, ctx = null, opts = {}) {
  const letters = readLetters(name);
  if (letters.length === 0) return null;
  const flow = soundFlow(letters);
  const yy = yinYang(letters);

  // 이름이 담고 있는 오행
  const nameCount = [0, 0, 0, 0, 0];
  letters.forEach((l) => { if (l.el !== null) nameCount[l.el] += 1; });
  const main = nameCount.indexOf(Math.max(...nameCount));
  const missing = nameCount.map((c, el) => [c, el]).filter(([c]) => c === 0).map(([, el]) => el);

  const cross = [];
  if (ctx?.analysis) {
    const an = ctx.analysis;
    const counts = ctx.pillars ? elementCount(ctx.pillars) : [1, 1, 1, 1, 1];
    const yong = an.yongsin;
    const has = nameCount[yong] > 0;
    cross.push(has
      ? `사주에서 가장 필요한 기운은 ${EL_KO[yong]}이에요. 마침 이름 안에 ${EL1[yong]} 소리가 ${nameCount[yong]}자 들어 있어요. 부르는 소리가 모자란 기운을 하루에도 몇 번씩 채워 주는 셈이라, 성명학에서 가장 반기는 짜임입니다.`
      : `사주에서 가장 필요한 기운은 ${EL_KO[yong]}인데, 이름에는 ${EL1[yong]} 소리가 없어요. ${EL_SOUND[yong].letters} 소리가 그 자리를 맡는데, 별명이나 상호처럼 자주 불리는 이름에 그 소리를 한 번 섞으면 보탬이 됩니다.`);

    const minC = Math.min(...counts);
    const lack = counts.map((c, el) => [c, el]).filter(([c]) => c === minC).map(([, el]) => el)[0];
    if (lack !== yong) {
      cross.push(nameCount[lack] > 0
        ? `사주에서 가장 옅은 기운은 ${EL_KO[lack]}이고, 이름이 그 소리를 ${nameCount[lack]}자 가지고 있어요. 타고나지 못한 쪽을 이름이 조용히 메워 주는 자리예요.`
        : `사주에서 가장 옅은 기운은 ${EL_KO[lack]}인데 이름에도 없어요. 이 기운은 타고나기보다 만들어 쓰는 쪽이라, 사람과 자리에서 빌려 오는 게 빠릅니다.`);
    }

    const fv = an.fav[main];
    cross.push(fv >= 0.3
      ? `이름을 이끄는 소리는 ${EL_KO[main]}이고, 이 기운은 사주에서도 반가운 쪽이에요. 이름과 사주가 같은 편에 선 드문 경우라, 이름값을 그대로 쓰면 됩니다.`
      : fv <= -0.3
        ? `이름을 이끄는 소리는 ${EL_KO[main]}인데, 사주에서는 이미 넉넉한 기운이에요. 이름이 성향을 한 번 더 밀어 주는 셈이라 과해지지 않게 완급만 챙기면 돼요.`
        : `이름을 이끄는 소리는 ${EL_KO[main]}이고, 사주와 크게 부딪히지도 돕지도 않아요. 이름이 성향을 정해 주기보다 거드는 정도예요.`);
  }

  const gyeok = fourGyeok(opts.surStrokes, opts.givenStrokes || []);

  return {
    name,
    letters,
    flow,
    yinYang: yy,
    nameCount,
    main,
    missing,
    mainText: `이름 전체를 이끄는 소리는 ${EL_KO[main]}이에요. ${EL_TRAIT[main]}`,
    cross,
    gyeok,
    total: Math.round(flow.score * 0.7 + (yy.balanced ? 100 : 55) * 0.3),
  };
}

export { EL1 };

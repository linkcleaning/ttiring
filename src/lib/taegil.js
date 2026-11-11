// ─────────────────────────────────────────────────────────────
//  이달의 좋은 날 (택일, 擇日)
//
//  두 가지를 겹쳐 봅니다.
//   1) 건제십이신(建除十二神) — 누구에게나 같은, 그날 자체의 성격
//        월건(月建)의 지지가 되는 날이 건(建)이고 날마다 하나씩 나아갑니다.
//        正月(寅月)이면 寅일이 建, 卯일이 除 … 丑일이 閉.
//        월지를 절기로 잡으면 '교절일에는 전날 것을 되풀이한다'는 규칙이
//        저절로 맞습니다. 절입에 월지가 하나 올라가면서 일지도 하나
//        올라가, 그날의 건제가 전날과 같아지기 때문이에요.
//
//        길흉은 옛 구결을 따릅니다.
//          建滿平收黑, 除危定執黃; 成開皆可用, 閉破不相當
//          (건·만·평·수는 흑도, 제·위·정·집은 황도,
//           성·개는 두루 쓸 수 있고, 폐·파는 맞지 않다)
//
//        ※ 날짜별로 '무엇에 좋고 무엇에 나쁘다'를 적은 상세표는
//          책마다 꽤 다릅니다. 그래서 여기서는 여러 책이 공통으로 말하는
//          글자 뜻(成=이룸, 開=엶, 收=거둠, 除=덜어냄, 定=정함,
//          破=깨짐, 閉=닫음)에서만 용도를 끌어오고, 갈리는 대목은
//          쓰지 않았어요.
//
//   2) 그날의 내 운세 — 띠링이 원래 쓰던 일진 점수
//        같은 성일(成日)이라도 내 사주와 부딪히면 나에게는 좋은 날이 아니에요.
//        그래서 최종 점수는 내 쪽에 더 무게를 둡니다.
//
//  여기에 이사만 '손 없는 날'(음력 끝자리 9·0)을 덧붙입니다.
// ─────────────────────────────────────────────────────────────
import { BRANCHES_KO, computeFortune, fourPillars, solarToLunar } from './saju.js';
import { monthBranchAt } from './astro.js';
import { gwa } from './josa.js';

const mod = (n, m) => ((n % m) + m) % m;
const clamp = (v, lo = 1, hi = 99) => Math.max(lo, Math.min(hi, v));

// 건제십이신 — 建에서 시작해 순서대로
export const STARS = [
  { key: '건', hanja: '建', road: '흑', mean: '세우는 날', desc: '한 달의 기운이 처음 서는 날이라 시작하는 힘은 세지만, 땅을 건드리는 일에는 맞지 않다고 봤어요.' },
  { key: '제', hanja: '除', road: '황', mean: '덜어내는 날', desc: '묵은 것을 치우는 날이에요. 정리하고 버리고 털어내는 쪽에 힘이 실려요.' },
  { key: '만', hanja: '滿', road: '흑', mean: '가득 찬 날', desc: '이미 가득 차서 더 담기 어려운 날이에요. 벌이기보다 지키는 쪽이 맞아요.' },
  { key: '평', hanja: '平', road: '흑', mean: '평평한 날', desc: '고르고 평탄한 날이라 크게 오르지도 내리지도 않아요. 다투는 일만 피하면 무던합니다.' },
  { key: '정', hanja: '定', road: '황', mean: '정해지는 날', desc: '자리가 잡히는 날이에요. 정하고 매듭짓고 도장 찍는 일에 좋다고 봤어요.' },
  { key: '집', hanja: '執', road: '황', mean: '붙잡는 날', desc: '쥐고 지키는 날이에요. 다잡는 일에는 좋지만 옮기고 떠나는 일과는 결이 어긋나요.' },
  { key: '파', hanja: '破', road: '흑', mean: '깨지는 날', desc: '한 달 중 월건과 정면으로 부딪히는 날이에요. 헐고 부수는 일 말고는 큰일을 미루라고 했어요.' },
  { key: '위', hanja: '危', road: '황', mean: '위태로운 날', desc: '조심하면 탈이 없는 날이에요. 다만 높은 곳과 먼 길은 옛 책이 한결같이 말립니다.' },
  { key: '성', hanja: '成', road: '황', mean: '이루어지는 날', desc: '맺고 이루는 날이에요. 열두 날 가운데 두루 쓰기 가장 좋은 날로 꼽혀요.' },
  { key: '수', hanja: '收', road: '흑', mean: '거두는 날', desc: '거두어 들이는 날이에요. 받을 것을 받고 갈무리하는 쪽에 맞아요.' },
  { key: '개', hanja: '開', road: '황', mean: '열리는 날', desc: '문을 여는 날이에요. 새로 열고 들어가고 시작하는 일에 좋다고 봤어요.' },
  { key: '폐', hanja: '閉', road: '흑', mean: '닫는 날', desc: '닫아 두는 날이에요. 막고 덮는 일 말고는 새로 벌이지 말라고 했어요.' },
];

/**
 * 용도별로 맞는 날·어긋나는 날 — 글자 뜻에서만 끌어왔어요.
 *
 * 구결이 '成開皆可用(성·개는 두루 쓸 수 있다), 閉破不相當(폐·파는 맞지 않다)'이라
 * 성·개는 모든 용도에서 좋은 날, 파·폐는 모든 용도에서 피할 날로 깔고
 * 거기에 용도마다 글자 뜻이 맞는 날을 더했습니다.
 */
const ALWAYS_GOOD = ['성', '개'];
const ALWAYS_BAD = ['파', '폐'];
// cat: 그 용도에 걸리는 내 운세 분야. 같은 날이라도 할 일에 따라 다르게 봐야 해요.
const P = (key, label, hint, cat, plusGood, plusBad, soso, why, extra = {}) => ({
  key, label, hint, cat, why, ...extra,
  good: [...ALWAYS_GOOD, ...plusGood],
  bad: [...ALWAYS_BAD, ...plusBad],
  best: plusGood,   // 그 용도에만 특히 맞는 날 (늘 좋은 성·개보다 한 번 더 쳐 줍니다)
  soso,
});

export const PURPOSES = [
  P('계약', '계약·서명', '도장 찍는 일', ['사업', '재물'], ['정'], [], ['수', '집'],
    '구결이 성(成)·개(開)를 두루 쓸 수 있는 날로 꼽아요. 여기에 정(定)은 자리가 정해지는 날이라 매듭짓는 일에 더합니다. 파(破)·폐(閉)는 깨지고 닫히는 날이라 뺍니다.'),
  P('이사', '이사·입주', '짐 옮기는 날', ['건강'], ['제'], ['집'], ['정', '평'],
    '제(除)는 묵은 것을 덜어내는 날이라 짐을 옮기는 일과 맞아요. 집(執)은 쥐고 놓지 않는 날이라 옮기는 일과 어긋나서 뺍니다.',
    { sonEobtNeun: true }),
  P('개업', '개업·오픈', '새로 여는 날', ['사업', '재물'], [], ['수'], ['정', '만'],
    '개(開)가 그대로 문을 여는 날이에요. 수(收)는 거두어들이는 날이라 새로 여는 일과는 반대쪽이어서 뺍니다.'),
  P('면접', '면접·시험', '나를 보이는 날', ['사업'], ['정'], [], ['건', '평'],
    '성(成)은 이루어지는 날, 정(定)은 자리가 잡히는 날이에요. 결과가 걸린 일에 맞습니다.'),
  P('여행', '여행·출장', '멀리 가는 날', ['건강'], ['제'], ['위'], ['평', '건'],
    '개(開)는 길이 열리는 날이에요. 위(危)는 여러 책이 한결같이 높은 곳과 먼 길을 말린 날이라 뺍니다.'),
  P('수금', '돈 받기·정산', '받을 것을 받는 날', ['재물'], ['수'], [], ['정', '만'],
    '수(收)가 그대로 거두어들이는 날이에요. 성(成)은 매듭이 지어지는 날이라 같이 씁니다.'),
];

/** 그날의 건제십이신. 월지는 절기로 잡습니다(교절일 반복이 저절로 맞아요) */
export function starOf(y, m, d) {
  // 하루의 끝(23:59 KST)으로 보면, 절입이 든 날은 새 월건을 써서
  // 건제가 전날과 같아집니다 — 옛 책의 '교절일에는 전날 것을 되풀이한다'와 맞아요.
  const endOfDay = Date.UTC(y, m - 1, d, 14, 59);
  const monthBranch = monthBranchAt(endOfDay);
  const dayBranch = fourPillars(y, m, d, null, Date.UTC(y, m - 1, d, 3)).day.branch;
  return { idx: mod(dayBranch - monthBranch, 12), dayBranch, monthBranch };
}

/** 손 없는 날: 음력 끝자리가 9 또는 0 (이사에서만 씁니다) */
export function isSonEobtNeun(y, m, d) {
  const lun = solarToLunar(y, m, d);
  if (!lun) return false;
  const last = lun.day % 10;
  return last === 9 || last === 0;
}

const purposeOf = (key) => PURPOSES.find((p) => p.key === key) || PURPOSES[0];

/**
 * 한 달치 택일
 * @param profile  사람
 * @param year     양력 연
 * @param month    양력 월 (1~12)
 * @param purposeKey 용도
 */
export function monthPicks(profile, year, month, purposeKey) {
  const pur = purposeOf(purposeKey);
  const last = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  const days = [];
  for (let d = 1; d <= last; d += 1) {
    const { idx, dayBranch } = starOf(year, month, d);
    const star = STARS[idx];

    // 전통 쪽 점수 (-30 ~ +30 남짓)
    let trad = star.road === '황' ? 8 : -8;
    const fit = pur.good.includes(star.key) ? 'good'
      : pur.bad.includes(star.key) ? 'bad'
        : pur.soso.includes(star.key) ? 'soso' : 'plain';
    if (fit === 'good') trad += pur.best.includes(star.key) ? 26 : 18;
    else if (fit === 'soso') trad += 8;
    else if (fit === 'bad') trad -= 24;

    const son = pur.sonEobtNeun && isSonEobtNeun(year, month, d);
    if (son) trad += 10;

    // 내 쪽 점수 — 띠링이 쓰던 그 일진 점수.
    // 총운만 쓰면 어떤 용도를 골라도 같은 날이 뽑혀서, 그 일에 걸리는
    // 분야(사업·재물·건강) 점수를 총운과 섞어 씁니다.
    let mine = 50;
    try {
      const f = computeFortune(profile, new Date(year, month - 1, d));
      const cats = pur.cat
        .map((k) => f.categories.find((c) => c.key === k)?.score)
        .filter((v) => typeof v === 'number');
      const catAvg = cats.length ? cats.reduce((a, b) => a + b, 0) / cats.length : f.scores.total;
      mine = Math.round(f.scores.total * 0.4 + catAvg * 0.6);
    } catch { /* 무시 */ }

    const score = clamp(Math.round(50 + (mine - 55) * 0.85 + trad * 0.55));
    const date = new Date(year, month - 1, d);
    days.push({
      d, date, star, son, trad, mine, score, fit,
      weekday: date.getDay(),
      branchKo: BRANCHES_KO[dayBranch],
      isToday: `${year}-${month}-${d}` === todayKey,
      past: date < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    });
  }

  const future = days.filter((x) => !x.past);
  const pool = future.length >= 5 ? future : days;

  // 추천할 날에서 '옛 책이 말린 날'은 점수가 높아도 뺍니다.
  // 추천해 놓고 풀이에서 '이 일에는 맞지 않아요'라고 말하면 안 되니까요.
  // 옛 책이 그 일에 맞다고 한 날이 넉넉하면 거기서만 고릅니다.
  const fitting = pool.filter((x) => x.fit === 'good');
  const okForPick = pool.filter((x) => x.fit !== 'bad');
  const pickFrom = fitting.length >= 3 ? fitting : (okForPick.length >= 3 ? okForPick : pool);
  const best = pickFrom.slice().sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.d - b.d);
  const worst = pool.slice().sort((a, b) => a.score - b.score).slice(0, 2).sort((a, b) => a.d - b.d);

  return { purpose: pur, days, best, worst, year, month };
}

/** 한 날짜를 눌렀을 때 보여 줄 풀이 */
export function explainDay(day, purpose) {
  const { star } = day;
  const fit = day.fit ?? (purpose.good.includes(star.key) ? 'good'
    : purpose.bad.includes(star.key) ? 'bad'
      : purpose.soso.includes(star.key) ? 'soso' : 'plain');

  const head = `${day.d}일은 ${star.key}일(${star.hanja}日), ${star.mean}이에요.`;
  const lines = [star.desc];

  if (fit === 'good') lines.push(`${gwa(purpose.label)}는 결이 맞는 날로 꼽혀요.`);
  else if (fit === 'bad') lines.push(`${purpose.label}에는 옛 책이 말린 날이에요.`);
  else if (fit === 'soso') lines.push(`${purpose.label}에 못 쓸 날은 아니지만, 딱 맞는 날로 꼽히지도 않아요.`);
  else lines.push(`${gwa(purpose.label)}는 특별히 얽히지 않는 날이에요.`);

  if (day.son) lines.push('음력 날짜 끝자리가 9나 0이라 흔히 말하는 ‘손 없는 날’이기도 해요.');

  // 앞날의 일진 점수는 숫자로 알려 주지 않아요. 그날 운세는 그날 뽑는 게 띠링의 규칙이라,
  // 여기서는 '이 일에 쓰기 좋은 날인지'만 말합니다.
  if (day.mine >= 70) lines.push('여기에 이날 사주 흐름까지 같은 쪽으로 붙어요. 날과 사람이 같은 편에 서는 날입니다.');
  else if (day.mine <= 42) lines.push('다만 이날 사주 흐름은 조금 처져요. 날은 괜찮아도 몸과 마음이 안 따라 줄 수 있으니 일정을 빡빡하게 잡지 마세요.');
  else lines.push('이날 사주 흐름은 무던해요. 날이 돕지도 막지도 않으니 준비한 만큼 갑니다.');

  return { head, body: lines.join(' '), fit };
}

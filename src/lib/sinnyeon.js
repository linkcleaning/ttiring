// ─────────────────────────────────────────────────────────────
//  신년운세 (세운) + 월별 흐름
//
//  · 그해의 간지(세운)가 내 원국의 용신·기신을 돕는지,
//    띠·일지와 합·충·원진·형을 이루는지, 일간의 12운성이 어떤지로 점수를 내요.
//  · 달마다 월건(月建)으로 같은 방식의 점수를 내서 열두 달 흐름을 보여 줘요.
//  · 무작위 요소는 없어요. 같은 사람·같은 해면 언제나 같은 결과.
// ─────────────────────────────────────────────────────────────
import {
  ANIMALS, BRANCHES, BRANCHES_KO, ELEMENTS_KO, GOD_OF, HIDDEN_STEMS, STEMS, STEMS_KO, STEM_EL,
  analyzeChart, branchRelation, mod, natalChart, twelveStage,
} from './saju.js';
import { gradeOf } from './fortune.js';

const clamp = (v, lo = 15, hi = 96) => Math.round(Math.min(hi, Math.max(lo, v)));
const mainEl = (b) => STEM_EL[HIDDEN_STEMS[b].at(-1)];
const COLOR = ['푸른', '붉은', '노란', '하얀', '검은'];
const HYEONG = [[2, 5], [5, 8], [2, 8], [1, 10], [10, 7], [1, 7], [0, 3]];
const inPairs = (pairs, a, b) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const HAP = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];
const STAGE_W = { 장생: 4, 목욕: 0, 관대: 3, 건록: 5, 제왕: 4, 쇠: 0, 병: -3, 사: -4, 묘: -2, 절: -4, 태: 0, 양: 1 };

/** 그해 간지 */
export const yearPillar = (y) => ({ stem: mod(y - 4, 10), branch: mod(y - 4, 12) });

/** 양력 m월에 주로 걸리는 월건 (1월은 전해 축월, 2월=인월 … 12월=자월) */
export function monthPillar(y, m) {
  const ganzhiYear = m === 1 ? y - 1 : y;
  const ys = yearPillar(ganzhiYear).stem;
  const first = mod((ys % 5) * 2 + 2, 10); // 오호둔: 인월 천간
  const k = m === 1 ? 11 : m - 2; // 인월부터 몇 번째
  return { stem: mod(first + k, 10), branch: mod(2 + k, 12) };
}

/** 삼재: 띠 기준 들·눌·날 */
const SAMJAE = [
  { group: [8, 0, 4], years: [2, 3, 4] },
  { group: [5, 9, 1], years: [11, 0, 1] },
  { group: [2, 6, 10], years: [8, 9, 10] },
  { group: [11, 3, 7], years: [5, 6, 7] },
];
export function samjae(zodiac, yearBranch) {
  const g = SAMJAE.find((x) => x.group.includes(zodiac));
  const i = g.years.indexOf(yearBranch);
  return i < 0 ? null : ['들삼재', '눌삼재', '날삼재'][i];
}

/** 한 기둥(해·달)이 내 원국에 주는 힘 */
function scorePillar(pillars, an, p) {
  const { fav } = an;
  let s = fav[STEM_EL[p.stem]] * 16 + fav[mainEl(p.branch)] * 12;
  const notes = [];
  const W = { year: 1, day: 1, month: 0.7 };
  const POS = { year: '띠', day: '일지(나의 자리)', month: '월지(사회 자리)' };
  ['year', 'day', 'month'].forEach((k) => {
    const nb = pillars[k].branch;
    const r = branchRelation(nb, p.branch);
    if (r.includes('충')) { s -= 7 * W[k]; notes.push({ v: -7 * W[k], k: 'chung', pos: POS[k] }); }
    if (r.includes('육합')) { s += 4 * W[k]; notes.push({ v: 4 * W[k], k: 'hap', pos: POS[k] }); }
    else if (r.includes('삼합')) { s += 2.5 * W[k]; notes.push({ v: 2.5 * W[k], k: 'samhap', pos: POS[k] }); }
    if (r.includes('원진')) { s -= 3 * W[k]; notes.push({ v: -3 * W[k], k: 'wonjin', pos: POS[k] }); }
    if (inPairs(HYEONG, nb, p.branch)) { s -= 2.5 * W[k]; notes.push({ v: -2.5 * W[k], k: 'hyeong', pos: POS[k] }); }
  });
  if (HAP.some(([a, b]) => (a === pillars.day.stem && b === p.stem) || (b === pillars.day.stem && a === p.stem))) {
    s += 4; notes.push({ v: 4, k: 'cheonhap' });
  }
  const stage = twelveStage(pillars.day.stem, p.branch);
  s += STAGE_W[stage];
  return { raw: s, notes, stage };
}

// ── 문장 ────────────────────────────────────────────────────
const THEME = {
  재성: { title: '돈과 결과의 해', good: '움직인 만큼 돈과 결과가 손에 잡히는 해예요. 미뤄 둔 정산, 가격 조정, 부업처럼 숫자로 남는 일을 올해 해 두세요.', bad: '돈이 들어오는 만큼 나갈 구멍도 같이 생기는 해예요. 큰 투자나 보증보다 새는 돈을 막는 쪽이 올해의 수익이에요.' },
  관성: { title: '자리와 책임의 해', good: '맡는 일이 커지고 이름이 알려지는 해예요. 승진·자격·공식적인 자리를 노려 볼 만해요.', bad: '책임과 눈치가 함께 늘어나는 해예요. 다 떠안기보다 할 수 있는 만큼만 약속하는 게 나를 지켜요.' },
  인성: { title: '배움과 도움의 해', good: '윗사람·문서·공부 쪽에서 도움이 들어오는 해예요. 자격증, 계약서, 집 문서처럼 종이로 남는 일이 잘 풀려요.', bad: '생각이 많아져 시작이 늦어지기 쉬운 해예요. 완벽하게 준비되길 기다리지 말고 작게라도 먼저 움직여 보세요.' },
  식상: { title: '표현과 재주의 해', good: '말과 손재주가 빛나는 해예요. 홍보·강의·창작·새 메뉴처럼 내 걸 보여 주는 일에 운이 붙어요.', bad: '말이 앞서 오해를 사기 쉬운 해예요. 하고 싶은 말은 한 번 걸러서, 글보다는 결과로 보여 주세요.' },
  비겁: { title: '독립과 경쟁의 해', good: '내 힘이 단단해지고 같은 편이 늘어나는 해예요. 동업·모임·새 출발에 힘이 실려요.', bad: '경쟁자가 늘고 돈이 사람 사이로 새기 쉬운 해예요. 돈거래와 동업은 문서로 분명히 해 두세요.' },
};
const MONTH_LINE = {
  재성: ['돈이 도는 달', '지출을 줄일 달'],
  관성: ['인정받는 달', '책임이 무거운 달'],
  인성: ['도움 받는 달', '생각만 많은 달'],
  식상: ['내 걸 보여 줄 달', '말조심할 달'],
  비겁: ['사람이 힘이 되는 달', '돈거래 조심할 달'],
};
const NOTE_TEXT = {
  chung: (pos) => `올해 지지가 내 ${pos}와 충(沖)을 이뤄, 이사·이직·관계 정리처럼 자리가 바뀌는 일이 생기기 쉬워요. 나쁜 일이라기보다 '움직임'의 신호예요.`,
  hap: (pos) => `올해 지지가 내 ${pos}와 육합(六合)으로 손을 잡아, 새 인연이나 든든한 협력자가 생기기 좋아요.`,
  samhap: (pos) => `올해 지지가 내 ${pos}와 삼합(三合)을 이뤄, 혼자보다 여럿이 할 때 일이 커져요.`,
  wonjin: (pos) => `올해 지지가 내 ${pos}와 원진(怨嗔)이라, 가까운 사이에서 괜한 서운함이 생기기 쉬워요. 말투만 조심하면 넘어가요.`,
  hyeong: (pos) => `올해 지지가 내 ${pos}와 형(刑)이 걸려, 서류·법·건강검진처럼 꼼꼼히 확인할 일은 미루지 마세요.`,
  cheonhap: () => '올해 천간이 내 일간과 천간합(天干合)을 이뤄, 귀인과 좋은 제안이 들어오는 해예요.',
};
const SAMJAE_TEXT = {
  들삼재: '삼재가 들어오는 해(들삼재)예요. 큰일을 새로 벌이기보다 지금 가진 걸 단단히 하는 해로 쓰세요.',
  눌삼재: '삼재가 머무는 해(눌삼재)예요. 무리한 확장만 피하면 크게 걱정할 건 없어요.',
  날삼재: '삼재가 나가는 해(날삼재)예요. 막혔던 일이 하반기로 갈수록 풀려 나가요.',
};
const eun = (w) => { const c = w.charCodeAt(w.length - 1); return w + ((c - 0xac00) % 28 ? '은' : '는'); };
const grade = (s) => gradeOf(s).label;

/** 분야별 연간 점수 */
function areaScores(total, se, p, fav, gender) {
  const present = [{ g: GOD_OF(se, STEM_EL[p.stem]), el: STEM_EL[p.stem], w: 1 }, { g: GOD_OF(se, mainEl(p.branch)), el: mainEl(p.branch), w: 0.7 }];
  const love = gender === 'M' ? { 재성: 1, 식상: 0.4, 관성: 0.2 } : gender === 'F' ? { 관성: 1, 식상: 0.4, 재성: 0.2 } : { 재성: 0.6, 관성: 0.6, 식상: 0.4 };
  const REL = {
    재물: { 재성: 1, 식상: 0.5, 비겁: -0.6 },
    직장: { 관성: 1, 인성: 0.6, 재성: 0.3, 식상: -0.2 },
    애정: love,
    건강: { 인성: 0.8, 비겁: 0.6, 관성: -0.6, 재성: -0.2 },
  };
  return ['재물', '직장', '애정', '건강'].map((key) => {
    let adj = 0;
    present.forEach(({ g, el, w }) => {
      const r = REL[key][g] || 0;
      if (r > 0) adj += w * r * (5 + 11 * fav[el]);
      else if (r < 0) adj += w * r * (8 - 6 * fav[el]);
    });
    return { key, score: clamp(total + adj * 0.8) };
  });
}

/** 메인: y년 신년운세 */
export function newYearFortune(profile, y) {
  const natal = natalChart(profile);
  const { pillars } = natal;
  const an = analyzeChart(pillars);
  const se = STEM_EL[pillars.day.stem];
  const yp = yearPillar(y);
  const ys = scorePillar(pillars, an, yp);
  const total = clamp(58 + ys.raw);
  const god = GOD_OF(se, STEM_EL[yp.stem]);
  const goodYear = an.fav[STEM_EL[yp.stem]] + an.fav[mainEl(yp.branch)] * 0.8 >= 0;
  const zodiac = pillars.year.branch;
  const sj = samjae(zodiac, yp.branch);

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const mp = monthPillar(y, m);
    const ms = scorePillar(pillars, an, mp);
    const score = clamp(total * 0.35 + (58 + ms.raw) * 0.65);
    const mg = GOD_OF(se, STEM_EL[mp.stem]);
    const good = an.fav[STEM_EL[mp.stem]] >= 0;
    return { m, pillar: mp, score, god: mg, line: MONTH_LINE[mg][good ? 0 : 1] };
  });
  const sorted = [...months].sort((a, b) => b.score - a.score);
  const best = sorted.slice(0, 2).sort((a, b) => a.m - b.m);
  const worst = sorted.slice(-2).sort((a, b) => a.m - b.m);

  const yearName = `${STEMS_KO[yp.stem]}${BRANCHES_KO[yp.branch]}년`;
  const animal = `${COLOR[STEM_EL[yp.stem]]} ${ANIMALS[yp.branch]}`;
  const theme = THEME[god];
  const half1 = months.slice(0, 6).reduce((a, x) => a + x.score, 0) / 6;
  const half2 = months.slice(6).reduce((a, x) => a + x.score, 0) / 6;
  const flow = Math.abs(half1 - half2) < 3
    ? '상반기와 하반기 기복이 크지 않아, 꾸준히 가는 사람이 이기는 한 해예요.'
    : half2 > half1
      ? '상반기엔 씨를 뿌리고 하반기에 거두는 흐름이에요. 초반에 조급해하지 마세요.'
      : '상반기에 힘이 몰려 있어요. 하고 싶은 일은 여름 전에 시작해 두세요.';

  const p1 = `${y}년 ${yearName}(${STEMS[yp.stem]}${BRANCHES[yp.branch]}年)은 ${animal}의 해예요. 내 사주로 보면 올해 총운은 ${total}점, ${grade(total)}이에요. 올해 하늘 기운 ${eun(STEMS_KO[yp.stem] + ['목', '화', '토', '금', '수'][STEM_EL[yp.stem]])} 나에게 ${god}에 해당해서, 한마디로 '${theme.title}'예요. ${goodYear ? theme.good : theme.bad}`;
  const relLines = ys.notes.sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 2).map((n) => NOTE_TEXT[n.k](n.pos));
  const p2 = [...relLines, sj ? SAMJAE_TEXT[sj] : null, `일간이 올해 지지에서 ${ys.stage}(12운성)의 자리라, ${STAGE_W[ys.stage] >= 3 ? '기운이 차오르는 한 해예요' : STAGE_W[ys.stage] <= -3 ? '몸과 마음을 아끼며 가는 게 좋은 한 해예요' : '무리하지 않으면 무난히 흘러가는 한 해예요'}.`]
    .filter(Boolean).join(' ');
  const p3 = `${flow} 가장 힘이 붙는 달은 ${best.map((x) => `${x.m}월`).join('·')}, 조심할 달은 ${worst.map((x) => `${x.m}월`).join('·')}이에요. 올해 나에게 필요한 기운은 ${ELEMENTS_KO[an.yongsin]}(${['木', '火', '土', '金', '水'][an.yongsin]})이니, 막힐 때는 이 기운을 가까이 두세요.`;

  return {
    year: y, yearName, animal, pillar: yp, total, grade: grade(total), god, theme: theme.title,
    samjae: sj, paragraphs: [p1, p2, p3], months, best, worst,
    areas: areaScores(total, se, yp, an.fav, profile.gender),
  };
}

/** 지금 보여 줄 신년운세 해: 11월부터는 다음 해, 그 외엔 올해 */
export const featuredYear = (d = new Date()) => (d.getMonth() >= 10 ? d.getFullYear() + 1 : d.getFullYear());

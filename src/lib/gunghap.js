// ─────────────────────────────────────────────────────────────
//  오늘의 궁합 — 등록해 둔 두 사람 사이
//
//  두 겹으로 봅니다.
//   1) 타고난 사이(base)  : 평생 바뀌지 않는 두 사주의 관계
//        · 일간(日干)   서로의 기운이 상대에게 반가운가  (십성)
//        · 일지(日支)   부부궁 자리의 합·충
//        · 연지(年支)   띠끼리의 합·충
//        · 오행 보완    상대의 사주가 내 용신을 채워 주는가
//   2) 오늘의 호흡(today) : 그날 일진이 두 사람에게 어떻게 들어오는가 — 매일 바뀝니다
//
//  옛 책의 궁합은 '좋다/나쁘다'가 아니라 '무엇이 오가는 사이인가'를 봅니다.
//  그래서 점수가 낮아도 나쁜 사이가 아니라 '힘이 드는 자리'로 풀어 씁니다.
// ─────────────────────────────────────────────────────────────
import {
  ANIMALS, BRANCHES_KO, BRANCH_EL, ELEMENTS_KO, STEMS_KO, STEM_EL,
  analyzeChart, branchRelation, fourPillars, natalChart, tenGod,
} from './saju.js';
import { eun, gwa, i, ira } from './josa.js';
import { personLabel } from './people.js';

const clamp = (v, lo = 8, hi = 97) => Math.max(lo, Math.min(hi, v));
const round = (v) => Math.round(v);

/** 지지 관계에 매기는 점수 (부부궁 자리는 띠보다 무겁게 봅니다) */
const REL_SCORE = {
  육합: 1, 삼합: 0.78, 동기: 0.3, 해: -0.42, 원진: -0.72, 충: -0.85,
};
const relWeight = (rels) => {
  if (!rels.length) return 0;
  // 합과 충이 같이 들어오면 둘 다 살려서 더합니다 (옛 책의 '합중유충')
  return rels.reduce((s, k) => s + (REL_SCORE[k] ?? 0), 0);
};

/** 사주 여덟 글자에서 그 오행이 차지하는 비중 (0~1, 보통 0.2) */
function share(an, el) {
  const sum = an.weights.reduce((a, b) => a + b, 0);
  return sum > 0 ? an.weights[el] / sum : 0.2;
}

// ── 십성으로 본 사이 ──────────────────────────────────────────
const GOD_PAIR = {
  비겁: {
    label: '어깨를 나란히 하는 사이',
    text: '같은 기운을 타고나서 말이 짧아도 통해요. 편한 만큼 같은 것을 두고 겨루기도 하니, 역할을 나눠 두면 오래 갑니다.',
  },
  식상: {
    label: '내가 베푸는 사이',
    text: '이 사람 앞에서는 말이 많아지고 하고 싶은 게 생겨요. 주는 쪽이 나라서 즐겁지만, 혼자 다 떠안으면 내 기운이 먼저 빕니다.',
  },
  재성: {
    label: '내가 아끼고 챙기는 사이',
    text: '실속이 오가는 자리예요. 챙겨 주는 보람이 그대로 돌아오지만, 셈이 끼어들면 금이 가기 쉬운 사이이기도 합니다.',
  },
  관성: {
    label: '나를 잡아 주는 사이',
    text: '이 사람 앞에서는 저절로 자세가 반듯해져요. 긴장되는 만큼 나를 키워 주는 자리라, 멀리 두면 아까운 인연입니다.',
  },
  인성: {
    label: '나를 받쳐 주는 사이',
    text: '기대고 배우게 되는 자리예요. 마음이 놓이는 사이지만, 너무 기대면 내 결정을 미루게 되니 선은 내가 그어야 합니다.',
  },
};

// ── 일지(부부궁) 풀이 ────────────────────────────────────────
function dayBranchLine(rels) {
  if (rels.includes('육합')) return `두 분의 일지(日支)가 육합(六合)으로 맞물려 있어요. 일지는 옛 책이 배우자 자리라 부른 칸이라, 같이 있는 시간이 길수록 편해지는 사이예요.`;
  if (rels.includes('삼합')) return `두 분의 일지가 삼합(三合)으로 엮여 있어요. 둘만 있을 때보다 셋이 모이거나 일로 엮일 때 힘이 제대로 납니다.`;
  if (rels.includes('충')) return `두 분의 일지가 충(沖)으로 맞서 있어요. 부딪히는 자리라 말이 세게 오가기 쉬운데, 옛 책은 이 충을 '서로를 흔들어 깨우는 자리'로도 봤어요. 붙어 지내기보다 각자 자리를 두는 쪽이 오래 갑니다.`;
  if (rels.includes('원진')) return `두 분의 일지가 원진(怨嗔)이에요. 이유 없이 거슬리는 날이 생기는 자리인데, 미워서가 아니라 기운의 결이 달라서예요. 말을 줄이고 행동으로 맞추는 편이 낫습니다.`;
  if (rels.includes('해')) return `두 분의 일지가 해(害)로 걸려 있어요. 작은 어긋남이 쌓이기 쉬우니, 그때그때 짚고 넘어가면 커지지 않아요.`;
  if (rels.includes('동기')) return `두 분의 일지가 같은 글자예요. 생각하는 방식이 닮아서 설명이 짧아도 통하는 사이입니다.`;
  return `두 분의 일지는 합도 충도 없이 담담해요. 끌어당기지도 밀어내지도 않는 자리라, 쌓은 만큼만 정확히 남는 사이입니다.`;
}

// ── 띠 풀이 ──────────────────────────────────────────────────
function yearBranchLine(rels, aZ, bZ) {
  const pair = `${ANIMALS[aZ]}띠와 ${ANIMALS[bZ]}띠`;
  if (rels.includes('육합')) return `${pair}는 육합이라, 처음 만났을 때부터 어색함이 덜했을 거예요.`;
  if (rels.includes('삼합')) return `${pair}는 삼합이라, 같은 목표를 두면 손발이 잘 맞습니다.`;
  if (rels.includes('충')) return `${pair}는 서로 마주 보는 충이에요. 성향이 반대라 배울 것도 그만큼 많은 조합입니다.`;
  if (rels.includes('원진')) return `${pair}는 원진으로 묶여요. 가까울수록 사소한 것이 눈에 밟히니 거리를 조금 두면 편해집니다.`;
  if (rels.includes('해')) return `${pair}는 해로 걸려서, 좋은 뜻이 엉뚱하게 전해지는 일이 가끔 있어요.`;
  if (rels.includes('동기')) return `${pair}, 같은 띠예요. 닮아서 편하고, 닮아서 답답한 날도 있습니다.`;
  return `${pair}는 특별히 얽힌 것이 없어서, 띠보다는 두 분이 쌓은 시간이 더 크게 작용해요.`;
}

// ── 오늘의 호흡 ──────────────────────────────────────────────
const MODE = {
  together: { label: '같이 움직이기 좋은 날', tone: 'good' },
  aPull: { label: '한쪽이 끌어 주는 날', tone: 'mid' },
  bPull: { label: '한쪽이 끌어 주는 날', tone: 'mid' },
  apart: { label: '각자 있는 편이 나은 날', tone: 'low' },
  plain: { label: '무던한 날', tone: 'mid' },
};

function todayLines(ctx) {
  const { mode, aName, bName, stemEl, branchEl, gz, pullName, restName, todayRels } = ctx;
  const el = ELEMENTS_KO[stemEl];
  const head = `${gz}인 오늘은 ${el} 기운이 하늘로 들어와요.`;

  let body;
  if (mode === 'together') {
    body = `그 기운이 두 분 모두에게 반가운 쪽이에요. 미뤄 둔 이야기를 꺼내거나 같이 결정할 일이 있으면 오늘 하는 게 제일 수월합니다.`;
  } else if (mode === 'apart') {
    body = `그런데 이 기운이 두 분 모두에게 부담이 되는 쪽이에요. 오늘 꺼낸 말은 평소보다 날이 서서 나갑니다. 큰 이야기는 하루만 미뤄 두세요.`;
  } else if (mode === 'plain') {
    body = `두 분 어느 쪽으로도 크게 기울지 않아요. 오늘은 날이 도와주지도 막지도 않으니, 평소 하던 대로 하면 그대로 갑니다.`;
  } else {
    body = `오늘은 ${eun(pullName)} 기운을 받고 ${eun(restName)} 조금 처지는 날이에요. ${i(pullName)} 먼저 말을 꺼내고 자리를 만들면 하루가 매끄럽게 돌아갑니다.`;
  }

  // 오늘 지지가 두 분의 일지 자리를 건드리는지 — 약속이 붙거나 어긋나는 날
  const bothHap = ['육합', '삼합'].some((k) => todayRels.a.includes(k))
    && ['육합', '삼합'].some((k) => todayRels.b.includes(k));
  const anyChung = todayRels.a.includes('충') || todayRels.b.includes('충');
  const dayBr = `${BRANCHES_KO[ctx.todayBranch]}(${ANIMALS[ctx.todayBranch]})`;

  let tail = '';
  if (anyChung) {
    tail = ` 다만 오늘 지지인 ${dayBr}가 두 분 중 한 분의 일지 자리를 치고 들어와요. 약속 시각이나 장소가 바뀌기 쉬우니 한 번 더 확인하세요.`;
  } else if (bothHap) {
    tail = ` 게다가 오늘 지지인 ${dayBr}가 두 분의 자리와 모두 합을 이뤄요. 오늘 만나면 이야기가 길어집니다.`;
  } else if (branchEl === stemEl) {
    tail = ` 땅에 깔린 기운까지 같은 ${ira(el)}, 오늘 오간 말은 그대로 남아요.`;
  }

  return `${head} ${body}${tail}`;
}

// ── 본체 ─────────────────────────────────────────────────────
/**
 * 두 사람의 오늘 궁합
 * @param a 기준이 되는 사람(지금 보고 있는 사람)
 * @param b 상대
 * @param date 날짜 (기본 오늘)
 */
export function gunghap(a, b, date = new Date()) {
  const chartA = natalChart(a);
  const chartB = natalChart(b);
  const anA = analyzeChart(chartA.pillars);
  const anB = analyzeChart(chartB.pillars);

  const aName = personLabel(a);
  const bName = personLabel(b);

  // ── 1) 타고난 사이 ──
  const aStemEl = STEM_EL[chartA.pillars.day.stem];
  const bStemEl = STEM_EL[chartB.pillars.day.stem];

  // 상대의 일간 기운이 나에게 반가운가 (양쪽 평균)
  const stemFit = (anA.fav[bStemEl] + anB.fav[aStemEl]) / 2;

  // 상대의 사주가 내 용신을 얼마나 채워 주는가 (평균 비중 0.2 기준)
  const supply = ((share(anB, anA.yongsin) - 0.2) + (share(anA, anB.yongsin) - 0.2)) / 2;

  const dayRels = branchRelation(chartA.pillars.day.branch, chartB.pillars.day.branch);
  const yearRels = branchRelation(chartA.pillars.year.branch, chartB.pillars.year.branch);

  const baseRaw = 52
    + stemFit * 15
    + supply * 48
    + relWeight(dayRels) * 13
    + relWeight(yearRels) * 8;
  const base = clamp(round(baseRaw), 14, 96);

  // 양쪽에서 본 십성
  const godAtoB = tenGod(chartA.pillars.day.stem, chartB.pillars.day.stem);
  const godBtoA = tenGod(chartB.pillars.day.stem, chartA.pillars.day.stem);

  // ── 2) 오늘의 호흡 ──
  const ty = date.getFullYear(), tm = date.getMonth() + 1, td = date.getDate();
  const now = new Date();
  const isNow = ty === now.getFullYear() && tm === now.getMonth() + 1 && td === now.getDate();
  const tp = fourPillars(ty, tm, td, null, isNow ? now.getTime() : Date.UTC(ty, tm - 1, td, 3)).day;
  const tStem = tp.stem, tBranch = tp.branch;
  const tStemEl = STEM_EL[tStem];
  const tBranchEl = BRANCH_EL[tBranch];

  const favA = (anA.fav[tStemEl] * 0.6 + anA.fav[tBranchEl] * 0.4);
  const favB = (anB.fav[tStemEl] * 0.6 + anB.fav[tBranchEl] * 0.4);

  const todayRels = {
    a: branchRelation(chartA.pillars.day.branch, tBranch),
    b: branchRelation(chartB.pillars.day.branch, tBranch),
  };
  const bridge = (relWeight(todayRels.a) + relWeight(todayRels.b)) / 2;

  const todayRaw = 50 + (favA + favB) * 17 + bridge * 11;
  const todayScore = clamp(round(todayRaw), 12, 97);

  let mode;
  if (favA > 0.2 && favB > 0.2) mode = 'together';
  else if (favA < -0.2 && favB < -0.2) mode = 'apart';
  else if (favA - favB > 0.35) mode = 'aPull';
  else if (favB - favA > 0.35) mode = 'bPull';
  else mode = 'plain';

  const pullName = mode === 'aPull' ? aName : bName;
  const restName = mode === 'aPull' ? bName : aName;

  const todayText = todayLines({
    mode, aName, bName, stemEl: tStemEl, branchEl: tBranchEl,
    gz: `${STEMS_KO[tStem]}${BRANCHES_KO[tBranch]}일`,
    pullName, restName, todayRels, todayBranch: tBranch,
  });

  // ── 합산 ──
  // 두 값을 그냥 섞으면 가운데로 몰려서 매일 봐도 비슷해 보여요.
  // 50을 축으로 벌려 주어야 '오늘은 다르네' 하는 날이 실제로 생깁니다.
  const blend = (base - 50) * 0.62 + (todayScore - 50) * 0.38;
  const total = clamp(round(50 + blend * 1.4), 12, 97);

  return {
    aName, bName,
    relation: b.relation || '기타',
    base,
    today: todayScore,
    total,
    mode,
    modeLabel: MODE[mode].label,
    tone: MODE[mode].tone,
    god: { label: GOD_PAIR[godAtoB].label, text: GOD_PAIR[godAtoB].text, key: godAtoB },
    godBack: { label: GOD_PAIR[godBtoA].label, key: godBtoA },
    dayLine: dayBranchLine(dayRels),
    yearLine: yearBranchLine(yearRels, chartA.pillars.year.branch, chartB.pillars.year.branch),
    todayText,
    summary: summaryLine(total, aName, bName, MODE[mode].label),
    zodiacB: chartB.pillars.year.branch,
  };
}

function summaryLine(total, aName, bName, modeLabel) {
  const head = `오늘 ${gwa(bName)}의 호흡은 ${total}점.`;
  if (total >= 75) return `${head} ${modeLabel}이에요.`;
  if (total >= 60) return `${head} 무리만 안 하면 매끄럽게 갑니다.`;
  if (total >= 45) return `${head} 크게 좋지도 나쁘지도 않으니 평소대로 하면 돼요.`;
  if (total >= 32) return `${head} 날이 돕지 않으니 기대를 조금 낮춰 두세요.`;
  return `${head} 오늘만큼은 서로 한 발씩 물러서는 게 이득이에요.`;
}

export { GOD_PAIR };

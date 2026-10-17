// ─────────────────────────────────────────────────────────────
//  사주 · 당사주 · 주역(매화역수) 계산 엔진
//  외부 라이브러리 없이 동작 (음력 변환은 브라우저 내장 한국 음력 'dangi' 달력 사용)
// ─────────────────────────────────────────────────────────────

import { CITIES, birthMoment, branchOfSolarMinutes, ipchun, jeolAround, monthBranchAt } from './astro.js';

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

// 오행: 0 木, 1 火, 2 土, 3 金, 4 水
export const ELEMENTS = ['木', '火', '土', '金', '水'];
export const ELEMENTS_KO = ['나무', '불', '흙', '쇠', '물'];
const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

// 시진 (한국 표준시 기준 30분 보정)
export const HOURS = [
  { b: 0, label: '자시', range: '23:30~01:29' },
  { b: 1, label: '축시', range: '01:30~03:29' },
  { b: 2, label: '인시', range: '03:30~05:29' },
  { b: 3, label: '묘시', range: '05:30~07:29' },
  { b: 4, label: '진시', range: '07:30~09:29' },
  { b: 5, label: '사시', range: '09:30~11:29' },
  { b: 6, label: '오시', range: '11:30~13:29' },
  { b: 7, label: '미시', range: '13:30~15:29' },
  { b: 8, label: '신시', range: '15:30~17:29' },
  { b: 9, label: '유시', range: '17:30~19:29' },
  { b: 10, label: '술시', range: '19:30~21:29' },
  { b: 11, label: '해시', range: '21:30~23:29' },
];

const mod = (n, m) => ((n % m) + m) % m;

// ── 음력 ↔ 양력 ──────────────────────────────────────────────
let lunarFmt;
function getLunarFmt() {
  if (lunarFmt) return lunarFmt;
  for (const cal of ['dangi', 'chinese']) {
    try {
      const f = new Intl.DateTimeFormat(`en-US-u-ca-${cal}`, {
        year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
      });
      if (f.resolvedOptions().calendar === cal) return (lunarFmt = f);
    } catch { /* 다음 후보 */ }
  }
  throw new Error('이 브라우저에서는 음력 변환이 안 돼요. 양력으로 입력해 주세요.');
}

/** 양력 → 음력 {year, month, day, leap} */
export function solarToLunar(y, m, d) {
  const parts = getLunarFmt().formatToParts(new Date(Date.UTC(y, m - 1, d, 12)));
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  const monthRaw = get('month');
  return {
    year: Number(get('relatedYear') || get('year')),
    month: parseInt(monthRaw, 10),
    day: Number(get('day')),
    leap: /bis/i.test(monthRaw),
  };
}

/** 음력 → 양력 {year, month, day}. 존재하지 않는 날짜면 null */
const l2sCache = new Map();
export function lunarToSolar(ly, lm, ld, leap = false) {
  const key = `${ly}-${lm}-${ld}-${leap}`;
  if (!l2sCache.has(key)) l2sCache.set(key, lunarToSolarRaw(ly, lm, ld, leap));
  return l2sCache.get(key);
}
function lunarToSolarRaw(ly, lm, ld, leap) {
  let t = Date.UTC(ly, 0, 10, 12);
  for (let i = 0; i < 420; i++, t += 86400000) {
    const dt = new Date(t);
    const l = solarToLunar(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    if (l.year === ly && l.month === lm && l.day === ld && l.leap === leap) {
      return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
    }
  }
  return null;
}

// ── 간지 계산 ────────────────────────────────────────────────
const toJDN = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 86400000) + 2440588;

/** 일주 (60갑자 인덱스) */
export function dayGanzhi(y, m, d) {
  return mod(toJDN(y, m, d) + 49, 60);
}

// 절입일(근사): 해당 월의 이 날짜부터 다음 달 기운
/**
 * 사주 원국. 연주·월주는 실제 절입 시각(태양 황경)으로 가른다.
 * @param momentUtc 출생(또는 기준) 순간의 UTC 밀리초. 없으면 그날 정오(KST)
 * @param hourFromNextDay 야자시: 시주 천간을 다음 날 일간 기준으로 정함
 */
export function fourPillars(y, m, d, hourBranch, momentUtc, hourFromNextDay = false) {
  const t = momentUtc ?? Date.UTC(y, m - 1, d, 3);
  const k = new Date(t + 9 * 3600000);
  const ky = k.getUTCFullYear();
  const sajuYear = k.getUTCMonth() <= 1 && t < ipchun(ky) ? ky - 1 : ky;
  const yearIdx = mod(sajuYear - 4, 60);
  const yStem = yearIdx % 10;
  const yBranch = yearIdx % 12;

  const monthBranch = monthBranchAt(t);
  const fromYin = mod(monthBranch - 2, 12); // 寅월부터 몇 번째
  const mStem = mod((yStem % 5) * 2 + 2 + fromYin, 10);

  const dayIdx = dayGanzhi(y, m, d);
  const dStem = dayIdx % 10;
  const dBranch = dayIdx % 12;

  const pillars = {
    year: { stem: yStem, branch: yBranch },
    month: { stem: mStem, branch: monthBranch },
    day: { stem: dStem, branch: dBranch },
    hour: null,
  };
  if (hourBranch !== null && hourBranch !== undefined) {
    const base = hourFromNextDay ? mod(dStem + 1, 10) : dStem;
    pillars.hour = { stem: mod((base % 5) * 2 + hourBranch, 10), branch: hourBranch };
  }
  return pillars;
}

export const cityLon = (name) => CITIES.find(([n]) => n === name)?.[1];

/**
 * 출생 정보 → 원국 (진태양시 보정, 자시 처리 포함). 같은 입력은 캐시.
 * input: { calendar, year, month, day, leap, time('HH:MM'|''), city, yajasi, hour(예전 저장값) }
 */
const natalCache = new Map();
export function natalChart(input) {
  const key = JSON.stringify([input.calendar, input.year, input.month, input.day, !!input.leap, input.time || '',
    input.hour ?? null, input.city || '', !!input.yajasi]);
  if (natalCache.has(key)) return natalCache.get(key);

  let solar;
  let lunar;
  if (input.calendar === 'lunar') {
    solar = lunarToSolar(input.year, input.month, input.day, !!input.leap);
    if (!solar) throw new Error('없는 음력 날짜예요. 윤달 여부와 날짜를 확인해 주세요.');
    lunar = { year: input.year, month: input.month, day: input.day, leap: !!input.leap };
  } else {
    solar = { year: input.year, month: input.month, day: input.day };
    const chk = new Date(Date.UTC(solar.year, solar.month - 1, solar.day));
    if (chk.getUTCMonth() !== solar.month - 1) throw new Error('없는 날짜예요. 날짜를 다시 확인해 주세요.');
    lunar = solarToLunar(solar.year, solar.month, solar.day);
  }

  const hasTime = /^\d{1,2}:\d{2}$/.test(input.time || '');
  const lon = cityLon(input.city);
  const mo = birthMoment(solar.year, solar.month, solar.day, hasTime ? input.time : '12:00', lon);
  let hour = null;
  let shift = 0;
  let nextStem = false;
  if (hasTime) {
    hour = branchOfSolarMinutes(mo.solarMinutes);
    shift = mo.dateShift;
    if (mo.solarMinutes >= 23 * 60) {
      // 23시 이후 자시: 기본은 다음 날 일주(조자시 통합), 야자시 설정이면 당일 일주 + 다음 날 기준 시간
      if (input.yajasi) nextStem = true;
      else shift += 1;
    }
  } else if (Number.isInteger(input.hour)) {
    hour = input.hour; // 예전 버전 저장값
  }
  const dd = new Date(Date.UTC(solar.year, solar.month - 1, solar.day + shift));
  const dayDate = { year: dd.getUTCFullYear(), month: dd.getUTCMonth() + 1, day: dd.getUTCDate() };
  const pillars = fourPillars(dayDate.year, dayDate.month, dayDate.day, hour, mo.utcMs, nextStem);
  const out = {
    solar, lunar, dayDate, pillars, hour, hasTime, lon,
    moment: mo.utcMs,
    solarMinutes: hasTime ? Math.round(mo.solarMinutes) : null,
  };
  natalCache.set(key, out);
  return out;
}

// ── 명리 (띠 vs 오늘 일진 + 일간 십신) ─────────────────────
const SAMHAP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
const HAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const inPairs = (list, a, b) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export function branchRelation(a, b) {
  const rel = [];
  if (a === b) rel.push('동기');
  if (SAMHAP.some((g) => g.includes(a) && g.includes(b)) && a !== b) rel.push('삼합');
  if (inPairs(YUKHAP, a, b)) rel.push('육합');
  if (mod(a - b, 12) === 6) rel.push('충');
  if (inPairs(WONJIN, a, b)) rel.push('원진');
  if (inPairs(HAE, a, b) && !rel.includes('원진')) rel.push('해');
  return rel;
}

/** 십신 그룹: 일간 기준 오늘 천간의 관계 */
export function tenGod(selfStem, otherStem) {
  const s = STEM_EL[selfStem];
  const o = STEM_EL[otherStem];
  if (s === o) return '비겁';
  if (mod(s + 1, 5) === o) return '식상'; // 내가 생함
  if (mod(s + 2, 5) === o) return '재성'; // 내가 극함
  if (mod(o + 2, 5) === s) return '관성'; // 나를 극함
  return '인성'; // 나를 생함
}

// ── 당사주 12성 ─────────────────────────────────────────────
export const DANG_STARS = [
  { name: '천귀성', hanja: '天貴', score: 92, desc: '귀인이 곁에 서는 별이라, 윗사람의 인정과 뜻밖의 도움이 따라요' },
  { name: '천액성', hanja: '天厄', score: 30, desc: '작은 액이 스치는 별이라, 서두르면 실수가 생기고 늦추면 무사히 지나가요' },
  { name: '천권성', hanja: '天權', score: 82, desc: '권세의 별이라, 오늘 내린 판단에 사람들이 힘을 실어 줘요' },
  { name: '천파성', hanja: '天破', score: 28, desc: '깨짐의 별이라, 물건·약속·관계가 틀어지지 않게 한 번 더 확인해야 해요' },
  { name: '천간성', hanja: '天奸', score: 60, desc: '재치의 별이라, 머리를 쓰면 길이 열리지만 잔꾀는 들통이 나요' },
  { name: '천문성', hanja: '天文', score: 80, desc: '문서와 학문의 별이라, 계약·공부·글로 남기는 일에 힘이 실려요' },
  { name: '천복성', hanja: '天福', score: 95, desc: '복록의 별이라, 먹을 복과 재물 복이 함께 들어오는 날이에요' },
  { name: '천역성', hanja: '天驛', score: 58, desc: '역마의 별이라, 몸이 바쁘게 움직일수록 기회가 따라와요' },
  { name: '천고성', hanja: '天孤', score: 40, desc: '고독의 별이라, 마음이 쓸쓸해도 혼자만의 시간이 오히려 답을 줘요' },
  { name: '천인성', hanja: '天刃', score: 42, desc: '칼날의 별이라, 말 한마디가 칼이 될 수 있으니 날 선 표현을 삼가야 해요' },
  { name: '천예성', hanja: '天藝', score: 76, desc: '재주의 별이라, 손재주와 감각이 빛나고 사람의 마음을 끌어당겨요' },
  { name: '천수성', hanja: '天壽', score: 78, desc: '장수의 별이라, 몸과 마음이 안정되고 오래 갈 인연이 다져져요' },
];

// ── 주역 64괘 (매화역수) ────────────────────────────────────
// 선천팔괘 수: 1乾 2兌 3離 4震 5巽 6坎 7艮 8坤  (효: 아래→위, 1=양)
export const TRIGRAMS = {
  1: { ch: '乾', ko: '건', img: '하늘', lines: [1, 1, 1] },
  2: { ch: '兌', ko: '태', img: '연못', lines: [1, 1, 0] },
  3: { ch: '離', ko: '리', img: '불', lines: [1, 0, 1] },
  4: { ch: '震', ko: '진', img: '우레', lines: [1, 0, 0] },
  5: { ch: '巽', ko: '손', img: '바람', lines: [0, 1, 1] },
  6: { ch: '坎', ko: '감', img: '물', lines: [0, 1, 0] },
  7: { ch: '艮', ko: '간', img: '산', lines: [0, 0, 1] },
  8: { ch: '坤', ko: '곤', img: '땅', lines: [0, 0, 0] },
};
const TRI_BY_CH = Object.fromEntries(Object.entries(TRIGRAMS).map(([k, v]) => [v.ch, Number(k)]));

// [번호, 한자명, 한글명, 상괘, 하괘, 점수(1~5), 키워드, 오늘의 뜻]
const HEX_RAW = [
  [1, '乾爲天', '중천건', '乾', '乾', 5, '강건한 시작', '하늘의 기운이 꽉 찼으니 미뤄 둔 일을 시작하기에 더없이 좋아요'],
  [2, '坤爲地', '중지곤', '坤', '坤', 4, '포용과 순응', '앞장서기보다 받쳐 줄 때 더 큰 몫이 돌아와요'],
  [3, '水雷屯', '수뢰둔', '坎', '震', 2, '어려운 출발', '첫걸음이 버벅이지만 싹은 이미 텄으니 조급해하지 마세요'],
  [4, '山水蒙', '산수몽', '艮', '坎', 2, '배움의 때', '모르는 것을 아는 척하지 말고 물어보는 쪽이 이겨요'],
  [5, '水天需', '수천수', '坎', '乾', 3, '때를 기다림', '비가 오기 전 구름이 모이는 형국이니 기다림이 곧 전략이에요'],
  [6, '天水訟', '천수송', '乾', '坎', 1, '다툼', '옳고 그름을 끝까지 따지면 이겨도 잃는 것이 생겨요'],
  [7, '地水師', '지수사', '坤', '坎', 3, '무리를 이끎', '혼자보다 사람을 모아 질서 있게 움직일 때 힘이 나요'],
  [8, '水地比', '수지비', '坎', '坤', 4, '화합', '먼저 손 내미는 쪽에 사람이 모이는 날이에요'],
  [9, '風天小畜', '풍천소축', '巽', '乾', 3, '작은 축적', '큰 비는 아직이나 작은 것이 차곡차곡 쌓이고 있어요'],
  [10, '天澤履', '천택리', '乾', '兌', 3, '조심스러운 걸음', '호랑이 꼬리를 밟아도 예의를 지키면 물리지 않아요'],
  [11, '地天泰', '지천태', '坤', '乾', 5, '형통', '하늘과 땅이 통하니 막혔던 일이 술술 풀려요'],
  [12, '天地否', '천지비', '乾', '坤', 1, '막힘', '소통이 막히는 날이니 큰 결정은 하루 미루는 것이 상책이에요'],
  [13, '天火同人', '천화동인', '乾', '離', 4, '뜻을 같이함', '같은 뜻을 가진 사람과 손잡으면 일이 두 배로 빨라져요'],
  [14, '火天大有', '화천대유', '離', '乾', 5, '크게 가짐', '해가 하늘 높이 떴으니 가진 것이 넉넉해지는 대길의 괘예요'],
  [15, '地山謙', '지산겸', '坤', '艮', 4, '겸손', '자신을 낮출수록 오히려 높아지는 날이에요'],
  [16, '雷地豫', '뇌지예', '震', '坤', 4, '즐거움과 준비', '미리 준비한 사람에게 즐거운 소식이 와요'],
  [17, '澤雷隨', '택뢰수', '兌', '震', 4, '따름', '고집을 내려놓고 흐름을 따르면 길이 저절로 열려요'],
  [18, '山風蠱', '산풍고', '艮', '巽', 2, '묵은 일 정리', '오래 묵혀 둔 문제를 손보기 좋은 날이에요'],
  [19, '地澤臨', '지택림', '坤', '兌', 4, '다가옴', '좋은 기운이 가까이 다가오니 마중 나가세요'],
  [20, '風地觀', '풍지관', '巽', '坤', 3, '살펴봄', '행동보다 관찰이 이득인 날, 한발 물러서 보면 답이 보여요'],
  [21, '火雷噬嗑', '화뢰서합', '離', '震', 2, '장애를 깨물어 끊음', '걸리적거리는 문제는 단호하게 끊어야 풀려요'],
  [22, '山火賁', '산화비', '艮', '離', 3, '꾸밈', '겉모습을 다듬으면 기회가 따르지만 속이 비면 안 돼요'],
  [23, '山地剝', '산지박', '艮', '坤', 1, '깎여 나감', '무리하게 버티기보다 지킬 것만 지키는 날이에요'],
  [24, '地雷復', '지뢰복', '坤', '震', 4, '회복', '바닥을 찍고 다시 올라오는 기운, 되돌아오는 것이 있어요'],
  [25, '天雷無妄', '천뢰무망', '乾', '震', 3, '순리', '꾀를 부리지 않고 정직하게 가면 탈이 없어요'],
  [26, '山天大畜', '산천대축', '艮', '乾', 4, '크게 쌓음', '힘을 비축할수록 나중에 크게 쓰여요'],
  [27, '山雷頤', '산뢰이', '艮', '震', 3, '기름과 절제', '입으로 들어가는 것과 나가는 말을 모두 조심하세요'],
  [28, '澤風大過', '택풍대과', '兌', '巽', 2, '지나침', '짐이 너무 무거우니 덜어낼 것을 먼저 덜어내세요'],
  [29, '坎爲水', '중수감', '坎', '坎', 1, '거듭된 험난', '물이 겹친 형국이나 마음의 중심만 지키면 건너가요'],
  [30, '離爲火', '중화리', '離', '離', 4, '밝음', '밝은 기운이 겹치니 드러내고 알리는 일에 길해요'],
  [31, '澤山咸', '택산함', '兌', '艮', 4, '감응', '마음이 통하는 인연이 닿는 괘예요'],
  [32, '雷風恒', '뇌풍항', '震', '巽', 4, '꾸준함', '하던 것을 꾸준히 하는 것이 가장 큰 행운이에요'],
  [33, '天山遯', '천산돈', '乾', '艮', 2, '물러섬', '물러서야 할 때를 아는 것이 지혜인 날이에요'],
  [34, '雷天大壯', '뇌천대장', '震', '乾', 4, '왕성함', '힘이 넘치는 날이나 들이받기보다 방향을 잡아야 해요'],
  [35, '火地晉', '화지진', '離', '坤', 5, '나아감', '해가 땅 위로 떠오르니 승진·인정·전진의 기운이에요'],
  [36, '地火明夷', '지화명이', '坤', '離', 1, '빛을 감춤', '실력을 감추고 때를 기다리면 화를 피해요'],
  [37, '風火家人', '풍화가인', '巽', '離', 4, '가정', '집안과 가까운 사람을 챙길 때 복이 들어와요'],
  [38, '火澤睽', '화택규', '離', '兌', 2, '어긋남', '생각이 엇갈리기 쉬우니 작은 일부터 맞춰 가세요'],
  [39, '水山蹇', '수산건', '坎', '艮', 1, '절름거림', '앞이 막히면 돌아가는 길이 정답이에요'],
  [40, '雷水解', '뇌수해', '震', '坎', 4, '풀림', '얽혀 있던 일이 봄눈 녹듯 풀려요'],
  [41, '山澤損', '산택손', '艮', '兌', 3, '덜어냄', '먼저 덜어내야 나중에 더해지는 이치예요'],
  [42, '風雷益', '풍뢰익', '巽', '震', 5, '더함', '보탬이 들어오는 대길의 괘, 움직이면 이익이 따라요'],
  [43, '澤天夬', '택천쾌', '兌', '乾', 3, '결단', '미루던 결단을 내리되 감정적으로 끊지는 마세요'],
  [44, '天風姤', '천풍구', '乾', '巽', 2, '뜻밖의 만남', '갑작스러운 만남이 있으나 쉽게 마음을 다 주지는 마세요'],
  [45, '澤地萃', '택지췌', '兌', '坤', 4, '모임', '사람이 모이고 재물이 모이는 날이에요'],
  [46, '地風升', '지풍승', '坤', '巽', 5, '상승', '나무가 땅을 뚫고 오르듯 한 계단씩 올라가는 기운이에요'],
  [47, '澤水困', '택수곤', '兌', '坎', 1, '곤궁', '말보다 행동으로 보여 줄 때 곤란을 벗어나요'],
  [48, '水風井', '수풍정', '坎', '巽', 3, '우물', '근본을 다지는 날, 기본에 충실하면 물이 마르지 않아요'],
  [49, '澤火革', '택화혁', '兌', '離', 3, '변혁', '낡은 방식을 바꾸기 좋은 날이에요'],
  [50, '火風鼎', '화풍정', '離', '巽', 5, '새 그릇', '솥이 바로 서듯 새 자리와 안정이 찾아와요'],
  [51, '震爲雷', '중뢰진', '震', '震', 2, '놀람', '깜짝 놀랄 일이 있어도 웃으며 넘기면 오히려 복이 돼요'],
  [52, '艮爲山', '중산간', '艮', '艮', 3, '멈춤', '멈출 줄 아는 것이 오늘의 힘이에요'],
  [53, '風山漸', '풍산점', '巽', '艮', 4, '점진', '천천히, 그러나 확실하게 나아가는 날이에요'],
  [54, '雷澤歸妹', '뇌택귀매', '震', '兌', 2, '서두름 경계', '순서를 건너뛰면 탈이 나니 차례를 지키세요'],
  [55, '雷火豐', '뇌화풍', '震', '離', 4, '풍성함', '가득 찬 기운이나 정오의 해처럼 기울 때도 대비하세요'],
  [56, '火山旅', '화산려', '離', '艮', 2, '나그네', '낯선 곳·낯선 사람 앞에서는 겸손이 최고의 무기예요'],
  [57, '巽爲風', '중풍손', '巽', '巽', 3, '유연함', '바람처럼 부드럽게 스며들면 어디든 들어갈 수 있어요'],
  [58, '兌爲澤', '중택태', '兌', '兌', 4, '기쁨', '웃음과 대화 속에서 좋은 일이 생겨요'],
  [59, '風水渙', '풍수환', '巽', '坎', 3, '흩어짐', '맺힌 마음을 흩어 버리면 새 흐름이 들어와요'],
  [60, '水澤節', '수택절', '坎', '兌', 3, '절제', '적당한 선에서 멈추는 것이 이득인 날이에요'],
  [61, '風澤中孚', '풍택중부', '巽', '兌', 4, '믿음', '진심이 통하는 날, 믿음이 곧 재산이에요'],
  [62, '雷山小過', '뇌산소과', '震', '艮', 3, '작은 일에 충실', '큰일보다 작은 일을 챙길 때 탈이 없어요'],
  [63, '水火旣濟', '수화기제', '坎', '離', 4, '이미 이룸', '이룬 것을 지키는 데 마음을 쓰면 오래 가요'],
  [64, '火水未濟', '화수미제', '離', '坎', 3, '아직 이루지 못함', '마지막 한 걸음이 남았으니 끝까지 긴장을 놓지 마세요'],
];

export const HEXAGRAMS = HEX_RAW.map(([no, hanja, ko, up, lo, score, keyword, msg]) => ({
  no, hanja, ko, upper: TRI_BY_CH[up], lower: TRI_BY_CH[lo], score, keyword, msg,
}));

const HEX_BY_PAIR = Object.fromEntries(HEXAGRAMS.map((h) => [`${h.upper}-${h.lower}`, h]));
const trigramFromLines = (l) =>
  Number(Object.entries(TRIGRAMS).find(([, t]) => t.lines.join('') === l.join(''))[0]);

export function hexagramLines(h) {
  return [...TRIGRAMS[h.lower].lines, ...TRIGRAMS[h.upper].lines]; // 아래→위 6효
}

/** 매화역수: 상괘·하괘·동효 → 본괘/변괘 */
export function castHexagram(upperNum, lowerNum, movingLine /* 1~6 */) {
  const up = mod(upperNum - 1, 8) + 1;
  const lo = mod(lowerNum - 1, 8) + 1;
  const base = HEX_BY_PAIR[`${up}-${lo}`];
  const lines = hexagramLines(base);
  const changed = [...lines];
  changed[movingLine - 1] ^= 1;
  const next = HEX_BY_PAIR[`${trigramFromLines(changed.slice(3))}-${trigramFromLines(changed.slice(0, 3))}`];
  return { base, changed: next, movingLine, baseLines: lines, changedLines: changed };
}

const digitSum = (n) => String(n).split('').reduce((a, c) => a + Number(c), 0);

// ── 시드 난수 (같은 사람·같은 날 → 같은 결과) ────────────────
export function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo = 12, hi = 98) => Math.max(lo, Math.min(hi, Math.round(v)));

// ── 메인 산출 ───────────────────────────────────────────────
/**
 * 하루 운세 계산
 * - 명리 70%: 원국의 신강·신약으로 용신(필요한 기운)을 정하고, 그날 일진·월운·세운이
 *   용신을 돕는지, 원국 지지와 합·충·형·원진을 이루는지, 12운성·공망·천간합을 따진다.
 * - 당사주 15%, 주역 15%: 보조 지표
 * 무작위 요소는 없다. 같은 입력이면 언제나 같은 결과.
 */
export function computeFortune(input, today = new Date()) {
  const natal = natalChart(input);
  const { solar, lunar, pillars, hour } = natal;
  const an = analyzeChart(pillars);

  // 오늘 (그날 정오 KST 기준, 오늘이면 지금 시각)
  const ty = today.getFullYear(), tm = today.getMonth() + 1, td = today.getDate();
  const now = new Date();
  const isNow = ty === now.getFullYear() && tm === now.getMonth() + 1 && td === now.getDate();
  const todayPillars = fourPillars(ty, tm, td, null, isNow ? now.getTime() : Date.UTC(ty, tm - 1, td, 3));
  const todayStem = todayPillars.day.stem, todayBranch = todayPillars.day.branch;
  const todayLunar = solarToLunar(ty, tm, td);

  const zodiac = pillars.year.branch;
  const rel = branchRelation(zodiac, todayBranch);
  const god = tenGod(pillars.day.stem, todayStem);
  const selfEl = STEM_EL[pillars.day.stem];

  // 1) 명리
  const day = evaluateDay(pillars, an, todayPillars);
  const myeong = clamp(60 + day.raw, 8, 99);

  // 2) 당사주
  const lunarYearBranch = mod(lunar.year - 4, 12);
  const monthStar = mod(lunarYearBranch + lunar.month - 1, 12);
  const star = DANG_STARS[mod(monthStar + todayBranch, 12)];
  const birthStar = DANG_STARS[monthStar];
  const dang = clamp(star.score * 0.75 + birthStar.score * 0.25);

  // 3) 주역(매화역수)
  const ymd = solar.year * 10000 + solar.month * 100 + solar.day;
  const ds = digitSum(ymd);
  const lowerNum = solar.year + solar.month + solar.day + (hour === null ? 0 : hour + 1);
  const moving = mod(ds + (hour === null ? 0 : hour + 1) + ty + tm + td, 6) + 1;
  const iching = castHexagram(ds, lowerNum, moving);
  const juyeok = clamp(((iching.base.score + iching.changed.score * 2) / 3) * 18 + 6);

  const total = clamp(myeong * 0.7 + dang * 0.15 + juyeok * 0.15, 10, 98);

  // 4) 분야별: 그날 들어온 십성이 나에게 필요한 기운인지에 따라 가감
  const categories = categoryScores(total, pillars, an, todayPillars, day, input.gender);

  return {
    input, solar, lunar, hour, pillars, natal,
    today: { y: ty, m: tm, d: td, stem: todayStem, branch: todayBranch, pillars: todayPillars, lunar: todayLunar },
    zodiac, rel, god, selfEl,
    analysis: an, basis: day.notes, stage: day.stage, rels: day.rels,
    star, birthStar, iching,
    scores: { myeong, dang, juyeok, total },
    categories,
    seed: `${ymd}-${hour}-${ty}${tm}${td}`,
  };
}

export { STEM_EL, BRANCH_EL, mod };

// ═════════════════════════════════════════════════════════════
//  만세력 상세: 십성 · 지장간 · 12운성 · 12신살 · 공망 · 오행 분포 · 대운
// ═════════════════════════════════════════════════════════════

/** 지장간 (여기·중기·본기 순, 마지막이 본기) — 천간 인덱스 */
export const HIDDEN_STEMS = [
  [8, 9], [9, 7, 5], [4, 2, 0], [0, 1], [1, 9, 4], [4, 6, 2],
  [2, 5, 3], [3, 1, 5], [4, 8, 6], [6, 7], [7, 3, 4], [4, 0, 8],
];

/** 십성 이름: 일간 기준 다른 천간 */
export function tenGodName(self, other) {
  const g = tenGod(self, other);
  const same = self % 2 === other % 2; // 음양이 같으면 편, 다르면 정
  return {
    비겁: same ? '비견' : '겁재',
    식상: same ? '식신' : '상관',
    재성: same ? '편재' : '정재',
    관성: same ? '편관' : '정관',
    인성: same ? '편인' : '정인',
  }[g];
}

export const TWELVE_STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
const STAGE_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 각 천간의 장생 지지
/** 12운성: 일간이 각 지지에서 갖는 기운 */
export function twelveStage(stem, branch) {
  const s = STAGE_START[stem];
  return TWELVE_STAGES[stem % 2 === 0 ? mod(branch - s, 12) : mod(s - branch, 12)];
}

export const TWELVE_SINSAL = ['겁살', '재살', '천살', '지살', '연살', '월살', '망신', '장성', '반안', '역마', '육해', '화개'];
/** 12신살: 연지 기준 */
export function twelveSinsal(yearBranch, branch) {
  const saengji = { 0: 8, 1: 5, 2: 2, 3: 11 }[yearBranch % 4];
  return TWELVE_SINSAL[mod(branch - (saengji - 3), 12)];
}

/** 공망: 일주가 속한 순(旬)에서 빠진 두 지지 */
export function gongmang(dayStem, dayBranch) {
  const idx = [...Array(60).keys()].find((i) => i % 10 === dayStem && i % 12 === dayBranch);
  const startBranch = (idx - (idx % 10)) % 12;
  return [mod(startBranch + 10, 12), mod(startBranch + 11, 12)];
}

/** 오행 분포 (천간·지지 8글자, 시 모름이면 6글자) */
export function elementCount(pillars) {
  const c = [0, 0, 0, 0, 0];
  ['year', 'month', 'day', 'hour'].forEach((k) => {
    const p = pillars[k];
    if (!p) return;
    c[STEM_EL[p.stem]] += 1;
    c[BRANCH_EL[p.branch]] += 1;
  });
  return c;
}

/** 대운: 성별·연간 음양으로 순행/역행, 출생~절입까지 날수 ÷ 3 = 대운수 (절입은 실제 시각) */
export function daewoon(natal, gender) {
  if (gender !== 'M' && gender !== 'F') return null;
  const { pillars, moment } = natal;
  const yangYear = pillars.year.stem % 2 === 0;
  const forward = (yangYear && gender === 'M') || (!yangYear && gender === 'F');
  const { prev, next } = jeolAround(moment);
  const days = Math.abs((forward ? next : prev) - moment) / 86400000;
  const exactYears = days / 3;
  const start = Math.max(1, Math.round(exactYears));
  const mIdx = [...Array(60).keys()].find((i) => i % 10 === pillars.month.stem && i % 12 === pillars.month.branch);
  return {
    forward,
    start,
    exact: { years: Math.floor(exactYears), months: Math.round((exactYears % 1) * 12) },
    list: Array.from({ length: 10 }, (_, i) => {
      const gi = mod(mIdx + (forward ? i + 1 : -(i + 1)), 60);
      return { age: start + i * 10, stem: gi % 10, branch: gi % 12 };
    }),
  };
}

/** 시각(HH:MM) → 시진 지지 (한국 30분 보정) */
export function hourToBranch(hhmm) {
  if (!hhmm) return null;
  const [h, mi] = hhmm.split(':').map(Number);
  const mins = mod(h * 60 + mi - (23 * 60 + 30), 1440);
  return Math.floor(mins / 120);
}

/** 만세력 한 번에 계산 */
export function manseryeok(input) {
  let natal;
  try { natal = natalChart(input); } catch { return null; }
  const { pillars, solar } = natal;
  const self = pillars.day.stem;
  const cols = ['hour', 'day', 'month', 'year'].map((key) => {
    const p = pillars[key];
    if (!p) return { key, empty: true };
    return {
      key,
      ...p,
      stemGod: key === 'day' ? '본원' : tenGodName(self, p.stem),
      branchGod: tenGodName(self, HIDDEN_STEMS[p.branch].at(-1)),
      hidden: HIDDEN_STEMS[p.branch],
      stage: twelveStage(self, p.branch),
      sinsal: twelveSinsal(pillars.year.branch, p.branch),
    };
  });
  return {
    solar,
    natal,
    pillars,
    cols,
    gongmang: gongmang(pillars.day.stem, pillars.day.branch),
    elements: elementCount(pillars),
    analysis: analyzeChart(pillars),
    daewoon: daewoon(natal, input.gender),
  };
}

// ═════════════════════════════════════════════════════════════
//  용신 분석과 일운 평가
// ═════════════════════════════════════════════════════════════
export const GOD_OF = (selfEl, el) => ['비겁', '식상', '재성', '관성', '인성'][mod(el - selfEl, 5)];
const mainEl = (branch) => STEM_EL[HIDDEN_STEMS[branch].at(-1)];

/** 신강·신약 판단과 오행별 길흉 가중치(fav: -1 기신 ~ +1 용신) */
export function analyzeChart(pillars) {
  const self = pillars.day.stem;
  const se = STEM_EL[self];
  const w = [0, 0, 0, 0, 0];
  const STEM_W = { year: 1, month: 1.2, day: 0, hour: 1 };
  const BR_W = { year: 1, month: 3, day: 1.5, hour: 1.1 };
  ['year', 'month', 'day', 'hour'].forEach((k) => {
    const p = pillars[k];
    if (!p) return;
    w[STEM_EL[p.stem]] += STEM_W[k];
    const hs = HIDDEN_STEMS[p.branch];
    const ws = hs.length === 2 ? [0.3, 0.7] : [0.1, 0.2, 0.7];
    hs.forEach((st, i) => { w[STEM_EL[st]] += BR_W[k] * ws[i]; });
  });
  const total = w.reduce((a, b) => a + b, 0);
  const support = w[se] + w[mod(se - 1, 5)];
  const ratio = support / total;
  const strong = ratio >= 0.46;
  const label = ratio >= 0.58 ? '신강' : ratio >= 0.46 ? '약간 신강' : ratio >= 0.36 ? '약간 신약' : '신약';
  const intensity = Math.min(1, Math.max(0.4, 0.4 + Math.abs(ratio - 0.46) * 3));
  const base = strong
    ? { 비겁: -1, 인성: -0.8, 식상: 0.7, 재성: 1, 관성: 0.8 }
    : { 비겁: 0.8, 인성: 1, 식상: -0.5, 재성: -0.8, 관성: -1 };
  const fav = [0, 1, 2, 3, 4].map((el) => base[GOD_OF(se, el)] * intensity);
  // 조후: 겨울 생은 불, 여름 생은 물이 필요
  const mb = pillars.month.branch;
  let johu = null;
  if ([11, 0, 1].includes(mb)) { fav[1] += 0.45; fav[4] -= 0.25; johu = 1; }
  if ([5, 6, 7].includes(mb)) { fav[4] += 0.45; fav[1] -= 0.25; johu = 4; }
  const counts = elementCount(pillars);
  counts.forEach((c, el) => { if (c === 0) fav[el] += 0.1; });
  for (let i = 0; i < 5; i++) fav[i] = Math.max(-1, Math.min(1, Math.round(fav[i] * 100) / 100));
  const order = [0, 1, 2, 3, 4].sort((a, b) => fav[b] - fav[a]);
  const deukryeong = [se, mod(se - 1, 5)].includes(mainEl(mb));
  return {
    ratio: Math.round(ratio * 100) / 100, label, strong, fav, weights: w.map((x) => Math.round(x * 10) / 10),
    yongsin: order[0], heesin: order[1], gisin: order[4], gusin: order[3], johu, deukryeong,
  };
}

const CHEONGAN_HAP = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];
const HYEONG = [[2, 5], [5, 8], [2, 8], [1, 10], [10, 7], [1, 7], [0, 3]];
const SELF_HYEONG = [4, 6, 9, 11];
const STAGE_W = { 장생: 4, 목욕: 0, 관대: 3, 건록: 5, 제왕: 4, 쇠: 0, 병: -3, 사: -4, 묘: -2, 절: -4, 태: 0, 양: 1 };
const POS_KO = { day: '일지(나의 자리)', month: '월지(사회·부모 자리)', year: '연지(띠)', hour: '시지(자녀·미래 자리)' };
const ELK = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
const EL_KO1 = ['목', '화', '토', '금', '수'];
const EL_HJ = ['木', '火', '土', '金', '水'];
const eun = (w) => { const c = w.charCodeAt(w.length - 1); return w + ((c - 0xac00) % 28 ? '은' : '는'); };
const favWord = (f) => (f >= 0.5 ? '꼭 필요한 기운(용신)' : f > 0.1 ? '도움이 되는 기운' : f <= -0.5 ? '부담이 되는 기운(기신)' : f < -0.1 ? '조금 부담되는 기운' : '무난한 기운');

/** 그날의 기운이 내 원국에 미치는 영향 (+/-) */
export function evaluateDay(pillars, an, today) {
  const { fav } = an;
  const self = pillars.day.stem;
  const t = today.day;
  const notes = [];
  let s = 0;

  const se = STEM_EL[t.stem];
  const be = mainEl(t.branch);
  const vStem = fav[se] * 13;
  const vBranch = fav[be] * 10;
  s += vStem + vBranch;
  notes.push({ v: vStem, text: `오늘 천간 ${STEMS_KO[t.stem]}${EL_KO1[se]}(${STEMS[t.stem]}${EL_HJ[se]})${eun(EL_KO1[se]).slice(-1)} 나에게 ${favWord(fav[se])}이에요.` });
  if (be !== se) notes.push({ v: vBranch, text: `오늘 지지 ${BRANCHES_KO[t.branch]}(${BRANCHES[t.branch]})의 ${ELK[be]} 기운은 ${favWord(fav[be])}이에요.` });
  // 이번 달·올해 흐름 (배경)
  const vMonth = fav[STEM_EL[today.month.stem]] * 3 + fav[mainEl(today.month.branch)] * 2;
  const vYear = fav[STEM_EL[today.year.stem]] * 1.5 + fav[mainEl(today.year.branch)] * 1;
  s += vMonth + vYear;
  if (Math.abs(vMonth + vYear) >= 2.5) {
    notes.push({ v: vMonth + vYear, text: `이번 달과 올해 흐름이 나에게 ${vMonth + vYear > 0 ? '우호적이라 바탕이 든든해요' : '빡빡한 편이라 무리하지 않는 게 좋아요'}.` });
  }

  // 원국 지지와의 관계
  const W = { day: 1, month: 0.8, year: 0.6, hour: 0.5 };
  const rels = {};
  ['day', 'month', 'year', 'hour'].forEach((k) => {
    const p = pillars[k];
    if (!p) return;
    const nb = p.branch;
    const r = branchRelation(nb, t.branch);
    rels[k] = r;
    const natalFav = fav[mainEl(nb)];
    if (r.includes('충')) {
      const v = -8 * W[k] * (natalFav >= 0 ? 1 : -0.4);
      s += v;
      notes.push({ v, text: v < 0 ? `오늘 일진이 ${POS_KO[k]}와 충(沖)을 이뤄 흔들림이 생기기 쉬워요.` : `오늘 일진이 부담되던 ${POS_KO[k]}를 충(沖)으로 밀어내 오히려 시원해져요.` });
    }
    if (r.includes('육합')) { const v = 5 * W[k]; s += v; notes.push({ v, text: `오늘 일진이 ${POS_KO[k]}와 육합(六合)으로 손을 잡아요.` }); }
    else if (r.includes('삼합')) { const v = 3 * W[k]; s += v; notes.push({ v, text: `오늘 일진이 ${POS_KO[k]}와 삼합(三合)을 이뤄 힘을 보태요.` }); }
    if (r.includes('원진')) { const v = -4 * W[k]; s += v; notes.push({ v, text: `${POS_KO[k]}와 원진(怨嗔)이라 괜한 오해가 생기기 쉬워요.` }); }
    if (r.includes('해') && !r.includes('원진')) { const v = -2 * W[k]; s += v; if (k === 'day') notes.push({ v, text: '일지와 해(害)의 관계라 작은 서운함이 생길 수 있어요.' }); }
    const hy = inPairs(HYEONG, nb, t.branch) || (nb === t.branch && SELF_HYEONG.includes(nb));
    if (hy) { const v = -3 * W[k]; s += v; notes.push({ v, text: `${POS_KO[k]}와 형(刑)이 걸려 말다툼·실수를 조심해요.` }); }
  });

  // 천간합
  const hap = CHEONGAN_HAP.some(([a, b]) => (a === self && b === t.stem) || (b === self && a === t.stem));
  if (hap) { s += 4; notes.push({ v: 4, text: '오늘 천간이 내 일간과 천간합(天干合)을 이뤄 인연과 협력이 붙어요.' }); }

  // 12운성
  const stage = twelveStage(self, t.branch);
  const vs = STAGE_W[stage];
  s += vs;
  if (Math.abs(vs) >= 3) notes.push({ v: vs, text: `내 일간이 오늘 지지에서 ${stage}(12운성)이라 기운이 ${vs > 0 ? '살아나요' : '가라앉아요'}.` });

  // 공망
  if (gongmang(pillars.day.stem, pillars.day.branch).includes(t.branch)) {
    s -= 4;
    notes.push({ v: -4, text: '오늘 지지가 내 공망(空亡)이라 기대만큼 채워지지 않을 수 있어요.' });
  }

  notes.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  return { raw: s, notes, stage, rels, hap };
}

/** 분야별 점수: 그날 들어온 십성 × 그 기운의 길흉 */
function categoryScores(total, pillars, an, today, day, gender) {
  const se = STEM_EL[pillars.day.stem];
  const t = today.day;
  const present = [
    { g: GOD_OF(se, STEM_EL[t.stem]), el: STEM_EL[t.stem], w: 1 },
    { g: GOD_OF(se, mainEl(t.branch)), el: mainEl(t.branch), w: 0.7 },
  ];
  const love = gender === 'M' ? { 재성: 1, 식상: 0.4, 관성: 0.2 } : gender === 'F' ? { 관성: 1, 식상: 0.4, 재성: 0.2 } : { 재성: 0.6, 관성: 0.6, 식상: 0.4 };
  const REL = {
    재물: { 재성: 1, 식상: 0.5, 비겁: -0.6 },
    사업: { 관성: 1, 인성: 0.6, 재성: 0.3, 식상: -0.2 },
    애정: love,
    건강: { 인성: 0.8, 비겁: 0.6, 관성: -0.6, 재성: -0.2 },
  };
  const dayRel = day.rels.day || [];
  return ['재물', '애정', '건강', '사업'].map((key) => {
    let adj = 0;
    present.forEach(({ g, el, w }) => {
      const r = REL[key][g] || 0;
      const f = an.fav[el];
      if (r > 0) adj += w * r * (5 + 11 * f);
      else if (r < 0) adj += w * r * (8 - 6 * f);
    });
    if (key === '애정') {
      if (day.hap) adj += 5;
      if (dayRel.includes('육합')) adj += 4;
      if (dayRel.includes('원진')) adj -= 5;
      if (dayRel.includes('충')) adj -= 4;
    }
    if (key === '건강') {
      if (dayRel.includes('충')) adj -= 6;
      if (['병', '사', '절'].includes(day.stage)) adj -= 4;
      if (['건록', '제왕', '장생'].includes(day.stage)) adj += 4;
    }
    return { key, score: clamp(total + adj * 0.9, 12, 98) };
  });
}

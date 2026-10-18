// 만세력 "나는 어떤 사람일까" — 일간·십성·오행·신살·12운성을 재미있게 풀어 주는 글
import {
  ANIMALS, BRANCHES, BRANCHES_KO, ELEMENTS, GOD_OF, HIDDEN_STEMS, STEMS, STEMS_KO,
  STEM_EL, BRANCH_EL, mod, twelveStage, twelveSinsal,
} from './saju.js';

const EL_NAME = ['나무', '불', '흙', '쇠', '물'];
const GODS = ['비겁', '식상', '재성', '관성', '인성'];

// ── 일간별 재미 요소 ────────────────────────────────────────
const STEM_FUN = [
  { catch: '한번 정하면 끝까지 가는 사람', heard: ['고집 세다', '믿음직하다', '리더 같다'], job: '기획, 교육, 조직을 이끄는 일', love: '돌아가지 않고 직진해요. 표현은 서툴러도 책임은 끝까지 져요.', stress: '뜻대로 안 풀릴 때 답답해해요. 몸을 움직이면 금방 풀려요.' },
  { catch: '어디에 두어도 살아남는 사람', heard: ['눈치 빠르다', '사람 좋다', '은근 세다'], job: '영업, 상담, 디자인, 사람을 잇는 일', love: '상대에 맞춰 주는 배려형이지만 속으로는 꼼꼼히 재 봐요.', stress: '거절을 못 해 쌓여요. 혼자 쉬는 시간이 꼭 필요해요.' },
  { catch: '방에 들어서면 분위기가 밝아지는 사람', heard: ['밝다', '화끈하다', '목소리 크다'], job: '방송, 영업, 행사, 요식업처럼 드러나는 일', love: '금방 뜨거워지고 표현도 확실해요. 식는 것도 빨라요.', stress: '무시당했다고 느낄 때 폭발해요. 바람 쐬고 오면 괜찮아져요.' },
  { catch: '조용히 곁을 지켜 주는 사람', heard: ['섬세하다', '따뜻하다', '속을 모르겠다'], job: '연구, 상담, 예술, 돌보는 일', love: '오래 마음에 담아 두고 깊게 사랑해요.', stress: '혼자 삭이다 지쳐요. 말로 꺼내면 한결 가벼워져요.' },
  { catch: '모두가 기대는 큰 바위 같은 사람', heard: ['든든하다', '느긋하다', '말이 없다'], job: '부동산, 건설, 공공기관, 관리하는 일', love: '표현은 적어도 묵묵히 지켜 주는 쪽이에요.', stress: '쌓아 두다 한 번에 터져요. 조금씩 미리 말해 주세요.' },
  { catch: '남을 키워 내는 데 재주가 있는 사람', heard: ['꼼꼼하다', '잘 챙겨 준다', '걱정이 많다'], job: '회계, 교육, 요식업, 살림을 꾸리는 일', love: '세심하게 챙기며 사랑을 표현해요.', stress: '걱정이 많아져요. 할 일을 적어 두면 머리가 맑아져요.' },
  { catch: '맺고 끊음이 분명한 사람', heard: ['똑 부러진다', '무섭다', '의리 있다'], job: '군경, 스포츠, 제조, 법무처럼 기준이 분명한 일', love: '한번 정하면 흔들리지 않는 직진형이에요.', stress: '자존심 상할 때 힘들어요. 운동으로 푸는 게 잘 맞아요.' },
  { catch: '작은 것까지 예쁘게 다듬는 사람', heard: ['깔끔하다', '예민하다', '센스 있다'], job: '디자인, 주얼리, 의료, 미용처럼 손끝이 중요한 일', love: '조심스럽게 다가가고, 받은 상처는 오래 기억해요.', stress: '완벽하지 못할 때 괴로워요. 기준을 조금 낮춰도 괜찮아요.' },
  { catch: '생각의 그릇이 바다처럼 넓은 사람', heard: ['생각이 깊다', '자유롭다', '속을 모르겠다'], job: '무역, 기획, 여행, IT처럼 넓게 보는 일', love: '넓게 품어 주지만 구속받는 건 못 견뎌요.', stress: '지루할 때 가장 힘들어요. 새로운 환경이 약이에요.' },
  { catch: '마음을 먼저 알아채는 사람', heard: ['다정하다', '예민하다', '눈치 빠르다'], job: '상담, 교육, 연구, 서비스처럼 마음을 다루는 일', love: '세심하고 헌신적이에요. 작은 변화도 금방 알아채요.', stress: '밤에 생각이 많아져요. 잘 자는 게 최고의 약이에요.' },
];

// ── 십성이 많을 때 / 없을 때 ───────────────────────────────
const GOD_MANY = {
  비겁: { title: '내 힘으로 하고 싶은 마음', desc: '남 밑에 있기보다 내 일을 하고 싶어 해요. 친구와 동료가 많지만, 돈 문제는 섞지 않는 게 좋아요.' },
  식상: { title: '표현하고 만들어 내는 재주', desc: '말솜씨와 손재주가 좋아요. 틀에 갇히는 걸 답답해해서 윗사람과 부딪히기도 해요.' },
  재성: { title: '현실을 꿰뚫는 돈 감각', desc: '숫자와 실속에 밝고 부지런해요. 다만 일을 자꾸 벌여서 몸이 바빠지기 쉬워요.' },
  관성: { title: '책임을 지는 자리', desc: '규칙과 체면을 중요하게 여겨요. 믿음직하지만 혼자 짐을 다 지려다 지쳐요.' },
  인성: { title: '배우고 생각하는 힘', desc: '공부와 문서에 강하고 귀인의 도움이 잘 따라요. 생각이 많아 실행이 늦어질 때가 있어요.' },
};
const GOD_NONE = {
  비겁: '혼자 버티는 힘을 키우면 좋아요. 든든한 동료 한 명이 큰 힘이 돼요.',
  식상: '속으로 삭이는 편이라, 말이나 글로 꺼내는 연습이 도움이 돼요.',
  재성: '돈을 쫓기보다 하고 싶은 일을 할 때 오히려 재물이 따라와요.',
  관성: '남이 정해 준 틀보다 내 방식대로 할 때 더 잘해요.',
  인성: '남의 도움보다 몸으로 부딪혀 배우는 쪽이 빨라요.',
};

// ── 오행 ───────────────────────────────────────────────────
const EL_MANY = [
  '자라고 뻗어 나가려는 힘이 강해요. 새로운 일을 시작할 때 빛나요.',
  '뜨겁고 솔직해요. 사람들 앞에 설 때 에너지가 올라와요.',
  '중심을 잡아 주는 힘이 강해요. 사람들이 자연스럽게 기대요.',
  '칼같이 정리하는 힘이 강해요. 기준이 분명해서 믿음을 줘요.',
  '깊고 유연해요. 상황을 읽고 흐름을 타는 데 능해요.',
];
const EL_NONE = [
  '추진력이 아쉬울 때가 있어요. 초록색과 동쪽, 나무 소품이 도움이 돼요.',
  '표현이 아쉬울 때가 있어요. 붉은색과 남쪽, 따뜻한 것이 도움이 돼요.',
  '중심을 잡아 줄 무언가가 필요해요. 노란색과 흙빛 물건이 도움이 돼요.',
  '맺고 끊기가 어려울 때가 있어요. 흰색과 서쪽, 금속 소품이 도움이 돼요.',
  '여유와 융통성이 아쉬울 때가 있어요. 검정·남색과 북쪽, 물가가 도움이 돼요.',
];

// ── 신살 재미 ──────────────────────────────────────────────
const SINSAL_FUN = {
  연살: { emoji: '💗', title: '도화살', desc: '사람을 끌어당기는 매력이 있어요. 첫인상이 오래 남는 편이에요.' },
  역마: { emoji: '✈️', title: '역마살', desc: '한곳에 오래 있으면 답답해해요. 움직일수록 기회가 따라와요.' },
  화개: { emoji: '🎨', title: '화개살', desc: '예술·공부·종교처럼 깊이 파고드는 세계와 인연이 있어요. 혼자만의 시간이 꼭 필요해요.' },
  장성: { emoji: '🚩', title: '장성살', desc: '무리를 이끄는 자리에 잘 어울려요. 책임을 맡을 때 힘이 나요.' },
  반안: { emoji: '🏅', title: '반안살', desc: '노력한 만큼 자리가 올라가요. 윗사람의 눈에 잘 띄어요.' },
  망신: { emoji: '🙊', title: '망신살', desc: '솔직하고 대담해요. 다만 말이 앞설 때가 있어 한 박자 쉬면 좋아요.' },
  겁살: { emoji: '⚔️', title: '겁살', desc: '위기를 기회로 바꾸는 승부사 기질이 있어요. 보증과 동업은 조심해요.' },
  재살: { emoji: '🧠', title: '재살(수옥살)', desc: '머리를 쓰는 일, 전략 짜는 일에 강해요.' },
  천살: { emoji: '🙏', title: '천살', desc: '뜻밖의 일을 겪을 수 있지만, 겸손할 때 오히려 보호받아요.' },
  지살: { emoji: '🧳', title: '지살', desc: '이사와 새 출발이 잦아요. 활동 범위가 넓어요.' },
  월살: { emoji: '🌙', title: '월살', desc: '꾸준히 돌보면 결실을 맺어요. 체력 관리가 중요해요.' },
  육해: { emoji: '🩹', title: '육해살', desc: '남의 아픔을 잘 알아 돌보는 일에 강해요. 건강 검진을 챙기면 좋아요.' },
};

const STAGE_FUN = {
  장생: '새로 시작할 때 가장 빛나는 타입이에요.',
  목욕: '끼와 매력이 넘치지만 마음이 자주 바뀌는 타입이에요.',
  관대: '도전할 때 신이 나는 타입이에요.',
  건록: '스스로 벌어서 서는 힘이 강한 타입이에요.',
  제왕: '주도권을 쥐면 크게 해내는 타입이에요.',
  쇠: '무리하기보다 지키고 다듬는 데 강한 타입이에요.',
  병: '남의 마음을 잘 알아주는 섬세한 타입이에요.',
  사: '한 가지를 깊이 파고드는 몰입형 타입이에요.',
  묘: '모으고 아끼는 데 재주가 있는 타입이에요.',
  절: '미련 없이 털고 다시 시작하는 타입이에요.',
  태: '아이디어가 샘솟는 구상형 타입이에요.',
  양: '주변의 도움을 잘 받는 복 있는 타입이에요.',
};

/** 만세력 결과 → 재미있는 성격 풀이 */
export function funProfile(m) {
  const { pillars, cols, elements, analysis } = m;
  const self = pillars.day.stem;
  const se = STEM_EL[self];
  const fun = STEM_FUN[self];

  // 십성 분포 (천간 3 + 지지 본기 4, 일간 제외)
  const godCount = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  ['year', 'month', 'day', 'hour'].forEach((k) => {
    const p = pillars[k];
    if (!p) return;
    if (k !== 'day') godCount[GOD_OF(se, STEM_EL[p.stem])] += 1;
    godCount[GOD_OF(se, STEM_EL[HIDDEN_STEMS[p.branch].at(-1)])] += 1;
  });
  const godTotal = Object.values(godCount).reduce((a, b) => a + b, 0) || 1;
  const topGod = GODS.reduce((a, b) => (godCount[b] > godCount[a] ? b : a));
  const noneGods = GODS.filter((g) => godCount[g] === 0);

  // 오행
  const maxEl = Math.max(...elements);
  const topEl = elements.indexOf(maxEl);
  const noneEls = elements.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);

  // 신살 (원국 지지에 있는 것)
  const seen = new Set();
  const stars = [];
  cols.forEach((c) => {
    if (c.empty || seen.has(c.sinsal)) return;
    seen.add(c.sinsal);
    if (SINSAL_FUN[c.sinsal]) stars.push({ ...SINSAL_FUN[c.sinsal], at: { hour: '시지', day: '일지', month: '월지', year: '연지' }[c.key] });
  });

  // 띠 궁합
  const zb = pillars.year.branch;
  const good = [mod(zb + 4, 12), mod(zb + 8, 12), [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2][zb]];
  const care = [mod(zb + 6, 12), [7, 6, 9, 8, 11, 10, 1, 0, 3, 2, 5, 4][zb]];
  const uniq = (arr) => [...new Set(arr)];

  return {
    catchphrase: fun.catch,
    heard: fun.heard,
    job: fun.job,
    love: fun.love,
    stress: fun.stress,
    stage: { name: twelveStage(self, pillars.day.branch), desc: STAGE_FUN[twelveStage(self, pillars.day.branch)] },
    gods: GODS.map((g) => ({ key: g, count: godCount[g], ratio: godCount[g] / godTotal })),
    topGod: { key: topGod, ...GOD_MANY[topGod] },
    noneGods: noneGods.map((g) => ({ key: g, desc: GOD_NONE[g] })),
    element: {
      top: topEl, topName: EL_NAME[topEl], topHanja: ELEMENTS[topEl], topDesc: EL_MANY[topEl],
      none: noneEls.map((i) => ({ el: i, name: EL_NAME[i], hanja: ELEMENTS[i], desc: EL_NONE[i] })),
    },
    stars,
    match: {
      good: uniq(good).map((b) => ANIMALS[b]),
      care: uniq(care).map((b) => ANIMALS[b]),
    },
    balance: analysis,
  };
}

export { EL_NAME, GODS };

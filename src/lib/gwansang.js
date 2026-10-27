// ─────────────────────────────────────────────────────────────
//  관상(마의상법) 분석 — 얼굴 landmark → 측정값 → 유형 → 풀이
//
//  · 측정은 사진에서 뽑은 468개 얼굴 좌표로 계산해요 (지어내지 않아요).
//  · 부위마다 전통 관상의 유형(일자눈썹·현담비·절통비 …)으로 갈라서,
//    사람이 다르면 결과가 분명히 달라지게 했어요.
//  · 해석은 삼정(三停)·오악(五嶽)·오관(五官)·십이궁을 따르되, 옛 책의
//    단정적인 흉상 표현(단명·빈천 따위)은 쓰지 않고 성향과 보완점으로 옮겼어요.
//  · 사진은 휴대폰 안에서만 쓰이고 서버로 보내지 않아요.
// ─────────────────────────────────────────────────────────────
import { BRANCHES_KO, BRANCH_EL, STEMS_KO, STEM_EL, elementCount, mod, seededRandom } from './saju.js';

export const EL_KO = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
const EL1 = ['목', '화', '토', '금', '수'];

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
/** 측정값을 보통 범위(lo~hi) 기준 0~100으로 (50이 평균적인 얼굴) */
const norm = (v, lo, hi) => clamp(Math.round(((v - lo) / (hi - lo)) * 100));
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// ── 얼굴 좌표 묶음 (MediaPipe FaceMesh 468점) ──────────────
// MediaPipe의 좌우는 "본인 기준"이에요. FACEMESH_LEFT_* 묶음에 263·362·454가
// 들어가므로 454 쪽이 본인의 왼쪽(사진에서는 오른편)입니다.
const P = {
  foreheadTop: [10, 338, 109, 151],
  templeL: [251, 284, 332],       // 본인 왼쪽 관자
  templeR: [21, 54, 103],         // 본인 오른쪽 관자
  browL: [336, 296, 334, 293, 300],
  browR: [70, 63, 105, 66, 107],
  browHeadL: 336, browTailL: 300, browPeakL: 334,
  browHeadR: 70, browTailR: 107, browPeakR: 105,
  eyeL: [362, 263, 386, 374, 387, 373, 385, 380, 398, 384],
  eyeR: [33, 133, 159, 145, 160, 144, 158, 153, 173, 157],
  eyeLidL: [[386, 374], [385, 380], [387, 373]],
  eyeLidR: [[159, 145], [158, 153], [160, 144]],
  eyeInnerL: 362, eyeOuterL: 263,
  eyeInnerR: 133, eyeOuterR: 33,
  bridgeTop: 168,                 // 산근
  bridgeMid: 197,
  noseTip: 1,                     // 준두
  noseBottom: 2,
  noseAlarL: [278, 344, 360, 279, 294, 327],
  noseAlarR: [48, 115, 131, 49, 64, 98],
  cheekL: [454, 356, 323, 345, 346],   // 본인 왼쪽 광대
  cheekR: [234, 127, 93, 116, 117],    // 본인 오른쪽 광대
  jawL: [397, 365, 379, 378],
  jawR: [172, 136, 150, 149],
  mouth: [61, 291, 13, 14, 0, 17, 78, 308, 37, 267],
  mouthCornerL: 291, mouthCornerR: 61,
  lipTop: 0, lipMid: 13, lipLow: 14, lipBottom: 17,
  chin: [152, 175, 148, 377],
  chinTip: 152,
};

const xs = (lm, idx) => idx.map((i) => lm[i].x);
const ys = (lm, idx) => idx.map((i) => lm[i].y);
const zs = (lm, idx) => idx.map((i) => lm[i].z ?? 0);
const spanX = (lm, idx) => Math.max(...xs(lm, idx)) - Math.min(...xs(lm, idx));
const meanY = (lm, idx) => avg(ys(lm, idx));
const meanZ = (lm, idx) => avg(zs(lm, idx));

/**
 * 얼굴 좌표 → 측정값. landmarks: [{x,y,z}] 468개 이상 (0~1 정규화)
 * 모든 값은 얼굴 폭(W)·높이(H)로 나눈 비율이라 사진 크기와 무관해요.
 */
export function measureFace(landmarks) {
  const lm = landmarks;
  if (!lm || lm.length < 400) throw new Error('얼굴 좌표가 모자라요');

  const topY = Math.min(...ys(lm, P.foreheadTop));
  const chinY = Math.max(...ys(lm, P.chin));
  const H = chinY - topY;
  const rx = Math.min(...xs(lm, P.cheekR));  // 사진 왼편 = 본인 오른쪽
  const lx = Math.max(...xs(lm, P.cheekL));  // 사진 오른편 = 본인 왼쪽
  const W = lx - rx;
  if (!(H > 0) || !(W > 0)) throw new Error('얼굴 크기를 잴 수 없어요');

  // 얼굴 중심선: 바깥 윤곽이 아니라 산근·코끝·턱끝으로 잡아야 좌우 차이가 드러나요
  const midX = avg([lm[P.bridgeTop].x, lm[P.noseTip].x, lm[P.chinTip].x]);

  const browY = avg([meanY(lm, P.browL), meanY(lm, P.browR)]);
  const noseBottomY = lm[P.noseBottom].y;
  const lipTopY = lm[P.lipTop].y;

  // ── 삼정(三停) ──
  const sang = (browY - topY) / H;
  const jung = (noseBottomY - browY) / H;
  const ha = (chinY - noseBottomY) / H;

  // ── 이마 ──
  const templeW = (Math.max(...xs(lm, P.templeL)) - Math.min(...xs(lm, P.templeR))) / W;
  const foreheadH = (browY - topY) / H;

  // ── 눈썹 ──
  const browLen = avg([spanX(lm, P.browL), spanX(lm, P.browR)]) / W;
  const browThick = avg([
    Math.max(...ys(lm, P.browL)) - Math.min(...ys(lm, P.browL)),
    Math.max(...ys(lm, P.browR)) - Math.min(...ys(lm, P.browR)),
  ]) / H;
  // 눈썹 기울기: 머리→꼬리 (양수면 꼬리가 내려간 팔자, 음수면 올라간 칼날)
  const browSlope = avg([
    (lm[P.browTailL].y - lm[P.browHeadL].y) / Math.max(1e-6, Math.abs(lm[P.browTailL].x - lm[P.browHeadL].x)),
    (lm[P.browTailR].y - lm[P.browHeadR].y) / Math.max(1e-6, Math.abs(lm[P.browTailR].x - lm[P.browHeadR].x)),
  ]);
  // 아치: 가운데 봉우리가 머리·꼬리 평균보다 얼마나 위인지
  const browArch = avg([
    ((lm[P.browHeadL].y + lm[P.browTailL].y) / 2 - lm[P.browPeakL].y) / H,
    ((lm[P.browHeadR].y + lm[P.browTailR].y) / 2 - lm[P.browPeakR].y) / H,
  ]);
  const browEyeGap = avg([
    meanY(lm, P.eyeL) - meanY(lm, P.browL),
    meanY(lm, P.eyeR) - meanY(lm, P.browR),
  ]) / H;

  // ── 눈 ──
  const lidGap = (pairs) => avg(pairs.map(([a, b]) => Math.abs(lm[a].y - lm[b].y)));
  const eyeW = avg([spanX(lm, P.eyeL), spanX(lm, P.eyeR)]) / W;
  const eyeH = avg([lidGap(P.eyeLidL), lidGap(P.eyeLidR)]) / H;
  const eyeOpen = eyeH / Math.max(1e-6, eyeW * (W / H)); // 세로÷가로 (가는 눈 ↔ 큰 눈)
  const eyeGap = Math.abs(lm[P.eyeInnerL].x - lm[P.eyeInnerR].x) / W; // 명궁(인당)
  // 눈꼬리 기울기: 안쪽→바깥쪽 (음수면 올라간 눈)
  const eyeSlant = avg([
    (lm[P.eyeOuterL].y - lm[P.eyeInnerL].y) / Math.max(1e-6, Math.abs(lm[P.eyeOuterL].x - lm[P.eyeInnerL].x)),
    (lm[P.eyeOuterR].y - lm[P.eyeInnerR].y) / Math.max(1e-6, Math.abs(lm[P.eyeOuterR].x - lm[P.eyeInnerR].x)),
  ]);

  // ── 코 ──
  const noseLen = (noseBottomY - lm[P.bridgeTop].y) / H;
  const alarMinX = Math.min(...xs(lm, P.noseAlarR));
  const alarMaxX = Math.max(...xs(lm, P.noseAlarL));
  const noseW = (alarMaxX - alarMinX) / W;
  const bridgeW = Math.abs(lm[P.bridgeTop].x - midX) / W + 0.04; // 산근 좁기(참고값)
  const cheekZ = avg([meanZ(lm, P.cheekL), meanZ(lm, P.cheekR)]);
  const noseZ = (cheekZ - (lm[P.noseTip].z ?? 0)) / W;          // 콧대 높이
  // 코끝 방향: 준두가 콧방울보다 아래면 매부리 쪽, 위면 들창 쪽
  const tipDrop = (lm[P.noseTip].y - avg([...ys(lm, P.noseAlarL), ...ys(lm, P.noseAlarR)])) / H;
  const bridgeBump = ((lm[P.bridgeTop].y + lm[P.noseTip].y) / 2 - lm[P.bridgeMid].y) / H;

  // ── 인중 ──
  const philtrum = (lipTopY - noseBottomY) / H;

  // ── 입 ──
  const mouthW = Math.abs(lm[P.mouthCornerL].x - lm[P.mouthCornerR].x) / W;
  const lipUpper = Math.abs(lm[P.lipMid].y - lm[P.lipTop].y) / H;
  const lipLower = Math.abs(lm[P.lipBottom].y - lm[P.lipLow].y) / H;
  const lipH = Math.abs(lm[P.lipBottom].y - lm[P.lipTop].y) / H;
  const mouthLift = (avg([lm[P.mouthCornerL].y, lm[P.mouthCornerR].y]) - lm[P.lipMid].y) / H; // 음수면 입꼬리 올라감

  // ── 턱 ──
  const jawW = (Math.max(...xs(lm, P.jawL)) - Math.min(...xs(lm, P.jawR))) / W;
  const chinLen = (chinY - lm[P.lipBottom].y) / H;
  const chinW = spanX(lm, P.chin) / W; // 턱끝 넓이 (네모턱 ↔ 뾰족턱)

  // ── 관골(광대) ── 바깥 윤곽이 아니라 턱·이마와 견줘서 봐요
  const zygoOverJaw = 1 / Math.max(1e-6, jawW);
  const zygoOverTemple = 1 / Math.max(1e-6, templeW);
  const cheekZL = (meanZ(lm, P.cheekR) - meanZ(lm, P.cheekL)) / W; // 좌우 돌출 차이
  const cheekProm = ((lm[P.bridgeTop].z ?? 0) - cheekZ) / W;       // 광대가 산근보다 앞인 정도
  // 좌우 폭 (중심선 기준) — 이제 진짜로 달라져요
  const spreadL = (lx - midX) / W;
  const spreadR = (midX - rx) / W;

  const faceRatio = H / W;
  const asym = Math.abs(spreadL - spreadR);

  return {
    faceRatio, sang, jung, ha,
    templeW, foreheadH,
    browLen, browThick, browSlope, browArch, browEyeGap,
    eyeW, eyeH, eyeOpen, eyeGap, eyeSlant,
    noseLen, noseW, bridgeW, noseZ, tipDrop, bridgeBump,
    philtrum,
    mouthW, lipUpper, lipLower, lipH, mouthLift,
    jawW, chinLen, chinW,
    zygoOverJaw, zygoOverTemple, cheekProm, cheekZL,
    spreadL, spreadR, asym,
  };
}

/** 사진이 관상 보기에 알맞은지 (너무 작거나·치우치거나·기울거나·옆을 보는지) */
export function faceQuality(lm) {
  const topY = Math.min(...ys(lm, P.foreheadTop));
  const chinY = Math.max(...ys(lm, P.chin));
  const rx = Math.min(...xs(lm, P.cheekR));
  const lx = Math.max(...xs(lm, P.cheekL));
  const H = chinY - topY;
  const W = lx - rx;
  const cx = (rx + lx) / 2;
  const cy = (topY + chinY) / 2;

  const eL = { x: avg(xs(lm, P.eyeL)), y: avg(ys(lm, P.eyeL)) };
  const eR = { x: avg(xs(lm, P.eyeR)), y: avg(ys(lm, P.eyeR)) };
  const tilt = Math.abs((Math.atan2(eL.y - eR.y, eL.x - eR.x) * 180) / Math.PI);
  const nose = lm[P.noseTip].x;
  const dl = Math.abs(lx - nose);
  const dr = Math.abs(nose - rx);
  const yaw = Math.abs(dl - dr) / Math.max(dl, dr);

  const issues = [];
  if (H < 0.42) issues.push('얼굴이 작게 나왔어요. 조금 더 가까이에서 찍어 주세요.');
  if (Math.abs(cx - 0.5) > 0.14 || Math.abs(cy - 0.5) > 0.18) issues.push('얼굴이 한쪽으로 치우쳤어요. 가운데에 맞춰 주세요.');
  if (tilt > 9) issues.push('고개가 기울었어요. 머리를 바로 세우고 찍어 주세요.');
  if (yaw > 0.26) issues.push('옆얼굴에 가까워요. 카메라를 정면으로 보고 찍어 주세요.');
  if (!(H > 0) || !(W > 0)) issues.push('얼굴 크기를 재지 못했어요.');
  return { ok: issues.length === 0, issues, size: +H.toFixed(3), offset: +Math.abs(cx - 0.5).toFixed(3), tilt: +tilt.toFixed(1), yaw: +yaw.toFixed(2) };
}

/** 결과 화면에서 사진 위에 찍어 줄 실제 좌표 (0~1) */
export function faceMarkers(lm) {
  const mid = (idx) => ({ x: avg(xs(lm, idx)), y: avg(ys(lm, idx)) });
  return [
    { key: '이마', label: '이마 · 관록궁', ...mid(P.foreheadTop) },
    { key: '눈썹L', label: '눈썹 · 보수관', ...mid(P.browL) },
    { key: '눈썹R', label: '눈썹', ...mid(P.browR) },
    { key: '눈L', label: '눈 · 감찰관', ...mid(P.eyeL) },
    { key: '눈R', label: '눈', ...mid(P.eyeR) },
    { key: '광대L', label: '관골', ...mid(P.cheekL) },
    { key: '광대R', label: '관골', ...mid(P.cheekR) },
    { key: '코', label: '코 · 재백궁', x: lm[P.noseTip].x, y: lm[P.noseTip].y },
    { key: '입', label: '입 · 출납관', ...mid(P.mouth) },
    { key: '턱', label: '턱 · 노복궁', ...mid(P.chin) },
  ];
}

/** 오악(五嶽)·삼정·부위 점수 0~100 — 50이 보통 */
export function faceScores(m) {
  // 오악: 이마=南(火) 왼광대=東(木) 코=中(土) 오른광대=西(金) 턱=北(水)
  const 남악 = Math.round(norm(m.sang, 0.28, 0.42) * 0.5 + norm(m.templeW, 0.71, 0.94) * 0.5);
  const 중악 = Math.round(norm(m.noseLen, 0.19, 0.38) * 0.35 + norm(m.noseW, 0.215, 0.335) * 0.3 + norm(m.noseZ, -0.03, 0.15) * 0.35);
  const 북악 = Math.round(norm(m.jawW, 0.59, 0.85) * 0.4 + norm(m.chinLen, 0.125, 0.25) * 0.35 + norm(m.chinW, 0.14, 0.34) * 0.25);
  // 좌우 광대: 중심선 기준 폭 + 돌출. 좌우가 다르면 점수도 갈려요.
  const zygo = norm(m.zygoOverJaw, 1.18, 1.69) * 0.45 + norm(m.zygoOverTemple, 1.06, 1.40) * 0.3 + norm(m.cheekProm, -0.02, 0.08) * 0.25;
  const 동악 = clamp(Math.round(zygo + (m.spreadL - 0.5) * 320 - m.cheekZL * 90));
  const 서악 = clamp(Math.round(zygo + (m.spreadR - 0.5) * 320 + m.cheekZL * 90));

  const 눈썹 = Math.round(norm(m.browLen, 0.285, 0.415) * 0.5 + norm(m.browThick, 0.038, 0.086) * 0.5);
  const 눈 = Math.round(norm(m.eyeW, 0.185, 0.275) * 0.45 + norm(m.eyeH, 0.024, 0.056) * 0.55);
  const 입 = Math.round(norm(m.mouthW, 0.305, 0.445) * 0.55 + norm(m.lipH, 0.048, 0.112) * 0.45);
  const 명궁 = norm(m.eyeGap, 0.17, 0.28);
  const 인중 = norm(m.philtrum, 0.052, 0.113);

  return {
    오악: { 남악, 동악, 중악, 서악, 북악 },
    오행: [동악, 남악, 중악, 서악, 북악], // [목, 화, 토, 금, 수]
    삼정: {
      상정: Math.round(norm(m.sang, 0.28, 0.42) * 0.5 + norm(m.templeW, 0.71, 0.94) * 0.3 + 눈썹 * 0.2),
      중정: Math.round(norm(m.jung, 0.20, 0.40) * 0.3 + 중악 * 0.35 + 눈 * 0.2 + ((동악 + 서악) / 2) * 0.15),
      하정: Math.round(norm(m.ha, 0.27, 0.42) * 0.3 + 북악 * 0.35 + 입 * 0.25 + 인중 * 0.1),
    },
    부위: { 이마: 남악, 눈썹, 눈, 코: 중악, 입, 턱: 북악, 명궁, 인중, 광대: Math.round((동악 + 서악) / 2) },
  };
}

// ── 얼굴 오행형(五行形) ─────────────────────────────────────
const SHAPE = [
  { el: 0, name: '목형(木形)', desc: '길고 꼿꼿한 얼굴로, 곧게 자라는 나무의 상이에요.' },
  { el: 1, name: '화형(火形)', desc: '위는 좁고 아래로 모이는 얼굴로, 위로 솟는 불의 상이에요.' },
  { el: 2, name: '토형(土形)', desc: '두툼하고 중심이 든든한 얼굴로, 품어 기르는 흙의 상이에요.' },
  { el: 3, name: '금형(金形)', desc: '이마와 턱이 반듯하게 각진 얼굴로, 맺고 끊는 쇠의 상이에요.' },
  { el: 4, name: '수형(水形)', desc: '둥글고 부드러운 얼굴로, 어디든 스며드는 물의 상이에요.' },
];

export function faceShape(m) {
  const ratioN = norm(m.faceRatio, 1.19, 1.51);
  const fhN = norm(m.templeW, 0.71, 0.94);
  const jawN = norm(m.jawW, 0.59, 0.85);
  const chinN = norm(m.chinLen, 0.125, 0.25);
  const square = 100 - Math.abs(fhN - jawN);

  const 목 = ratioN * 0.6 + (100 - jawN) * 0.4;
  const 화 = (100 - fhN) * 0.5 + (100 - jawN) * 0.5;
  const 토 = (100 - ratioN) * 0.35 + jawN * 0.35 + chinN * 0.30;
  const 금 = square * 0.5 + clamp(100 - Math.abs(ratioN - 45) * 1.7) * 0.5;
  const 수 = (100 - ratioN) * 0.38 + (100 - chinN) * 0.32 + (100 - Math.abs(jawN - 55) * 1.3) * 0.30;

  const list = [목, 화, 토, 금, 수].map((v) => clamp(Math.round(v)));
  const el = list.indexOf(Math.max(...list));
  return { ...SHAPE[el], scores: list };
}

// ═════════════════════════════════════════════════════════════
//  부위별 유형 — 사람이 다르면 여기서 갈려요
// ═════════════════════════════════════════════════════════════

/** 후보 중 조건을 만족하는 첫 유형, 없으면 마지막(보통형) */
const choose = (list, m) => list.find(([, , test]) => test(m))?.slice(0, 2) ?? list.at(-1).slice(0, 2);

// 눈썹 — 보수관(保壽官)
const BROW_TYPES = [
  ['칼날눈썹', '劍眉', (m) => m.browSlope < -0.160 && m.browThick > 0.063],
  ['팔자눈썹', '八字眉', (m) => m.browSlope > 0.160],
  ['송충이눈썹', '羅漢眉', (m) => m.browThick > 0.078],
  ['산형눈썹', '山眉', (m) => m.browArch > 0.026],
  ['초승달눈썹', '新月眉', (m) => m.browArch > 0.017 && m.browThick < 0.057],
  ['버들잎눈썹', '柳葉眉', (m) => m.browThick < 0.050],
  ['일자눈썹', '一字眉', (m) => Math.abs(m.browSlope) < 0.080 && m.browThick > 0.063],
  ['고른눈썹', '平眉', () => true],
];
const BROW_TEXT = {
  칼날눈썹: '눈썹뼈가 서고 꼬리가 위로 치켜 올라간 칼날눈썹이에요. 마의상법에서 눈썹은 보수관(保壽官)이라 해서 형제·친구 자리와 기개를 봅니다. 신념이 뚜렷하고 한번 정하면 끝까지 밀고 가는 힘이 남달라요. 다만 그 기세가 그대로 말과 표정에 실려서, 본인은 담담히 말했는데 상대는 세게 들었다고 하는 일이 잦아요. 중요한 자리에서는 한 톤만 낮추면 그 추진력이 온전히 득이 됩니다.',
  산형눈썹: '가운데가 봉우리처럼 꺾여 올라간 산형눈썹이에요. 자존심이 뚜렷하고 몸으로 부딪혀 길을 내는 힘이 있어, 머리로만 재는 사람들 사이에서 유난히 결과를 만들어 내요. 감각이 좋아 보고 듣는 일, 만드는 일에 재주가 붙습니다. 남의 조언을 듣는 귀만 한 뼘 열어 두면 사십 이후에 크게 벌어져요.',
  일자눈썹: '붓으로 그은 듯 곧고 가지런한 일자눈썹이에요. 옛 책은 이 눈썹을 두고 결단과 실행의 상이라 했어요. 재고 또 재기보다 정하면 바로 움직이는 쪽이라, 주변에서 믿고 맡기는 일이 늘어납니다. 대신 내 기준이 분명한 만큼 남의 속도를 기다려 주는 연습이 평생의 숙제예요.',
  팔자눈썹: '꼬리가 부드럽게 내려앉은 팔자눈썹이에요. 사람을 편하게 하는 인상이라 처세가 유연하고, 어디에 들어가도 금세 녹아듭니다. 모난 데가 없어 적이 잘 생기지 않아요. 다만 좋은 게 좋다고 넘기다 손해를 떠안는 수가 있으니, 거절해야 할 자리에서 한 번 분명히 말하는 힘만 기르면 돼요.',
  송충이눈썹: '굵고 진한 털이 머리부터 꼬리까지 고르게 난 송충이눈썹이에요. 옛 책에서 나한미(羅漢眉)라 부르며 그릇이 큰 상으로 봤어요. 말에 설득력이 있고 사람을 끌어모으는 힘이 있어 가르치거나 이끄는 자리가 잘 맞습니다. 돈 계산에 무심한 편이라, 숫자를 챙겨 줄 사람을 곁에 두면 훨씬 편해져요.',
  초승달눈썹: '곡선이 고운 초승달눈썹이에요. 감수성이 예민하고 눈치가 빨라 분위기를 먼저 읽습니다. 직감이 밝아 글·그림·음악처럼 느낌으로 하는 일에 재주가 붙어요. 마음이 쉽게 움직이는 만큼 쉽게 지치기도 하니, 혼자 회복하는 시간을 일정에 넣어 두세요.',
  버들잎눈썹: '가늘고 길게 흐르는 버들잎눈썹이에요. 이지적이고 표현이 섬세해서, 거친 자리보다 다듬는 자리에서 빛납니다. 사람을 잘 믿는 편이라 한 번쯤 크게 속아 보고 단단해지는 경우가 많아요. 중요한 약속은 꼭 글로 남겨 두는 습관이 평생 재산이 됩니다.',
  고른눈썹: '치우침 없이 고르게 난 눈썹이에요. 옛 책은 눈썹이 눈보다 길고 가지런하면 형제·친구 복이 있다고 했어요. 모나지 않아 어디서든 오래 가는 관계를 만들고, 급한 자리에서도 쉽게 흔들리지 않습니다.',
};

// 눈 — 감찰관(監察官)
const EYE_TYPES = [
  ['봉황눈', '鳳眼', (m) => m.eyeOpen < 0.203 && m.eyeSlant < -0.079 && m.eyeW > 0.231],
  ['올라간눈', '陽眼', (m) => m.eyeSlant < -0.130],
  ['처진눈', '陰眼', (m) => m.eyeSlant > 0.090],
  ['큰눈', '大眼', (m) => m.eyeOpen > 0.302],
  ['가는눈', '細眼', (m) => m.eyeOpen < 0.171],
  ['고른눈', '平眼', () => true],
];
const EYE_TEXT = {
  봉황눈: '가늘고 길게 뻗다 끝이 살짝 올라간, 옛 책이 가장 귀하게 본 봉황눈이에요. 눈은 감찰관(監察官)이라 해서 마음과 사람 보는 눈을 봅니다. 속을 쉽게 보이지 않으면서도 상대의 속은 먼저 읽어 내는 쪽이라, 협상이나 사람을 고르는 자리에서 특히 강해요. 한번 마음을 준 사람은 오래 품고, 아닌 사람은 조용히 거리를 둡니다.',
  올라간눈: '눈꼬리가 또렷하게 올라간 눈이에요. 기운이 위로 솟는 상이라 눈빛에 힘이 있고, 처음 보는 자리에서도 쉽게 밀리지 않습니다. 결정이 빠르고 추진력이 좋아요. 다만 인상이 날카롭게 읽힐 수 있어서, 부드러운 말 한마디를 앞에 붙이면 같은 말도 훨씬 잘 통해요.',
  처진눈: '눈꼬리가 순하게 내려앉은 눈이에요. 사람이 먼저 다가오고 털어놓게 만드는 인상이라, 상담·영업·돌보는 일에서 힘을 발휘합니다. 옛 책은 이런 눈을 두고 스스로를 잘 다스리는 상이라 했어요. 받아 주는 폭이 넓은 만큼 남의 감정까지 떠안기 쉬우니, 선을 긋는 연습이 필요해요.',
  큰눈: '시원하게 트인 큰 눈이에요. 눈은 마음의 창이라, 감정이 그대로 드러나고 사람이 쉽게 다가옵니다. 보고 느끼는 감각이 빨라 새로운 것을 금방 익혀요. 정이 깊은 만큼 상처도 빨리 받으니, 내 편을 고르는 눈만 기르면 인복이 크게 붙습니다.',
  가는눈: '가늘고 깊은 눈이에요. 겉으로는 무심해 보여도 속으로 사람을 오래 재는 쪽이라, 판단이 좀처럼 틀리지 않습니다. 감정보다 계산이 먼저 서서 큰 손해를 피해 가요. 속을 잘 안 보이는 탓에 오해를 사기도 하니, 가까운 사람에게는 한 번씩 먼저 말해 주면 좋아요.',
  고른눈: '검은자와 흰자의 균형이 잡힌 안정된 눈이에요. 사람을 볼 때 치우치지 않고, 급한 자리에서도 한 박자 늦게 반응해 손해를 덜 봅니다. 정이 없지도 넘치지도 않아 오래 가는 인연을 만들어요.',
};

// 코 — 심변관(審辨官) · 재백궁(財帛宮)
const NOSE_TYPES = [
  ['현담비', '懸膽鼻', (m) => m.noseZ > 0.106 && m.noseW > 0.295 && m.tipDrop > -0.011],
  ['매부리코', '鷹鼻', (m) => m.bridgeBump > 0.003 || m.tipDrop > 0.000],
  ['절통비', '截筒鼻', (m) => m.noseZ > 0.080 && m.noseW > 0.276],
  ['들창코', '仰鼻', (m) => m.tipDrop < -0.038],
  ['긴코', '長鼻', (m) => m.noseLen > 0.331],
  ['짧은코', '短鼻', (m) => m.noseLen < 0.227],
  ['고른코', '平鼻', () => true],
];
const NOSE_TEXT = {
  현담비: '콧대가 곧게 서고 코끝에 살집이 도타워, 쓸개를 매달아 놓은 듯한 현담비(懸膽鼻)예요. 옛 책이 재물 자리로 가장 귀하게 꼽은 코입니다. 코는 재백궁(財帛宮)이라 중년의 벌이와 쌓이는 힘을 보는데, 한 번 들어온 것이 잘 새지 않는 구조예요. 다만 창고가 큰 만큼 지키려는 마음도 커져서, 쓸 자리에 쓰는 연습이 평생 숙제가 됩니다.',
  절통비: '대나무 통을 단정하게 끊어 놓은 듯한 절통비(截筒鼻)예요. 현담비 다음으로 좋게 본 코로, 콧대가 반듯하고 콧방울이 알맞게 받쳐 줍니다. 벌이가 크게 출렁이지 않고 차곡차곡 쌓이는 상이라, 마흔 줄에 접어들며 그동안 흘려보낸 것들이 한자리에 모이기 시작해요.',
  매부리코: '콧대 가운데가 살짝 솟고 코끝이 아래를 향하는 매부리코예요. 옛 책은 이 코를 두고 셈이 빠르고 기회를 놓치지 않는 상이라 했어요. 협상과 흥정에 강해서 남의 돈을 다루는 일, 중개하는 일에서 수완이 납니다. 다만 밀어붙일 때와 멈출 때의 선을 스스로 정해 두는 게 좋아요.',
  들창코: '코끝이 살짝 들려 콧구멍이 보이는 들창코예요. 옛 책은 재물창고의 문이 열린 모양이라 했지만, 뒤집어 보면 들어온 것을 묵히지 않고 돌리는 상이에요. 쌓아 두기보다 쓰고 벌기를 되풀이하는 쪽이 맞고, 자동이체로 먼저 떼어 두는 방식이 특히 잘 맞습니다. 밝고 꾸밈없는 인상이라 사람이 먼저 다가와요.',
  긴코: '얼굴에 견줘 길이가 넉넉한 긴 코예요. 자기 기준이 뚜렷하고 쉽게 타협하지 않아, 전문성을 쌓는 일에서 오래 갑니다. 옛 책은 긴 코가 턱을 누른다 하여 혼자 짊어지기 쉽다고 봤어요. 말년 자리인 턱과 입을 함께 챙기면, 곧 그 고집이 그대로 재산이 됩니다.',
  짧은코: '길이가 아담하고 야무진 코예요. 결정이 빠르고 몸이 가벼워, 기회가 왔을 때 먼저 움직이는 쪽이에요. 길게 끄는 일보다 짧게 끊어 가는 일이 잘 맞습니다. 큰 결정만큼은 하루 재워 두는 습관을 들이면 훨씬 단단해져요.',
  고른코: '콧대와 콧방울이 어느 한쪽으로 기울지 않은 고른 코예요. 재백궁이 평탄해서 큰 기복 없이 쌓이는 상이고, 돈 문제로 크게 흔들리는 일이 드뭅니다.',
};

// 입 — 출납관(出納官) · 수성(水星)
const MOUTH_TYPES = [
  ['사자구', '四字口', (m) => m.mouthW > 0.420 && m.lipH > 0.091],
  ['앙월구', '仰月口', (m) => m.mouthLift < -0.009],
  ['도톰한입', '厚脣', (m) => m.lipH > 0.101],
  ['얇은입', '薄脣', (m) => m.lipH < 0.059],
  ['작은입', '小口', (m) => m.mouthW < 0.330],
  ['고른입', '平口', () => true],
];
const MOUTH_TEXT = {
  사자구: '크고 두둑해 넉 사(四) 자처럼 반듯한 사자구예요. 입은 출납관(出納官)이라 복록이 드나드는 문으로 봅니다. 말로 길을 여는 힘이 커서 사람을 모으고 설득하는 일에서 크게 되는 상이에요. 먹을 복과 사람 복이 함께 붙어, 어디를 가든 밥 걱정은 덜합니다.',
  앙월구: '입꼬리가 초승달처럼 살짝 올라간 앙월구예요. 가만히 있어도 웃는 인상이라 첫인상에서 손해 보는 일이 거의 없어요. 옛 책은 말년까지 복록이 이어지는 상으로 봤습니다. 말로 쌓은 신용이 나중에 돈으로 돌아오는 쪽이에요.',
  도톰한입: '입술이 도톰하게 살이 오른 입이에요. 정이 많고 표현이 따뜻해서 곁에 사람이 끊기지 않습니다. 먹고 누리는 복이 붙는 자리라, 즐길 줄 아는 것이 이 상의 힘이에요. 마음이 앞서 약속을 먼저 하는 버릇만 다스리면 됩니다.',
  얇은입: '입술이 얇고 선이 분명한 입이에요. 말이 군더더기 없고 맺고 끊음이 확실해, 실수로 잃는 일이 적습니다. 옛 책은 말을 아끼는 입이라 했어요. 속에 담아 두는 게 많으니, 믿는 한 사람에게는 꼭 털어놓고 가는 게 좋아요.',
  작은입: '작고 야무지게 다물린 입이에요. 조심성이 있어 가벼운 말로 구설에 오르는 일이 드뭅니다. 혼자 해내는 일, 꼼꼼함이 필요한 일에서 특히 강해요. 먼저 나서야 할 자리에서 반 발만 앞서 보면 기회가 늘어납니다.',
  고른입: '크기와 두께가 고른 복스러운 입이에요. 말로 쌓은 신용이 나중에 돈으로 돌아오는 자리라, 어디서든 밥 걱정은 덜한 상입니다.',
};

// 턱 — 지각(地閣) · 노복궁(奴僕宮)
const CHIN_TYPES = [
  ['방턱', '方頤', (m) => m.chinW > 0.276 && m.jawW > 0.757],
  ['주걱턱', '仰頤', (m) => m.chinLen > 0.227],
  ['뾰족턱', '尖頤', (m) => m.chinW < 0.174],
  ['둥근턱', '圓頤', (m) => m.jawW > 0.801],
  ['고른턱', '平頤', () => true],
];
const CHIN_TEXT = {
  방턱: '턱선이 넓고 반듯하게 받치는 방턱이에요. 턱은 지각(地閣)이라 하여 말년의 집과 터, 아랫사람 복을 봅니다. 나이가 들수록 자리가 잡히고 사람이 모이며, 끝까지 남아 주는 후배가 생겨요. 체력이 받쳐 주니 오래 걸리는 일을 맡아도 무너지지 않습니다.',
  주걱턱: '턱끝이 길고 앞으로 또렷하게 나온 턱이에요. 의지가 세고 끈기가 있어, 남들이 포기한 자리에서 결과를 내는 쪽이에요. 옛 책은 말년에 터를 잡는 상으로 봤습니다. 고집으로 읽히지 않게 중간에 한 번 설명해 주면 따르는 사람이 늘어나요.',
  뾰족턱: '턱끝이 갸름하게 모인 턱이에요. 감각이 예민하고 안목이 앞서서, 몸으로 버티기보다 보는 눈으로 가는 쪽이 맞습니다. 좁고 깊게 파고드는 일에서 빛나요. 말년에는 넓게 벌이기보다 내 사람 몇을 두는 편이 훨씬 편안해집니다.',
  둥근턱: '모나지 않고 둥글게 받치는 턱이에요. 노년에 기댈 자리가 있고 아랫사람과 척지는 일이 드뭅니다. 급하게 뻗지 않아도 쌓인 것이 그대로 남는 상이에요.',
  고른턱: '무너지지 않고 적당히 받쳐 주는 턱이에요. 말년에 기댈 자리가 있고, 후배가 끝까지 남아 주는 상입니다.',
};

// 관골(광대)
const ZYGO_TYPES = [
  ['솟은관골', '高顴', (m, s) => s.부위.광대 >= 62],
  ['평평한관골', '平顴', (m, s) => s.부위.광대 <= 38],
  ['둥근관골', '圓顴', () => true],
];
const ZYGO_TEXT = {
  솟은관골: '광대가 또렷하게 선 상이에요. 관골은 독립심과 개척하는 힘, 표현력을 보는 자리예요. 남 밑에 오래 있기보다 내 몫을 들고 나설 때 힘이 붙고, 나서야 할 자리에서 주저하지 않습니다. 기세가 센 만큼 혼자 다 지려 들기 쉬우니, 나눠 맡기는 연습이 일을 키워요.',
  평평한관골: '광대가 도드라지지 않고 부드럽게 이어진 상이에요. 온순하고 현실적이라 남과 부딪히는 일이 적고, 조용히 쌓아 가는 쪽이에요. 옛 책은 인덕을 기다리기보다 스스로 길을 낸다고 봤습니다. 사람을 모으는 자리보다 한 가지를 깊게 하는 자리에서 결과가 납니다.',
  둥근관골: '광대가 둥글게 자리 잡은 상이에요. 운세에 큰 굴곡이 없고, 나설 때와 물러설 때를 아는 균형이 있어요. 모나지 않아 어디에 놓아도 오래 갑니다.',
};

// 인중
const PHIL_TYPES = [
  ['긴인중', '長人中', (m) => m.philtrum > 0.102],
  ['짧은인중', '短人中', (m) => m.philtrum < 0.063],
  ['고른인중', '平人中', () => true],
];
const PHIL_TEXT = {
  긴인중: '코 아래 인중이 길게 뻗었어요. 인중은 수명과 자손, 그리고 버티는 힘을 보는 자리입니다. 옛 책은 길고 또렷한 인중을 장수와 자녀 복의 상으로 봤어요. 오래 걸리는 일을 끝까지 끌고 가는 지구력이 이 상의 가장 큰 재산이에요.',
  짧은인중: '인중이 짧고 야무져요. 반응이 빠르고 싹싹해서 사람 사이에서 분위기를 금세 바꿉니다. 대신 긴 호흡이 필요한 일에서는 중간에 한 번 숨이 차요. 기한을 잘게 쪼개 두면 그 약점이 그대로 덮입니다.',
  고른인중: '인중이 또렷하고 곧게 뻗었어요. 옛 책은 곧은 인중을 신의가 있는 상으로 봤습니다. 한 말을 지키는 힘이 있어, 느려 보여도 끝에는 믿음이 남아요.',
};

// 명궁(인당)
const MYEONG_TYPES = [
  ['트인명궁', (m, s) => s.부위.명궁 >= 62],
  ['좁은명궁', (m, s) => s.부위.명궁 <= 38],
  ['고른명궁', () => true],
];
const MYEONG_TEXT = {
  트인명궁: '두 눈썹 사이 명궁(命宮)이 시원하게 트였어요. 십이궁에서 명궁은 그릇과 마음의 폭을 보는 자리로, 스물여덟 즈음의 운을 봅니다. 웬만한 일은 담아 두지 않아 막힘이 적고, 큰일 앞에서도 쉽게 흔들리지 않아요.',
  좁은명궁: '명궁이 좁은 편이에요. 한 가지에 깊이 파고드는 집중력이 남다르지만, 마음에 걸린 일을 오래 품습니다. 생각이 길어질 때는 결론을 내려 하기보다 몸을 먼저 움직이는 게 약이에요.',
  고른명궁: '명궁이 알맞게 트여 있어요. 답답한 자리에서도 숨 쉴 틈을 찾아내고, 한쪽으로 치우치지 않게 스스로를 돌려세울 줄 압니다.',
};

const PART_META = {
  이마: { palace: '관록궁(官祿宮)', life: '초년운과 윗사람 복', age: '15~30세' },
  눈썹: { palace: '보수관(保壽官)', life: '형제·친구와 기개', age: '31~34세' },
  눈: { palace: '감찰관(監察官)', life: '심성과 애정, 사람 보는 눈', age: '35~40세' },
  광대: { palace: '관골(顴骨)', life: '독립심과 사회에서의 힘', age: '46~47세' },
  코: { palace: '재백궁(財帛宮)', life: '중년운과 재물', age: '41~50세' },
  인중: { palace: '인중(人中)', life: '지구력과 자손 복', age: '51~55세' },
  입: { palace: '출납관(出納官)', life: '말년 복록과 인복', age: '60세' },
  턱: { palace: '노복궁(奴僕宮)', life: '말년 안정과 아랫사람 복', age: '61~71세' },
};

/** 부위별 유형 판정 */
export function faceTypes(m, sc) {
  const t = (list, textMap, key) => {
    const [name, hanja] = choose(list.map(([n, h, f]) => [n, h, (mm) => f(mm, sc)]), m);
    return { key, name, hanja, text: textMap[name], ...PART_META[key] };
  };
  return {
    이마: null, // 이마는 삼정·관록궁으로 따로 풀어요
    눈썹: t(BROW_TYPES, BROW_TEXT, '눈썹'),
    눈: t(EYE_TYPES, EYE_TEXT, '눈'),
    광대: t(ZYGO_TYPES, ZYGO_TEXT, '광대'),
    코: t(NOSE_TYPES, NOSE_TEXT, '코'),
    인중: t(PHIL_TYPES, PHIL_TEXT, '인중'),
    입: t(MOUTH_TYPES, MOUTH_TEXT, '입'),
    턱: t(CHIN_TYPES, CHIN_TEXT, '턱'),
    명궁: (() => {
      const name = MYEONG_TYPES.find(([, f]) => f(m, sc))[0];
      return { key: '명궁', name, text: MYEONG_TEXT[name] };
    })(),
  };
}

// 이마(관록궁)는 높이·폭 조합으로
const FOREHEAD_TEXT = (sc) => {
  const s = sc.부위.이마;
  if (s >= 62) return '이마가 훤하게 트이고 각이 살아 있는 상이에요. 마의상법은 이마를 하늘(天庭)이라 해서 관운과 윗사람의 덕을 봅니다. 천중·천정·사공·중정으로 이어지는 자리가 모두 이마에 있어 열다섯에서 서른까지의 흐름을 여기서 읽어요. 어른이 먼저 알아보고 기회를 건네주는 일이 평생에 여러 번 있습니다.';
  if (s >= 38) return '이마의 높이와 폭이 고르게 잡힌 중정(中正)한 이마예요. 윗사람에게 밉보이지 않고 무리 안에서 자기 자리를 잃지 않는 상이라, 크게 튀지 않아도 끝까지 남는 쪽이에요. 초년의 흐름이 완만해서 서른 넘어 속도가 붙습니다.';
  return '이마가 넓게 벌어지기보다 단정하게 모인 편이에요. 옛 책은 이런 이마를 두고 스스로 길을 내는 상이라 했어요. 물려받는 자리보다 내가 만들어 낸 자리에서 빛이 나고, 초년에 돌아가던 길이 서른 이후 한 번에 곧아집니다.';
};

// ── 사주 × 관상 교차 ────────────────────────────────────────
const FACE_OF_EL = ['왼쪽 광대(동악)', '이마(남악)', '콧대와 콧방울(중악)', '오른쪽 광대(서악)', '턱과 지각(북악)'];
const FACE_SHORT = ['왼쪽 광대', '이마', '콧대', '오른쪽 광대', '턱'];
const PALACE_OF_EL = ['형제·동료의 자리', '관록과 명예의 자리', '재물창고의 자리', '결단과 의리의 자리', '말년과 터전의 자리'];

const CLOSE_GOOD = [
  '오늘 내린 결정은 평소보다 오래 갑니다.',
  '오늘 만난 사람은 한 번으로 끝나지 않아요.',
  '미뤄 둔 연락이 있다면 오늘 보내세요.',
  '오늘은 내 얼굴을 믿고 먼저 나서도 되는 날이에요.',
];
const CLOSE_SOFT = [
  '큰 걸 바라지 말고 한 가지만 챙기면 그건 확실히 남아요.',
  '오늘은 벌이기보다 매듭짓는 쪽이 이득이에요.',
  '서두르면 어긋나고, 한 박자 늦추면 그대로 지나가요.',
  '오늘 안 풀린 건 내 탓이 아니라 날의 몫이에요.',
];

function todayFaceLine(오행점, an, ctx) {
  const rng = seededRandom(`${ctx.seed}-face`);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const gz = `${STEMS_KO[ctx.todayStem]}${BRANCHES_KO[ctx.todayBranch]}일`;
  const sEl = ctx.todayEl;
  const bEl = ctx.todayBranchEl;
  const sS = 오행점[sEl];
  const bS = 오행점[bEl];
  const sF = an.fav[sEl];
  const bF = an.fav[bEl];

  let a;
  if (sF >= 0.3 && sS >= 55) a = `${gz}인 오늘, 하늘로 들어온 ${EL_KO[sEl]} 기운을 당신의 ${FACE_OF_EL[sEl]}이 ${sS}점으로 단단히 받치고 있어요. 사주에도 반가운 기운이라 얼굴과 날이 같은 편에 선 날이에요.`;
  else if (sF >= 0.3) a = `${gz}인 오늘 들어온 ${EL_KO[sEl]} 기운은 사주에 꼭 필요한 쪽인데, 그 자리를 맡는 ${FACE_OF_EL[sEl]}은 ${sS}점으로 담백해요. 날이 주는 복을 얼굴이 다 받기엔 그릇이 조금 작은 날이에요.`;
  else if (sF <= -0.3 && sS >= 55) a = `${gz}인 오늘 들어온 ${EL_KO[sEl]} 기운은 사주에는 부담이 되는 쪽이에요. 그런데 그 ${EL1[sEl]}을 맡는 ${FACE_OF_EL[sEl]}이 ${sS}점으로 강하게 서 있어서, 오늘의 부담을 얼굴이 대신 막아 줘요. 마의상법에서 ‘상(相)이 흉(凶)을 가린다’고 한 자리가 오늘이에요.`;
  else if (sF <= -0.3) a = `${gz}인 오늘 들어온 ${EL_KO[sEl]} 기운은 사주에 부담이 되는 쪽인데, 받쳐 줄 ${FACE_OF_EL[sEl]}도 ${sS}점으로 조용해요. ${PALACE_OF_EL[sEl]}를 건드리는 일은 하루만 미뤄 두세요.`;
  else a = `${gz}인 오늘 들어온 ${EL_KO[sEl]} 기운은 사주에 크게 치우치지 않아요. 그 자리를 맡는 ${FACE_OF_EL[sEl]}이 ${sS}점이라, 오늘은 날보다 ${FACE_SHORT[sEl]}이 말해 주는 성향 그대로 움직이면 돼요.`;

  let b;
  if (bEl === sEl) b = `땅에 깔린 기운도 같은 ${EL1[bEl]}이라, 오늘은 ${FACE_SHORT[bEl]} 하나에 하루가 다 걸려 있어요.`;
  else if (bF >= 0.3 && bS >= 55) b = `땅에 깔린 ${EL_KO[bEl]} 기운도 내게 반가운 쪽인데, 마침 ${FACE_OF_EL[bEl]}이 ${bS}점으로 받쳐 줘요. 겉으로 드러나지 않는 자리에서 일이 먼저 풀리는 날이에요.`;
  else if (bF >= 0.3) b = `땅에 깔린 ${EL_KO[bEl]} 기운은 내게 필요한 쪽이지만 ${FACE_OF_EL[bEl]}은 ${bS}점으로 조용해요. 오늘의 득은 사람을 통해 들어와요.`;
  else if (bF <= -0.3 && bS >= 55) b = `땅에 깔린 ${EL_KO[bEl]} 기운은 부담이 되는 쪽인데, ${FACE_OF_EL[bEl]}이 ${bS}점으로 버텨 줘요. 속으로는 피곤해도 겉으로는 무너지지 않는 날이에요.`;
  else if (bF <= -0.3) b = `땅에 깔린 ${EL_KO[bEl]} 기운까지 부담이 되는 쪽이고 ${FACE_OF_EL[bEl]}도 ${bS}점이라, 오늘은 몸이 먼저 신호를 보낼 수 있어요.`;
  else b = `땅에 깔린 ${EL_KO[bEl]} 기운은 무던해서, ${FACE_SHORT[bEl]}이 하루를 조용히 받쳐 줘요.`;

  const good = (sF >= 0.3 || sS >= 55) && bF > -0.3;
  return `${a} ${b} ${pick(good ? CLOSE_GOOD : CLOSE_SOFT)}`;
}

/**
 * 관상 풀이 만들기
 * @param m   measureFace 결과
 * @param ctx faceContext 결과
 */
export function readFace(m, ctx) {
  const sc = faceScores(m);
  const shape = faceShape(m);
  const types = faceTypes(m, sc);
  const an = ctx.analysis;
  const counts = ctx.pillars ? elementCount(ctx.pillars) : [1, 1, 1, 1, 1];

  // 1) 부위별 (이마 + 유형 7가지)
  const parts = [
    { key: '이마', score: sc.부위.이마, ...PART_META.이마, name: null, text: FOREHEAD_TEXT(sc) },
    ...['눈썹', '눈', '광대', '코', '인중', '입', '턱'].map((k) => ({ ...types[k], score: sc.부위[k] })),
  ];

  // 2) 사주 교차
  const minCount = Math.min(...counts);
  const lacking = counts.map((c, el) => [c, el]).filter(([c]) => c === minCount).map(([, el]) => el);
  const yong = an.yongsin;
  const faceEl = shape.el;
  const 오행점 = sc.오행;

  const cross = [];
  const yongFace = 오행점[yong];
  cross.push(
    yongFace >= 55
      ? `사주에서 가장 필요한 기운은 ${EL_KO[yong]}이에요. 그런데 그 ${EL1[yong]}을 맡는 자리가 바로 ${FACE_OF_EL[yong]}인데, 이 자리가 ${yongFace}점으로 뚜렷하게 살아 있어요. 타고난 사주가 모자란 쪽을 얼굴이 직접 메워 주는 상이라, 마의상법에서 말하는 ‘명(命)이 못 채운 것을 상(相)이 채운다’는 자리예요.`
      : `사주에서 가장 필요한 기운은 ${EL_KO[yong]}이고, 그 자리를 맡는 ${FACE_OF_EL[yong]}은 ${yongFace}점으로 담백한 편이에요. 얼굴이 대신 채워 주기보다, ${EL1[yong]}의 기운을 사람과 자리에서 끌어와야 하는 상이에요. ${PALACE_OF_EL[yong]}를 도와주는 사람 곁에 있을 때 일이 가장 잘 풀려요.`,
  );
  const el0 = lacking[0];
  if (minCount === 0) {
    cross.push(
      오행점[el0] >= 50
        ? `사주 여덟 글자 안에 ${EL_KO[el0]} 기운이 하나도 없어요. 보통은 ${PALACE_OF_EL[el0]}가 비기 쉬운데, 얼굴에서 ${FACE_OF_EL[el0]}이 ${오행점[el0]}점으로 받쳐 주고 있어요. 없는 것을 얼굴이 벌어다 쓰는 셈이라, 이 부분은 남보다 늦게 트이지만 한 번 트이면 오래가요.`
        : `사주에 ${EL_KO[el0]} 기운이 하나도 없고, 그 자리를 맡는 ${FACE_OF_EL[el0]}도 ${오행점[el0]}점으로 조용한 편이에요. 이 기운은 타고나기보다 만들어 쓰는 쪽이라, ${PALACE_OF_EL[el0]}는 사람을 통해 빌려 쓰는 게 빠르고 편해요.`,
    );
  } else {
    cross.push(`사주에서 가장 옅은 기운은 ${EL_KO[el0]}이에요. 얼굴에서 그 자리를 맡는 ${FACE_OF_EL[el0]}이 ${오행점[el0]}점이라, ${오행점[el0] >= 50 ? '모자란 쪽을 얼굴이 조용히 받쳐 주고 있어요' : '이 자리는 평생 한 번씩 점검해 두는 게 좋아요'}.`);
  }
  const fv = an.fav[faceEl];
  cross.push(
    fv >= 0.3
      ? `얼굴 전체는 ${shape.name}이에요. ${shape.desc} ${EL_KO[faceEl]} 기운이 사주에서도 반가운 쪽이라, 생긴 대로 살면 되는 드문 상이에요. 억지로 다른 사람처럼 굴 때 오히려 일이 꼬여요.`
      : fv <= -0.3
        ? `얼굴 전체는 ${shape.name}이에요. ${shape.desc} 다만 ${EL_KO[faceEl]} 기운은 사주에서는 이미 넉넉한 쪽이라, 타고난 성향을 그대로 밀면 과해질 수 있어요. 한 걸음 물러서는 습관 하나가 평생 득이 돼요.`
        : `얼굴 전체는 ${shape.name}이에요. ${shape.desc} ${EL_KO[faceEl]} 기운이 사주와 크게 부딪히지도 돕지도 않아서, 이 얼굴은 내가 쓰기 나름이에요.`,
  );
  // 좌우 관골 차이
  const d = sc.오악.동악 - sc.오악.서악;
  if (Math.abs(d) >= 12) {
    cross.push(d > 0
      ? `좌우를 견주면 왼쪽 광대(동악·${EL_KO[0]})가 오른쪽보다 ${Math.abs(d)}점 높아요. 동악은 뻗어 나가는 기운이라, 새로 벌이고 사람을 만나는 쪽에 힘이 실립니다. 마무리와 정리를 맡아 줄 사람을 곁에 두면 짝이 맞아요.`
      : `좌우를 견주면 오른쪽 광대(서악·${EL_KO[3]})가 왼쪽보다 ${Math.abs(d)}점 높아요. 서악은 맺고 끊는 기운이라, 판단하고 매듭짓는 쪽에 힘이 실립니다. 먼저 벌여 줄 사람과 짝을 이루면 일이 커져요.`);
  }

  // 3) 삼정 + 유년
  const { 상정, 중정, 하정 } = sc.삼정;
  const best = [['초년', 상정, '이마', '서른넷까지'], ['중년', 중정, '눈과 코', '서른다섯에서 쉰까지'], ['말년', 하정, '입과 턱', '쉰하나부터']]
    .sort((a, b) => b[1] - a[1]);
  const flow = `삼정(三停)으로 보면 초년 ${상정}점, 중년 ${중정}점, 말년 ${하정}점이에요. 옛 책은 상정이 태어나서 서른넷까지, 중정이 서른다섯에서 쉰까지, 하정이 쉰하나부터를 맡는다고 봤어요. `
    + `${best[0][0]}을 맡는 ${best[0][2]}이 가장 실하니, 이 얼굴은 ${best[0][3]} 힘이 실리는 상이에요. `
    + `${best[2][0]}을 맡는 ${best[2][2]}은 ${best[2][1]}점으로 상대적으로 얌전한데, 마의상법은 모자란 정(停)을 두고 ‘덜 받은 게 아니라 늦게 받는 것’이라 했어요.`;

  const ages = `십삼부위로 더 잘게 보면 이마의 천중·천정·사공·중정이 열여섯에서 스물다섯, 두 눈썹 사이 명궁이 스물여덟, 두 눈 사이 산근이 마흔하나, 코끝 준두가 마흔여덟, 인중이 쉰하나, 입이 예순, 턱의 지각이 일흔하나를 맡아요. `
    + `지금 ${types.코.name}(${types.코.hanja})인 코가 ${sc.부위.코}점이니 마흔에서 쉰 사이가 ${sc.부위.코 >= 55 ? '가장 두텁고' : '담백하고'}, 턱이 ${sc.부위.턱}점이라 예순 이후가 ${sc.부위.턱 >= 55 ? '든든해요' : '천천히 자리를 잡아요'}.`;

  return {
    scores: sc,
    shape,
    types,
    parts,
    myeonggung: types.명궁.text,
    flow,
    ages,
    cross,
    todayLine: todayFaceLine(오행점, an, ctx),
    total: Math.round((상정 + 중정 + 하정) / 3),
    // 한 줄 요약 — 사람마다 달라요
    headline: `${shape.name} · ${types.눈.name} · ${types.코.name} · ${types.입.name}`,
  };
}

/** 사주 쪽 재료 꺼내기 */
export function faceContext(manse, fortune) {
  return {
    analysis: manse.analysis,
    pillars: manse.pillars,
    todayStem: fortune.today.stem,
    todayBranch: fortune.today.branch,
    todayEl: STEM_EL[fortune.today.stem],
    todayBranchEl: BRANCH_EL[fortune.today.branch],
    seed: `${fortune.today.y}${fortune.today.m}${fortune.today.d}`,
  };
}

export { mod };

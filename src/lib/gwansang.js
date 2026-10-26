// ─────────────────────────────────────────────────────────────
//  관상(마의상법) 분석 — 얼굴 landmark → 측정값 → 풀이
//
//  · 측정은 실제 사진에서 뽑은 468개 얼굴 좌표로 계산해요 (지어내지 않아요).
//  · 해석은 마의상법의 오악(五嶽)·삼정(三停)·오관(五官)을 따르고,
//    사주의 용신·기신·부족한 오행과 교차해서 문장을 만들어요.
//  · 사진은 휴대폰 안에서만 쓰이고 서버로 보내지 않아요.
// ─────────────────────────────────────────────────────────────
import { BRANCHES_KO, BRANCH_EL, STEMS_KO, STEM_EL, elementCount, mod, seededRandom } from './saju.js';

export const EL_KO = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
const EL1 = ['목', '화', '토', '금', '수'];

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
/** 측정값을 보통 범위(lo~hi) 기준 0~100으로 (50이 평균적인 얼굴) */
const norm = (v, lo, hi) => clamp(Math.round(((v - lo) / (hi - lo)) * 100));
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// ── 얼굴 좌표 묶음 (MediaPipe FaceMesh 468점 기준) ──────────
// 한 점만 쓰면 어긋나기 쉬워서, 부위마다 여러 점을 묶어 min/max로 재요.
const P = {
  foreheadTop: [10, 338, 109, 151],
  foreheadSide: [21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251],
  browL: [70, 63, 105, 66, 107],
  browR: [336, 296, 334, 293, 300],
  eyeL: [33, 133, 159, 145, 160, 144, 158, 153, 173, 157],
  eyeR: [362, 263, 386, 374, 387, 373, 385, 380, 398, 384],
  eyeLidL: [[159, 145], [158, 153], [160, 144]],
  eyeLidR: [[386, 374], [385, 380], [387, 373]],
  eyeInnerL: 133,
  eyeInnerR: 362,
  bridgeTop: 168,
  noseTip: 1,
  noseBottom: 2,
  noseAlar: [48, 115, 131, 49, 278, 344, 360, 279, 98, 327, 64, 294],
  // MediaPipe FaceMesh는 "본인 기준" 좌우예요. FACEMESH_LEFT_* 묶음에 263·362·454가
  // 들어가므로 454 쪽이 본인의 왼쪽(사진에서는 오른편)입니다.
  cheekRight: [234, 127, 93, 116, 117], // 본인 오른쪽 뺨 = 서악(金)
  cheekLeft: [454, 356, 323, 345, 346], // 본인 왼쪽 뺨 = 동악(木)
  jawL: [172, 136, 150, 149],
  jawR: [397, 365, 379, 378],
  mouth: [61, 291, 13, 14, 0, 17, 78, 308, 37, 267],
  mouthCornerL: 61,
  mouthCornerR: 291,
  lipTop: 0,
  lipBottom: 17,
  chin: [152, 175, 148, 377],
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
  const leftX = Math.min(...xs(lm, P.cheekRight));  // 사진 왼편 = 본인 오른쪽
  const rightX = Math.max(...xs(lm, P.cheekLeft));  // 사진 오른편 = 본인 왼쪽
  const W = rightX - leftX;
  if (!(H > 0) || !(W > 0)) throw new Error('얼굴 크기를 잴 수 없어요');

  const browY = avg([meanY(lm, P.browL), meanY(lm, P.browR)]);
  const noseBottomY = lm[P.noseBottom].y;
  const midX = (leftX + rightX) / 2;

  // 삼정(三停): 이마 / 눈·코 / 입·턱 — 초년·중년·말년
  const sang = (browY - topY) / H;
  const jung = (noseBottomY - browY) / H;
  const ha = (chinY - noseBottomY) / H;

  // 눈
  const lidGap = (pairs) => avg(pairs.map(([a, b]) => Math.abs(lm[a].y - lm[b].y)));
  const eyeW = avg([spanX(lm, P.eyeL), spanX(lm, P.eyeR)]) / W;
  const eyeH = avg([lidGap(P.eyeLidL), lidGap(P.eyeLidR)]) / H;
  const eyeGap = Math.abs(lm[P.eyeInnerR].x - lm[P.eyeInnerL].x) / W; // 명궁(인당) 너비

  // 코
  const noseLen = (noseBottomY - lm[P.bridgeTop].y) / H;
  const noseW = spanX(lm, P.noseAlar) / W;
  // 콧대 높이: 코끝이 광대보다 얼마나 앞으로 나왔는지 (z는 작을수록 앞)
  const cheekZ = avg([meanZ(lm, P.cheekRight), meanZ(lm, P.cheekLeft)]);
  const noseZ = (cheekZ - (lm[P.noseTip].z ?? 0)) / W;

  // 입·턱
  const mouthW = Math.abs(lm[P.mouthCornerR].x - lm[P.mouthCornerL].x) / W;
  const lipH = Math.abs(lm[P.lipBottom].y - lm[P.lipTop].y) / H;
  const mouthCornerLift = (avg([lm[P.mouthCornerL].y, lm[P.mouthCornerR].y]) - lm[P.lipTop].y) / H;
  const jawW = (Math.max(...xs(lm, P.jawR)) - Math.min(...xs(lm, P.jawL))) / W;
  const chinLen = (chinY - lm[P.lipBottom].y) / H;

  // 이마 폭, 광대
  const foreheadW = spanX(lm, P.foreheadSide) / W;
  // 본인 기준 왼쪽(동악·木) / 오른쪽(서악·金)
  const cheekSpreadL = (Math.max(...xs(lm, P.cheekLeft)) - midX) / W;
  const cheekSpreadR = (midX - Math.min(...xs(lm, P.cheekRight))) / W;
  const cheekZL = (cheekZ - meanZ(lm, P.cheekLeft)) / W;
  const cheekZR = (cheekZ - meanZ(lm, P.cheekRight)) / W;

  const faceRatio = H / W; // 길이 ÷ 폭

  return {
    faceRatio, sang, jung, ha,
    eyeW, eyeH, eyeGap,
    noseLen, noseW, noseZ,
    mouthW, lipH, mouthCornerLift,
    jawW, chinLen, foreheadW,
    cheekSpreadL, cheekSpreadR, cheekZL, cheekZR,
  };
}

/**
 * 사진이 관상 보기에 알맞은지 (너무 작거나·치우치거나·기울거나·옆을 보는지)
 * @returns {{ok:boolean, issues:string[], size:number, offset:number, tilt:number, yaw:number}}
 */
export function faceQuality(lm) {
  const topY = Math.min(...ys(lm, P.foreheadTop));
  const chinY = Math.max(...ys(lm, P.chin));
  const leftX = Math.min(...xs(lm, P.cheekRight));
  const rightX = Math.max(...xs(lm, P.cheekLeft));
  const H = chinY - topY;
  const W = rightX - leftX;
  const cx = (leftX + rightX) / 2;
  const cy = (topY + chinY) / 2;

  const eL = { x: avg(xs(lm, P.eyeL)), y: avg(ys(lm, P.eyeL)) };
  const eR = { x: avg(xs(lm, P.eyeR)), y: avg(ys(lm, P.eyeR)) };
  const tilt = Math.abs((Math.atan2(eR.y - eL.y, eR.x - eL.x) * 180) / Math.PI);
  const nose = lm[P.noseTip].x;
  const dl = Math.abs(rightX - nose);
  const dr = Math.abs(nose - leftX);
  const yaw = Math.abs(dl - dr) / Math.max(dl, dr); // 0이면 정면

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
    { key: '눈L', label: '눈 · 감찰관', ...mid(P.eyeL) },
    { key: '눈R', label: '눈', ...mid(P.eyeR) },
    { key: '코', label: '코 · 재백궁', x: lm[P.noseTip].x, y: lm[P.noseTip].y },
    { key: '입', label: '입 · 출납관', ...mid(P.mouth) },
    { key: '턱', label: '턱 · 노복궁', ...mid(P.chin) },
  ];
}

/** 오악(五嶽)·삼정 점수 0~100 — 50이 평균적인 얼굴 */
export function faceScores(m) {
  const 남악 = Math.round(norm(m.sang, 0.24, 0.42) * 0.6 + norm(m.foreheadW, 0.72, 1.0) * 0.4); // 이마 = 火
  const 중악 = Math.round(norm(m.noseLen, 0.26, 0.40) * 0.4 + norm(m.noseW, 0.21, 0.33) * 0.3 + norm(m.noseZ, 0.02, 0.16) * 0.3); // 코 = 土
  const 북악 = Math.round(norm(m.jawW, 0.58, 0.84) * 0.6 + norm(m.chinLen, 0.12, 0.26) * 0.4); // 턱 = 水
  const 동악 = norm(m.cheekSpreadL * 2 + m.cheekZL, 0.88, 1.18); // 본인 왼쪽 광대 = 木
  const 서악 = norm(m.cheekSpreadR * 2 + m.cheekZR, 0.88, 1.18); // 본인 오른쪽 광대 = 金

  const 눈 = Math.round(norm(m.eyeW, 0.17, 0.28) * 0.5 + norm(m.eyeH, 0.025, 0.06) * 0.5);
  const 입 = Math.round(norm(m.mouthW, 0.29, 0.45) * 0.6 + norm(m.lipH, 0.05, 0.12) * 0.4);
  const 명궁 = norm(m.eyeGap, 0.16, 0.28);

  return {
    오악: { 남악, 동악, 중악, 서악, 북악 },
    // 오악 → 오행 (마의상법: 額=火 左顴=木 鼻=土 右顴=金 頦=水)
    오행: [동악, 남악, 중악, 서악, 북악], // [목, 화, 토, 금, 수]
    삼정: {
      상정: Math.round(norm(m.sang, 0.26, 0.40) * 0.6 + norm(m.foreheadW, 0.72, 1.0) * 0.4),
      중정: Math.round(norm(m.jung, 0.28, 0.42) * 0.4 + 중악 * 0.3 + 눈 * 0.3),
      하정: Math.round(norm(m.ha, 0.28, 0.42) * 0.4 + 북악 * 0.3 + 입 * 0.3),
    },
    부위: { 이마: 남악, 눈, 코: 중악, 입, 턱: 북악, 명궁, 광대: Math.round((동악 + 서악) / 2) },
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
  const ratioN = norm(m.faceRatio, 1.10, 1.60); // 길수록 100
  const fhN = norm(m.foreheadW, 0.72, 1.0);     // 이마가 넓을수록 100
  const jawN = norm(m.jawW, 0.58, 0.84);        // 턱이 넓을수록 100
  const chinN = norm(m.chinLen, 0.12, 0.26);    // 턱이 길수록 100
  const square = 100 - Math.abs(fhN - jawN);    // 이마와 턱 폭이 비슷할수록 100

  const 목 = ratioN * 0.6 + (100 - jawN) * 0.4;                       // 길고 마름
  const 화 = (100 - fhN) * 0.5 + (100 - jawN) * 0.5;                  // 위아래가 좁고 뾰족
  const 토 = (100 - ratioN) * 0.35 + jawN * 0.35 + chinN * 0.30;      // 두툼하고 턱이 두둑
  const 금 = square * 0.6 + (100 - Math.abs(ratioN - 40)) * 0.4;      // 네모 반듯
  const 수 = (100 - ratioN) * 0.4 + (100 - chinN) * 0.3 + (100 - jawN) * 0.3; // 둥글고 짧음

  const list = [목, 화, 토, 금, 수].map((v) => clamp(Math.round(v)));
  const el = list.indexOf(Math.max(...list));
  return { ...SHAPE[el], scores: list };
}

// ── 부위별 풀이 (마의상법) ──────────────────────────────────
const tierOf = (s) => (s >= 62 ? 2 : s >= 38 ? 1 : 0);
const PART = {
  이마: {
    palace: '관록궁(官祿宮)', life: '초년운과 윗사람 복',
    text: [
      '이마가 넓게 벌어지기보다 단정하게 모인 편이에요. 마의상법에서는 이런 이마를 두고 ‘스스로 길을 내는 상’이라 했어요. 물려받는 자리보다 내가 만들어 낸 자리에서 빛이 나고, 초년에 돌아가던 길이 서른 이후 한 번에 곧아져요.',
      '이마의 높이와 폭이 고르게 잡힌 중정(中正)한 이마예요. 윗사람에게 밉보이지 않고, 무리 안에서 자기 자리를 잃지 않는 상이에요. 크게 튀지 않아도 끝까지 남는 쪽이 이런 이마예요.',
      '이마가 훤하게 트이고 각이 살아 있는 상이에요. 마의상법은 이마를 하늘(天庭)이라 해서 관운과 윗사람의 덕을 봐요. 어른이 먼저 알아보고 기회를 건네주는 일이 평생에 여러 번 있어요.',
    ],
  },
  눈: {
    palace: '전택궁·감찰관(監察官)', life: '심성과 애정, 사람을 보는 눈',
    text: [
      '눈매가 가늘고 깊은 편이에요. 상법에서는 이런 눈을 ‘속을 쉽게 보이지 않는 눈’이라 해요. 겉으로는 무심해 보여도 속으로 사람을 오래 재고, 한 번 마음을 주면 쉽게 거두지 않아요. 감정보다 판단이 먼저 서는 쪽이에요.',
      '검은자와 흰자의 균형이 잡힌 안정된 눈이에요. 사람을 볼 때 치우치지 않고, 급한 자리에서도 한 박자 늦게 반응해 손해를 덜 봐요. 정이 없지도 넘치지도 않는, 오래 가는 인연을 만드는 눈이에요.',
      '눈이 크고 시원하게 트인 상이에요. 마의상법에서 눈은 마음의 창(心之窓)이라 감정이 그대로 드러나요. 사람이 쉽게 다가오고 정이 깊지만, 그만큼 상처도 빨리 받아요. 내 편을 고르는 눈만 기르면 인복이 크게 붙어요.',
    ],
  },
  코: {
    palace: '재백궁(財帛宮)', life: '중년운과 재물',
    text: [
      '콧대가 가늘고 길이가 아담한 편이에요. 상법에서는 이런 코를 ‘모으기보다 돌리는 코’라 해요. 큰돈을 한 번에 쥐기보다 들어온 돈을 굴려서 늘리는 쪽이 맞고, 내 돈보다 남의 돈을 다루는 일에서 수완이 나와요.',
      '콧대가 곧고 콧방울이 알맞게 받쳐 주는 코예요. 재백궁이 기울지 않아서, 벌이가 크게 출렁이지 않고 쌓이는 상이에요. 사십 줄에 접어들며 그동안 흘려보낸 것들이 한 자리에 모이기 시작해요.',
      '콧대가 반듯하게 서고 콧방울이 두둑한, 상법에서 말하는 재물창고(財庫)가 실한 코예요. 중년에 재물이 붙고 한 번 들어온 것은 잘 새지 않아요. 다만 창고가 큰 만큼 지키려는 마음도 커져서, 쓸 때 쓰는 연습이 평생 숙제예요.',
    ],
  },
  입: {
    palace: '출납관(出納官)', life: '말년 복록과 인복',
    text: [
      '입이 작고 야무지게 다물린 편이에요. 상법에서는 말을 아끼는 입이라 해서, 실언으로 잃는 일이 적어요. 대신 속에 담아 두는 게 많으니 믿는 한 사람에게는 꼭 털어놓고 가는 게 좋아요.',
      '입의 크기와 입술 두께가 고른 복스러운 입이에요. 먹을 복과 사람 복이 함께 붙는 자리라, 어디를 가든 밥 걱정은 덜한 상이에요. 말로 쌓은 신용이 나중에 돈으로 돌아와요.',
      '입이 크고 입술이 도톰한 상이에요. 마의상법은 입을 바다(出納官)에 견주어 복록이 드나드는 문으로 봐요. 사람을 끌어모으고 말로 길을 여는 힘이 커서, 말을 쓰는 일에서 크게 되는 상이에요.',
    ],
  },
  턱: {
    palace: '노복궁(奴僕宮)', life: '말년 안정과 아랫사람 복',
    text: [
      '턱이 갸름하고 선이 고운 편이에요. 상법에서는 예민하고 감각이 앞서는 상으로 봐요. 몸으로 버티기보다 머리와 안목으로 가는 쪽이 맞고, 말년에는 넓게 벌이기보다 좁고 깊게 가는 게 편안해요.',
      '턱선이 무너지지 않고 적당히 받쳐 주는 상이에요. 노년에 기댈 자리가 있고, 아랫사람이나 후배가 끝까지 남아 주는 상이에요. 급하게 뻗지 않아도 쌓인 것이 그대로 가요.',
      '턱이 넓고 두둑하게 받치는 상이에요. 마의상법에서 턱(地閣)은 땅이라, 말년의 집과 터를 봐요. 나이가 들수록 자리가 잡히고 사람이 모이며, 아랫사람이 따르는 복이 있어요.',
    ],
  },
};

const MYEONGGUNG = [
  '두 눈썹 사이 명궁(命宮)이 좁은 편이에요. 한 가지에 깊이 파고드는 집중력이 남다르지만, 마음에 걸린 일을 오래 담아 둬요. 생각이 길어질 때는 몸을 먼저 움직이는 게 약이에요.',
  '명궁(命宮)이 알맞게 트여 있어요. 큰일 앞에서 쉽게 흔들리지 않고, 답답한 자리에서도 숨 쉴 틈을 찾아내는 상이에요.',
  '두 눈썹 사이 명궁(命宮)이 시원하게 트였어요. 마의상법에서는 막힘이 적고 속이 넓은 상으로 봐요. 웬만한 일은 담아 두지 않아 평생 큰 병치레가 적은 자리예요.',
];

// ── 사주 × 관상 교차 ────────────────────────────────────────
const FACE_OF_EL = ['왼쪽 광대(동악)', '이마(남악)', '콧대와 콧방울(중악)', '오른쪽 광대(서악)', '턱과 지각(북악)'];
const FACE_SHORT = ['왼쪽 광대', '이마', '콧대', '오른쪽 광대', '턱'];
const PALACE_OF_EL = ['형제·동료의 자리', '관록과 명예의 자리', '재물창고의 자리', '결단과 의리의 자리', '말년과 터전의 자리'];

// ── 오늘 일진 × 관상 한마디 ────────────────────────────────
// 하늘(천간)과 땅(지지) 두 기운을 각각 어느 오악이 받는지 보고, 날짜로 문장을 골라요.
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
  const sEl = ctx.todayEl;          // 천간 오행
  const bEl = ctx.todayBranchEl;    // 지지 오행
  const sS = 오행점[sEl];
  const bS = 오행점[bEl];
  const sF = an.fav[sEl];
  const bF = an.fav[bEl];

  // 하늘(천간) 쪽 한 문장
  let a;
  if (sF >= 0.3 && sS >= 55) {
    a = `${gz}인 오늘, 하늘로 들어온 ${EL_KO[sEl]} 기운을 당신의 ${FACE_OF_EL[sEl]}이 ${sS}점으로 단단히 받치고 있어요. 사주에도 반가운 기운이라 얼굴과 날이 같은 편에 선 날이에요.`;
  } else if (sF >= 0.3) {
    a = `${gz}인 오늘 들어온 ${EL_KO[sEl]} 기운은 사주에 꼭 필요한 쪽인데, 그 자리를 맡는 ${FACE_OF_EL[sEl]}은 ${sS}점으로 담백해요. 날이 주는 복을 얼굴이 다 받기엔 그릇이 조금 작은 날이에요.`;
  } else if (sF <= -0.3 && sS >= 55) {
    a = `${gz}인 오늘 들어온 ${EL_KO[sEl]} 기운은 사주에는 부담이 되는 쪽이에요. 그런데 그 ${EL1[sEl]}을 맡는 ${FACE_OF_EL[sEl]}이 ${sS}점으로 강하게 서 있어서, 오늘의 부담을 얼굴이 대신 막아 줘요. 마의상법에서 ‘상(相)이 흉(凶)을 가린다’고 한 자리가 오늘이에요.`;
  } else if (sF <= -0.3) {
    a = `${gz}인 오늘 들어온 ${EL_KO[sEl]} 기운은 사주에 부담이 되는 쪽인데, 받쳐 줄 ${FACE_OF_EL[sEl]}도 ${sS}점으로 조용해요. ${PALACE_OF_EL[sEl]}를 건드리는 일은 하루만 미뤄 두세요.`;
  } else {
    a = `${gz}인 오늘 들어온 ${EL_KO[sEl]} 기운은 사주에 크게 치우치지 않아요. 그 자리를 맡는 ${FACE_OF_EL[sEl]}이 ${sS}점이라, 오늘은 날보다 ${FACE_SHORT[sEl]}이 말해 주는 성향 그대로 움직이면 돼요.`;
  }

  // 땅(지지) 쪽 한 문장
  let b;
  if (bEl === sEl) {
    b = `땅에 깔린 기운도 같은 ${EL1[bEl]}이라, 오늘은 ${FACE_SHORT[bEl]} 하나에 하루가 다 걸려 있어요.`;
  } else if (bF >= 0.3 && bS >= 55) {
    b = `땅에 깔린 ${EL_KO[bEl]} 기운도 내게 반가운 쪽인데, 마침 ${FACE_OF_EL[bEl]}이 ${bS}점으로 받쳐 줘요. 겉으로 드러나지 않는 자리에서 일이 먼저 풀리는 날이에요.`;
  } else if (bF >= 0.3) {
    b = `땅에 깔린 ${EL_KO[bEl]} 기운은 내게 필요한 쪽이지만 ${FACE_OF_EL[bEl]}은 ${bS}점으로 조용해요. 오늘의 득은 사람을 통해 들어와요.`;
  } else if (bF <= -0.3 && bS >= 55) {
    b = `땅에 깔린 ${EL_KO[bEl]} 기운은 부담이 되는 쪽인데, ${FACE_OF_EL[bEl]}이 ${bS}점으로 버텨 줘요. 속으로는 피곤해도 겉으로는 무너지지 않는 날이에요.`;
  } else if (bF <= -0.3) {
    b = `땅에 깔린 ${EL_KO[bEl]} 기운까지 부담이 되는 쪽이고 ${FACE_OF_EL[bEl]}도 ${bS}점이라, 오늘은 몸이 먼저 신호를 보낼 수 있어요.`;
  } else {
    b = `땅에 깔린 ${EL_KO[bEl]} 기운은 무던해서, ${FACE_SHORT[bEl]}이 하루를 조용히 받쳐 줘요.`;
  }

  const good = (sF >= 0.3 || sS >= 55) && bF > -0.3;
  return `${a} ${b} ${pick(good ? CLOSE_GOOD : CLOSE_SOFT)}`;
}

/**
 * 관상 풀이 만들기
 * @param m   measureFace 결과
 * @param ctx { analysis, pillars, todayStem, todayEl, name }
 */
export function readFace(m, ctx) {
  const sc = faceScores(m);
  const shape = faceShape(m);
  const an = ctx.analysis;
  const counts = ctx.pillars ? elementCount(ctx.pillars) : [1, 1, 1, 1, 1];

  // 1) 부위별
  const parts = ['이마', '눈', '코', '입', '턱'].map((k) => {
    const score = sc.부위[k];
    const p = PART[k];
    return { key: k, score, palace: p.palace, life: p.life, text: p.text[tierOf(score)] };
  });

  // 2) 사주에 모자란 오행을 얼굴 어디가 받쳐 주는지
  const minCount = Math.min(...counts);
  const lacking = counts.map((c, el) => [c, el]).filter(([c]) => c === minCount).map(([, el]) => el);
  const yong = an.yongsin;
  const faceEl = shape.el;
  const 오행점 = sc.오행;

  const cross = [];
  // (가) 용신을 얼굴이 받쳐 주는가
  const yongFace = 오행점[yong];
  cross.push(
    yongFace >= 55
      ? `사주에서 가장 필요한 기운은 ${EL_KO[yong]}이에요. 그런데 그 ${EL1[yong]}을 맡는 자리가 바로 ${FACE_OF_EL[yong]}인데, 이 자리가 ${yongFace}점으로 뚜렷하게 살아 있어요. 타고난 사주가 모자란 쪽을 얼굴이 직접 메워 주는 상이라, 마의상법에서 말하는 ‘명(命)이 못 채운 것을 상(相)이 채운다’는 자리예요.`
      : `사주에서 가장 필요한 기운은 ${EL_KO[yong]}이고, 그 자리를 맡는 ${FACE_OF_EL[yong]}은 ${yongFace}점으로 담백한 편이에요. 얼굴이 대신 채워 주기보다, ${EL1[yong]}의 기운을 사람과 자리에서 끌어와야 하는 상이에요. ${PALACE_OF_EL[yong]}를 도와주는 사람 곁에 있을 때 일이 가장 잘 풀려요.`,
  );
  // (나) 사주에 아예 없는/가장 적은 오행
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
  // (다) 얼굴 오행형과 사주 궁합
  const fv = an.fav[faceEl];
  cross.push(
    fv >= 0.3
      ? `얼굴 전체는 ${shape.name}이에요. ${shape.desc} ${EL_KO[faceEl]} 기운이 사주에서도 반가운 쪽이라, 생긴 대로 살면 되는 드문 상이에요. 억지로 다른 사람처럼 굴 때 오히려 일이 꼬여요.`
      : fv <= -0.3
        ? `얼굴 전체는 ${shape.name}이에요. ${shape.desc} 다만 ${EL_KO[faceEl]} 기운은 사주에서는 이미 넉넉한 쪽이라, 타고난 성향을 그대로 밀면 과해질 수 있어요. 한 걸음 물러서는 습관 하나가 평생 득이 돼요.`
        : `얼굴 전체는 ${shape.name}이에요. ${shape.desc} ${EL_KO[faceEl]} 기운이 사주와 크게 부딪히지도 돕지도 않아서, 이 얼굴은 내가 쓰기 나름이에요.`,
  );

  // 3) 오늘 일진 × 관상 (날마다 바뀌는 한마디)
  const todayLine = todayFaceLine(오행점, an, ctx);

  // 4) 삼정 — 초년·중년·말년
  const { 상정, 중정, 하정 } = sc.삼정;
  const best = [['초년', 상정, '이마'], ['중년', 중정, '눈과 코'], ['말년', 하정, '입과 턱']].sort((a, b) => b[1] - a[1]);
  const flow = `삼정(三停)으로 보면 초년 ${상정}점, 중년 ${중정}점, 말년 ${하정}점이에요. ${best[0][0]}을 맡는 ${best[0][2]}이 가장 실하니, 이 얼굴은 ${best[0][0]}에 힘이 실리는 상이에요. ${best[2][0]}을 맡는 ${best[2][2]}은 ${best[2][1]}점으로 상대적으로 얌전한데, 마의상법은 모자란 정(停)을 두고 ‘덜 받은 게 아니라 늦게 받는 것’이라 했어요.`;

  return {
    scores: sc,
    shape,
    parts,
    myeonggung: MYEONGGUNG[tierOf(sc.부위.명궁)],
    flow,
    cross,
    todayLine,
    total: Math.round((상정 + 중정 + 하정) / 3),
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

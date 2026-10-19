// 오늘의 운세를 한 장의 그림(PNG)으로 만들어 저장·공유
const W = 1080;
const H = 1440;

const CAT = [
  { key: '사업', label: '커리어운', color: '#2F4FB5' },
  { key: '재물', label: '금전운', color: '#C98A12' },
  { key: '애정', label: '연애운', color: '#E4573F' },
  { key: '건강', label: '건강운', color: '#2E8B57' },
];

const FONT = '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", sans-serif';
const f = (size, weight = 400) => `${weight} ${size}px ${FONT}`;

/** 화면에 그려진 띠 캐릭터 SVG를 그림으로 가져오기 (없으면 건너뜀) */
async function avatarImage(el) {
  if (!el) return null;
  try {
    const svg = el.cloneNode(true);
    svg.setAttribute('width', '320');
    svg.setAttribute('height', '320');
    const xml = new XMLSerializer().serializeToString(svg);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    return img;
  } catch {
    return null;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 줄바꿈해서 그리고, 마지막 y를 돌려줌 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      cy += lineHeight;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

/**
 * 결과 카드 그리기
 * @returns {Promise<Blob>} PNG
 */
export async function drawCard({ result, reading, name, avatarEl }) {
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* 글꼴 없이 진행 */ }
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 바탕
  ctx.fillStyle = '#F4F4F6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 48, 48, W - 96, H - 96, 56);
  ctx.fill();

  const L = 112; // 왼쪽 여백
  const RW = W - L * 2;

  // 머리글
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#7D7D88';
  ctx.font = f(34);
  ctx.fillText(reading.dateLine, L, 160);
  ctx.fillStyle = '#B3B3BD';
  ctx.font = f(28);
  ctx.fillText(reading.ganzhiLine, L, 206);

  // 띠 캐릭터
  const img = await avatarImage(avatarEl);
  if (img) ctx.drawImage(img, W - L - 150, 110, 150, 150);

  // 이름
  ctx.fillStyle = '#1C1C21';
  ctx.font = f(40, 700);
  ctx.fillText(name ? `${name}님의 오늘` : `${reading.zodiacName}띠님의 오늘`, L, 310);

  // 총운
  ctx.fillStyle = '#1C1C21';
  ctx.font = f(168, 800);
  const scoreText = String(result.scores.total);
  ctx.fillText(scoreText, L, 470);
  const sw = ctx.measureText(scoreText).width;
  ctx.fillStyle = '#7D7D88';
  ctx.font = f(44, 500);
  ctx.fillText('점', L + sw + 12, 470);

  // 등급 알약
  const gradeText = reading.grade.label;
  ctx.font = f(34, 700);
  const gw = ctx.measureText(gradeText).width + 56;
  const tone = result.scores.total >= 80
    ? ['#E7EFFE', '#2563EB']
    : result.scores.total >= 60
      ? ['#FDF1DE', '#D97706']
      : ['#FDE8E6', '#DC3B2F'];
  ctx.fillStyle = tone[0];
  roundRect(ctx, L + sw + 90, 412, gw, 66, 33);
  ctx.fill();
  ctx.fillStyle = tone[1];
  ctx.fillText(gradeText, L + sw + 118, 456);

  // 한마디
  ctx.fillStyle = '#1C1C21';
  ctx.font = f(42, 600);
  let y = wrapText(ctx, reading.summary, L, 570, RW, 62);

  // 분야별
  y += 36;
  for (const c of CAT) {
    const item = reading.items.find((i) => i.key === c.key);
    if (!item) continue;
    ctx.fillStyle = '#3A3A42';
    ctx.font = f(34, 600);
    ctx.fillText(c.label, L, y + 10);
    ctx.fillStyle = '#1C1C21';
    ctx.font = f(34, 700);
    const vt = String(item.score);
    ctx.fillText(vt, W - L - ctx.measureText(vt).width, y + 10);

    const barY = y + 28;
    ctx.fillStyle = '#EFEFF3';
    roundRect(ctx, L + 180, barY, RW - 250, 16, 8);
    ctx.fill();
    ctx.fillStyle = c.color;
    roundRect(ctx, L + 180, barY, (RW - 250) * (item.score / 100), 16, 8);
    ctx.fill();
    y += 80;
  }

  // 행운
  y += 16;
  const luckH = 156;
  if (y + luckH > H - 240) y = H - 240 - luckH; // 아래 꼬리말과 겹치지 않게
  ctx.fillStyle = '#F4F4F6';
  roundRect(ctx, L, y, RW, luckH, 32);
  ctx.fill();
  const colW = RW / 2;
  const cells = [
    ['행운의 컬러', reading.lucky.color, reading.lucky.colorHex],
    ['행운의 아이템', reading.lucky.item, null],
  ];
  cells.forEach(([k, v, swatch], i) => {
    const cx = L + colW * i + 48;
    ctx.fillStyle = '#7D7D88';
    ctx.font = f(28);
    ctx.fillText(k, cx, y + 58);
    let tx = cx;
    if (swatch) {
      ctx.fillStyle = swatch;
      ctx.beginPath();
      ctx.arc(cx + 16, y + 106, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#E0E0E6';
      ctx.lineWidth = 2;
      ctx.stroke();
      tx = cx + 44;
    }
    ctx.fillStyle = '#1C1C21';
    ctx.font = f(38, 700);
    ctx.fillText(v, tx, y + 118);
  });

  // 꼬리말
  ctx.fillStyle = '#E8C25C';
  roundRect(ctx, L, H - 176, 72, 72, 18);
  ctx.fill();
  ctx.fillStyle = '#2B1A10';
  ctx.font = `700 44px "Noto Serif KR", "Nanum Myeongjo", serif`;
  ctx.fillText('占', L + 14, H - 120);

  ctx.fillStyle = '#1C1C21';
  ctx.font = f(38, 800);
  ctx.fillText('띠링', L + 96, H - 136);
  ctx.fillStyle = '#9A9AA5';
  ctx.font = f(27);
  ctx.fillText('내 띠가 알려 주는 오늘의 운세 · 재미로 보는 운세예요', L + 96, H - 98);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** 카드 저장 또는 공유. 돌려주는 값: 'shared' | 'saved' | 'failed' */
export async function shareCard(opts, text) {
  let blob;
  try {
    blob = await drawCard(opts);
  } catch {
    return 'failed';
  }
  if (!blob) return 'failed';

  const file = new File([blob], `ttiring-${opts.result.today.y}${opts.result.today.m}${opts.result.today.d}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'shared';
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'saved';
  } catch {
    return 'failed';
  }
}

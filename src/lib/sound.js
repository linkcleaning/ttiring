// 목탁 같은 짧은 '탁' 소리 (외부 파일 없이 WebAudio로 생성)
let ctx;
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* 소리 미지원 */ }
}

export function tock(pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(620 * pitch, t);
  osc.frequency.exponentialRampToValueAtTime(180 * pitch, t + 0.09);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}

/** 결과가 나올 때 "띠-링" 두 음 종소리 */
export function gong() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [[1318.5, 0], [1046.5, 0.16]].forEach(([f, dt]) => {
    [1, 2.76].forEach((ratio, k) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f * ratio;
      const t = t0 + dt;
      const peak = k === 0 ? 0.22 : 0.05;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (k === 0 ? 1.1 : 0.4));
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    });
  });
}

// 진동 (설정에서 끌 수 있음)
let vibrateOn = true;
export const setVibrate = (on) => { vibrateOn = on; };
export const buzz = (pattern) => { if (vibrateOn) navigator.vibrate?.(pattern); };

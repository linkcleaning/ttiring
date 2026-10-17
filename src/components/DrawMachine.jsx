import { useEffect, useRef, useState } from 'react';
import { BRANCHES, BRANCHES_KO, DANG_STARS, HEXAGRAMS, STEMS, STEMS_KO } from '../lib/saju.js';
import { gradeOf } from '../lib/fortune.js';
import { buzz, gong, tock } from '../lib/sound.js';

const rand = (n) => Math.floor(Math.random() * n);
const POOLS = [
  () => STEMS[rand(10)] + BRANCHES[rand(12)],
  () => DANG_STARS[rand(12)].hanja,
  () => HEXAGRAMS[rand(64)].hanja,
  () => String(10 + rand(90)),
];
const LABELS = ['오늘의 일진', '당사주 별', '주역 괘', '오늘의 총운'];

/** 로또 추첨기처럼 일진·당사주·주역·총운 네 칸이 돌다가 하나씩 멈춤 */
export default function DrawMachine({ result, runId, soundOn, onDone }) {
  const [spin, setSpin] = useState(['?', '?', '?', '?']);
  const [stopped, setStopped] = useState(runId ? 0 : -1);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!runId) return undefined;
    const fast = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setStopped(0);
    const iv = setInterval(() => setSpin(POOLS.map((f) => f())), 70);
    const times = fast ? [100, 150, 200, 250] : [900, 1350, 1800, 2400];
    const ts = times.map((t, i) => setTimeout(() => {
      setStopped(i + 1);
      if (soundOn) tock(1 - i * 0.08);
      buzz(i === 3 ? [20, 40, 30] : 12);
    }, t));
    const end = setTimeout(() => {
      clearInterval(iv);
      if (soundOn) gong();
      doneRef.current?.();
    }, times[3] + (fast ? 80 : 650));
    return () => { clearInterval(iv); ts.forEach(clearTimeout); clearTimeout(end); };
  }, [runId, soundOn]);

  const t = result.today;
  const finals = [
    { big: STEMS[t.stem] + BRANCHES[t.branch], sub: `${STEMS_KO[t.stem]}${BRANCHES_KO[t.branch]}일` },
    { big: result.star.hanja, sub: result.star.name },
    { big: result.iching.changed.hanja, sub: result.iching.changed.ko },
    { big: String(result.scores.total), sub: gradeOf(result.scores.total).label },
  ];

  return (
    <div className="grid grid-cols-2 gap-2" aria-live="polite">
      {LABELS.map((label, i) => {
        const done = stopped > i;
        const idle = stopped === -1;
        const isScore = i === 3;
        return (
          <div key={label}
            className={`flex h-[104px] flex-col items-center justify-center rounded-2xl ${done ? 'bg-[#FFF6E5]' : 'bg-bg'} ${done && runId ? 'tile-stop' : ''}`}>
            <span className="text-[12px] text-sub">{label}</span>
            <span className={`mt-1 overflow-hidden leading-none ${!done && !idle ? 'tile-spin' : ''}`}>
              <span className={`tile-char block ${isScore ? 'text-[34px] font-extrabold tabular-nums' : 'font-brush text-[28px]'}
                ${done ? 'text-ink' : 'text-faint'}`}>
                {idle ? '?' : done ? finals[i].big : spin[i]}
              </span>
            </span>
            <span className={`mt-1.5 text-[12px] font-semibold ${done ? 'text-[#B7791F]' : 'text-transparent'}`}>
              {done ? finals[i].sub : '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

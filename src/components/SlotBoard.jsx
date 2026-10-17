import { useEffect, useRef, useState } from 'react';
import { BRANCHES, BRANCHES_KO, BRANCH_EL, STEMS, STEMS_KO, STEM_EL } from '../lib/saju.js';
import { buzz, gong, tock } from '../lib/sound.js';

// 오행별 패 색 (木 초록, 火 빨강, 土 노랑, 金 회색, 水 파랑)
export const EL_STYLE = [
  { bg: '#E3F3EA', fg: '#2E8B57', name: '목' },
  { bg: '#FDE6E2', fg: '#D9432F', name: '화' },
  { bg: '#FBF0D4', fg: '#BF8613', name: '토' },
  { bg: '#EDEFF2', fg: '#7A808C', name: '금' },
  { bg: '#E3E9F8', fg: '#2F4FB5', name: '수' },
];

// 만세력 배치: 왼쪽부터 시주·일주·월주·연주
const COLS = [
  { key: 'hour', label: '시주' },
  { key: 'day', label: '일주' },
  { key: 'month', label: '월주' },
  { key: 'year', label: '연주' },
];
const STOP_ORDER = ['year', 'month', 'day', 'hour']; // 연주부터 하나씩 멈춤
const POOLS = [STEMS, BRANCHES];

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function SlotBoard({ pillars, runId, soundOn, onDone }) {
  const [spinChars, setSpinChars] = useState(() => Array(8).fill('?'));
  const [stopped, setStopped] = useState(8);
  const doneRef = useRef(onDone);
  const soundRef = useRef(soundOn);
  doneRef.current = onDone;
  soundRef.current = soundOn;

  useEffect(() => {
    if (!runId) return undefined;
    const fast = reduceMotion();
    const first = fast ? 150 : 1100;
    const step = fast ? 60 : 340;
    setStopped(0);

    const spin = setInterval(() => {
      setSpinChars(Array.from({ length: 8 }, (_, i) => {
        const pool = POOLS[i % 2];
        return pool[Math.floor(Math.random() * pool.length)];
      }));
    }, 65);

    const timers = Array.from({ length: 8 }, (_, i) =>
      setTimeout(() => {
        setStopped(i + 1);
        if (soundRef.current) tock(i % 2 ? 0.8 : 1);
        buzz(i === 7 ? [20, 40, 30] : 12);
      }, first + i * step),
    );
    const end = setTimeout(() => {
      clearInterval(spin);
      if (soundRef.current) gong();
      doneRef.current?.();
    }, first + 7 * step + (fast ? 100 : 520));

    return () => {
      clearInterval(spin);
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
  }, [runId]);

  const spinning = stopped < 8;

  return (
    <section aria-label="사주팔자 추첨" className="rounded-[22px] border border-line bg-card px-3 pb-3 pt-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[16px] font-bold">나의 사주팔자</h2>
        <p className="text-[12px] text-sub" aria-live="polite">
          {spinning ? '한 글자씩 뽑는 중' : pillars ? '타고난 여덟 글자' : '버튼을 누르면 돌아가요'}
        </p>
      </div>

      <div className="grid grid-cols-[34px_repeat(4,1fr)] gap-x-2 gap-y-2">
        <span />
        {COLS.map((c) => (
          <span key={c.key} className="text-center text-[12px] font-semibold text-sub">{c.label}</span>
        ))}

        {[0, 1].map((row) => (
          <div key={row} className="contents">
            <span className="self-center text-[11px] text-faint">{row === 0 ? '천간' : '지지'}</span>
            {COLS.map((col) => {
              const order = STOP_ORDER.indexOf(col.key) * 2 + row;
              const isStopped = stopped > order;
              const p = pillars?.[col.key];
              const live = spinning && !isStopped;
              let ch = '?';
              let ko = '';
              let el = null;
              if (live) ch = spinChars[order];
              else if (p) {
                ch = row === 0 ? STEMS[p.stem] : BRANCHES[p.branch];
                ko = row === 0 ? STEMS_KO[p.stem] : BRANCHES_KO[p.branch];
                el = row === 0 ? STEM_EL[p.stem] : BRANCH_EL[p.branch];
              }
              const st = el === null ? null : EL_STYLE[el];
              return (
                <div key={`${runId}-${col.key}-${row}-${isStopped}`}
                  className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl
                    ${live ? 'tile-spin bg-[#f1f1f4]' : ''} ${runId && isStopped ? 'tile-stop' : ''} ${!st && !live ? 'bg-[#f4f4f6]' : ''}`}
                  style={st ? { background: st.bg } : undefined}>
                  {st ? (
                    <span className="flex flex-col items-center leading-none" style={{ color: st.fg }}>
                      <span className="font-hand text-[38px] leading-[0.9]">{ko}</span>
                      <span className="mt-0.5 font-brush text-[11px]">{ch}</span>
                    </span>
                  ) : (
                    <span className="tile-char font-brush text-[30px] leading-none"
                      style={{ color: live ? '#9a9aa5' : '#c9c9d1' }}>
                      {ch}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

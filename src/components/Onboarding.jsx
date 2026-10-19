import { useMemo, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { ANIMALS, HOURS, lunarToSolar, manseryeok, natalChart } from '../lib/saju.js';
import { CITY_GROUPS } from '../lib/astro.js';
import { CONCERNS, CONCERN_GROUPS, STEM_COLOR } from '../lib/fortune.js';
import { RELATIONS, newId } from '../lib/people.js';
import { ilju } from '../lib/personality.js';
import { funProfile } from '../lib/profileText.js';
import ZodiacAvatar from './ZodiacAvatar.jsx';
import SlotBoard from './SlotBoard.jsx';
import { FunNotice, Sheet, TopBar } from './ui.jsx';

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear - 1920 + 1 }, (_, i) => thisYear - i);
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const pad = (n) => String(n).padStart(2, '0');
const EMPTY = { name: '', relation: '나', gender: '', calendar: 'solar', year: 1990, month: 1, day: 1, leap: false, time: '', unknownTime: false, city: '', lon: undefined, concerns: [] };
const QUESTIONS = ['오늘 나의 총운은?', '이번 달 재물운은 언제 좋아?', '나는 어떤 사람이야?', '조심해야 할 날은?', '오늘 행운의 컬러는?', '나의 대운 흐름은?'];

const selectCls = 'w-full appearance-none rounded-xl bg-bg px-3 py-3.5 text-center text-[17px] font-medium focus:outline-none focus:ring-2 focus:ring-ink';

function timeLabel(p) {
  if (p.unknownTime || !p.time) return '모름';
  const [h, m] = p.time.split(':').map(Number);
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}시 ${m}분`;
}

export function toProfile(f) {
  const p = {
    id: f.id || newId(),
    relation: f.relation || '나',
    name: (f.name || '').trim(),
    gender: f.gender,
    calendar: f.calendar,
    year: f.year,
    month: f.month,
    day: f.day,
    leap: f.calendar === 'lunar' && f.leap,
    time: f.unknownTime ? '' : f.time,
    city: f.city || '',
    ...(Number.isFinite(f.lon) ? { lon: f.lon } : {}),
    yajasi: !!f.yajasi,
    concerns: f.concerns,
  };
  try { p.hour = natalChart(p).hour; } catch { p.hour = null; }
  return p;
}

/** 태어난 곳 고르기: 전국 시·군 검색 + 목록에 없으면 경도 직접 입력 */
function CityPicker({ city, lon, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [manual, setManual] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [err, setErr] = useState('');

  const groups = useMemo(() => {
    const s = q.trim();
    if (!s) return CITY_GROUPS;
    return CITY_GROUPS
      .map(([g, list]) => [g, list.filter(([n]) => n.includes(s))])
      .filter(([, list]) => list.length);
  }, [q]);
  const found = groups.reduce((a, [, l]) => a + l.length, 0);

  const choose = (name) => { onPick({ city: name, lon: undefined }); setOpen(false); setQ(''); };
  const manualName = manual || q; // 검색한 이름을 그대로 가져다 써요
  const chooseManual = () => {
    const v = Number(manualLon);
    if (!manualName.trim()) { setErr('지역 이름을 적어 주세요.'); return; }
    if (!Number.isFinite(v) || v < 120 || v > 135) { setErr('경도는 120~135 사이 숫자로 넣어 주세요. (예: 126.98)'); return; }
    onPick({ city: manualName.trim(), lon: v });
    setOpen(false); setQ(''); setManual(''); setManualLon(''); setErr('');
  };

  const label = city || '모름 / 해외 (보정 안 함)';
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="mt-1 flex w-full items-center justify-between border-b-2 border-line py-2.5 text-left text-[20px] focus:border-ink focus:outline-none">
        <span className={city ? 'text-ink' : 'text-faint'}>
          {label}{Number.isFinite(lon) && city ? <span className="ml-2 text-[13px] text-faint">경도 {lon}°</span> : null}
        </span>
        <ChevronRight size={20} className="shrink-0 text-faint" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} label="태어난 곳 고르기">
        <h2 className="text-[19px] font-bold">태어난 곳</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-sub">
          읍·면·동은 속한 시·군을 고르면 돼요. 같은 시·군 안에서는 시주가 달라지지 않아요.
        </p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="지역 이름 검색 (예: 고흥, 양평)"
          className="mt-3 w-full rounded-2xl bg-bg px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-ink" />

        <button type="button" onClick={() => choose('')}
          className={`mt-3 w-full rounded-2xl border px-4 py-3.5 text-left text-[15.5px] ${!city ? 'border-ink bg-ink text-white' : 'border-line'}`}>
          모름 / 해외 <span className={`text-[13px] ${!city ? 'text-white/70' : 'text-faint'}`}>· 한국 평균 경도로 계산</span>
        </button>

        {found === 0 ? (
          <p className="mt-5 rounded-2xl bg-bg px-4 py-4 text-[14px] leading-relaxed text-sub">
            “{q}”은(는) 목록에 없어요. 아래에서 직접 넣어 주세요.
          </p>
        ) : groups.map(([g, list]) => (
          <div key={g} className="mt-5">
            <p className="text-[12px] font-semibold text-faint">{g}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {list.map(([n]) => (
                <button key={n} type="button" onClick={() => choose(n)}
                  className={`rounded-full border px-3.5 py-2 text-[14.5px] ${city === n ? 'border-ink bg-ink text-white' : 'border-line bg-card'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-6 rounded-2xl border border-line p-4">
          <p className="text-[14px] font-semibold">목록에 없는 곳 직접 넣기</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-sub">
            해외나 북한처럼 목록에 없는 곳이면 이름과 경도를 넣어 주세요. 지도 앱에서 그 지역을 길게 누르면 경도가 나와요
            (뒤의 숫자, 예: 서울은 126.98).
          </p>
          <input value={manualName} onChange={(e) => { setManual(e.target.value); setErr(''); }} placeholder="지역 이름 (예: 개성)"
            className="mt-3 w-full rounded-xl bg-bg px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ink" />
          <input value={manualLon} onChange={(e) => { setManualLon(e.target.value); setErr(''); }} inputMode="decimal" placeholder="경도 (예: 126.55)"
            className="mt-2 w-full rounded-xl bg-bg px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ink" />
          {err && <p className="mt-2 text-[13px] text-point">{err}</p>}
          <button type="button" onClick={chooseManual}
            className="mt-3 w-full rounded-xl bg-ink py-3 text-[15px] font-semibold text-white">이 지역으로 하기</button>
        </div>

        <button type="button" onClick={() => setOpen(false)}
          className="mt-4 w-full rounded-2xl bg-bg py-3.5 text-[15.5px] font-semibold">닫기</button>
      </Sheet>
    </>
  );
}

/** 진태양시 안내 문구 */
function solarNote(f) {
  try {
    const n = natalChart({ ...toProfile(f), time: f.time });
    if (n.solarMinutes === null) return '';
    const hh = String(Math.floor(n.solarMinutes / 60)).padStart(2, '0');
    const mm = String(n.solarMinutes % 60).padStart(2, '0');
    return `${f.city || '한국 평균 경도'} 기준 진태양시 ${hh}:${mm}, ${HOURS[n.hour].label}로 계산해요`;
  } catch {
    return '';
  }
}

export default function Onboarding({ initial, onDone, onCancel, soundOn, mode = 'first' }) {
  const isAdd = mode === 'add';
  const isEdit = mode === 'edit';
  const [step, setStep] = useState(initial || isAdd ? 0 : -1);
  const [f, setF] = useState(() => (initial
    ? { ...EMPTY, ...initial, unknownTime: initial.hour === null || !initial.time }
    : { ...EMPTY, ...(isAdd ? { relation: '가족', id: newId() } : {}) }));
  const [error, setError] = useState('');
  const [runId, setRunId] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const set = (patch) => { setError(''); setF((v) => ({ ...v, ...patch })); };

  const profile = useMemo(() => toProfile(f), [f]);
  const manse = useMemo(() => (step === 5 ? manseryeok(profile) : null), [step, profile]);

  const canNext = [
    f.gender !== '',
    true,
    f.unknownTime || /^\d{2}:\d{2}$/.test(f.time),
    isAdd || f.concerns.length > 0,
    true,
  ][step];

  const next = () => {
    if (step === 1) {
      if (f.calendar === 'lunar' && !lunarToSolar(f.year, f.month, f.day, f.leap)) {
        setError('없는 음력 날짜예요. 윤달 여부와 날짜를 확인해 주세요.');
        return;
      }
      const d = new Date(Date.UTC(f.year, f.month - 1, f.day));
      if (f.calendar === 'solar' && d.getUTCMonth() !== f.month - 1) {
        setError('없는 날짜예요. 날짜를 다시 확인해 주세요.');
        return;
      }
    }
    if (step === 4) {
      setStep(5);
      setRevealed(false);
      setTimeout(() => setRunId((n) => n + 1), 350);
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };
  const back = () => {
    if (step <= 0) return initial || isAdd ? onCancel?.() : setStep(-1);
    setStep((s) => s - 1);
  };

  // ── 시작 화면 ──
  if (step === -1) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-[#f7f3fb] via-[#f9eef2] to-white">
        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top)]">
          <div className="grid grid-cols-4 gap-3">
            {[6, 2, 3, 11].map((b, i) => (
              <ZodiacAvatar key={b} branch={b} stem={i * 2 + 2} size={62} mood={i % 2 ? 4 : 5} className="bob"
                title={`${ANIMALS[b]} 캐릭터`} />
            ))}
          </div>
          <img src="/icons/icon-192.png" alt="" width="84" height="84" className="mt-9 h-[84px] w-[84px] rounded-[24px] shadow-[0_8px_24px_rgba(150,90,200,.25)]" />
          <h1 className="mt-4 text-[46px] font-extrabold leading-none tracking-[-0.05em]">띠링</h1>
          <p className="mt-3 text-[16px] text-sub">띠링! 오늘 내 띠의 운세가 도착했어요</p>
        </div>
        <div className="no-scrollbar -mb-2 flex gap-2 overflow-x-auto px-4 pb-2">
          {QUESTIONS.map((q) => (
            <span key={q} className="shrink-0 rounded-full border border-white bg-white/70 px-4 py-2.5 text-[14px] shadow-sm">{q}</span>
          ))}
        </div>
        <div className="px-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-8">
          <button type="button" onClick={() => setStep(0)}
            className="w-full rounded-2xl bg-ink py-[18px] text-[17px] font-bold text-white">시작하기</button>
          <p className="mt-3 text-center text-[12px] text-sub">재미로 보는 운세예요. 결과에 너무 마음 쓰지 마세요!</p>
        </div>
      </div>
    );
  }

  // ── 사주 공개 ──
  if (step === 5 && manse) {
    const p = ilju(manse.pillars.day);
    const fp = funProfile(manse);
    const y = manse.pillars.year;
    return (
      <div className="mx-auto min-h-[100dvh] max-w-[440px] px-4 pb-10">
        <TopBar title={isAdd ? `${profile.name || '이 사람'}님의 사주` : '나의 사주'} onBack={isAdd ? onCancel : undefined} />
        <p className="mt-2 text-center text-[15px] text-sub">
          {isAdd
            ? `${f.relation} ${profile.name || ''}님의 여덟 글자예요`
            : (profile.name ? `반가워요, ${profile.name}님!` : '반가워요!')}
        </p>
        <div className="mt-4">
          <SlotBoard pillars={manse.pillars} runId={runId} soundOn={soundOn} onDone={() => setRevealed(true)} />
        </div>
        {revealed && (
          <div className="reveal mt-6">
            <div className="text-center">
              <ZodiacAvatar branch={y.branch} stem={y.stem} size={104} mood={5} className="bob mx-auto" title={`${ANIMALS[y.branch]}띠`} />
              <p className="mt-3 text-[13px] text-sub">{STEM_COLOR[y.stem]} {ANIMALS[y.branch]}띠, 일주는</p>
              <h2 className="mt-1 text-[24px] font-extrabold">{p.name} · {p.label}</h2>
              <p className="mt-1.5 text-[13.5px] text-[#5B3FB0]">{fp.catchphrase}</p>
              <p className="mt-2.5 text-[18px] font-bold">{p.title}</p>
            </div>

            <p className="mt-3 rounded-2xl bg-card px-5 py-4 text-[15.5px] leading-[1.75] text-[#3a3a42]">
              {p.desc} {p.inner}
            </p>

            <div className="mt-4 rounded-2xl bg-card px-5 py-4">
              <p className="text-[12px] text-sub">이런 말 자주 듣죠?</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {fp.heard.map((h) => (
                  <span key={h} className="rounded-full bg-[#FFF6E5] px-3 py-1.5 text-[13.5px] font-medium text-[#B7791F]">“{h}”</span>
                ))}
              </div>
              <dl className="mt-4 space-y-3">
                {[
                  ['💘', '연애할 때', fp.love],
                  ['💼', '어울리는 일', fp.job],
                  ['😮‍💨', '힘들 때는', fp.stress],
                  ['🔋', `에너지 타입 · ${fp.stage.name}`, fp.stage.desc],
                ].map(([emoji, k, v]) => (
                  <div key={k} className="flex gap-3 rounded-2xl bg-bg px-4 py-3">
                    <span className="text-[17px] leading-none" aria-hidden="true">{emoji}</span>
                    <div className="min-w-0">
                      <dt className="text-[12.5px] font-semibold text-sub">{k}</dt>
                      <dd className="mt-0.5 text-[14.5px] leading-[1.65]">{v}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-3 rounded-2xl bg-card px-5 py-4">
              <p className="text-[12px] text-sub">가장 강한 힘</p>
              <p className="mt-1 text-[15px] font-bold text-[#2563EB]">{fp.topGod.key} — {fp.topGod.title}</p>
              <p className="mt-1 text-[14.5px] leading-[1.65] text-[#3a3a42]">{fp.topGod.desc}</p>
              <p className="mt-3 text-[12px] text-sub">타고난 기운</p>
              <p className="mt-1 text-[14.5px] leading-[1.65] text-[#3a3a42]">
                <b>{fp.element.topName}({fp.element.topHanja})</b> 기운이 가장 강해요. {fp.element.topDesc}
              </p>
              {fp.stars.length > 0 && (
                <>
                  <p className="mt-3 text-[12px] text-sub">내 사주에 든 특별한 별</p>
                  <ul className="mt-1.5 space-y-2">
                    {fp.stars.slice(0, 3).map((st) => (
                      <li key={st.title} className="flex gap-2.5 rounded-xl bg-bg px-3.5 py-2.5">
                        <span className="text-[16px] leading-none" aria-hidden="true">{st.emoji}</span>
                        <p className="text-[14px] leading-[1.6]"><b>{st.title}</b> {st.desc}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-3 text-[12px] text-sub">잘 맞는 띠</p>
              <p className="mt-1 text-[14.5px] leading-[1.65]">
                <b className="text-[#2E8B57]">{fp.match.good.map((a) => `${a}띠`).join(', ')}</b>
                <span className="text-sub"> · 조심할 띠 </span>
                <b className="text-[#DC3B2F]">{fp.match.care.map((a) => `${a}띠`).join(', ')}</b>
              </p>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-faint">만세력 탭에서 더 자세히 볼 수 있어요.</p>
            </div>

            <div className="mt-4"><FunNotice /></div>
            <button type="button" onClick={() => onDone(profile)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-[17px] text-[17px] font-bold text-white">
              <Sparkles size={19} /> {isAdd ? '이 사람 운세 보기' : '오늘 운세 보러 가기'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── 입력 단계 ──
  const titles = [
    isAdd ? '누구의 운세를 봐 드릴까요?' : '이름과 성별을 알려 주세요',
    '생년월일을 입력해 주세요',
    '태어난 시간을 입력해 주세요',
    '최근 가장 큰 고민을 골라 주세요',
    '입력한 정보를 확인해 주세요',
  ];

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col bg-card px-4">
      <TopBar title={isAdd ? '사람 추가' : isEdit ? '내 정보 수정' : '사주 등록'} onBack={back} />
      <div className="-mx-4 h-1 bg-bg">
        <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${((step + 1) / 5) * 100}%` }} />
      </div>

      <div className="flex-1 pb-32 pt-8">
        <h2 className="text-[24px] font-bold leading-snug tracking-[-0.03em]">
          {step === 3 && !isAdd && <span className="block">마지막으로,</span>}
          {titles[step]}
        </h2>

        {step === 0 && (
          <div className="mt-8 space-y-8">
            <label className="block">
              <span className="text-[13px] text-sub">이름 {isAdd ? '' : '(선택)'}</span>
              <input type="text" value={f.name} maxLength={10} onChange={(e) => set({ name: e.target.value })}
                placeholder={isAdd ? '예) 아내, 민수' : '불리고 싶은 이름'}
                className="mt-1 w-full border-b-2 border-line bg-transparent py-2.5 text-[22px] placeholder:text-faint focus:border-ink focus:outline-none" />
            </label>
            {isAdd && (
              <div>
                <span className="text-[13px] text-sub">나와의 관계</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {RELATIONS.map((rel) => (
                    <button key={rel} type="button" aria-pressed={f.relation === rel} onClick={() => set({ relation: rel })}
                      className={`rounded-full border px-4 py-2.5 text-[15px] ${f.relation === rel ? 'border-ink bg-ink font-semibold text-white' : 'border-line'}`}>
                      {rel}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <span className="text-[13px] text-sub">성별 (대운 방향 계산에 쓰여요)</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[['M', '남자'], ['F', '여자']].map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={f.gender === k} onClick={() => set({ gender: k })}
                    className={`rounded-2xl border py-4 text-[17px] font-semibold ${f.gender === k ? 'border-ink bg-ink text-white' : 'border-line'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-8">
            <div className="mb-3 grid grid-cols-2 rounded-xl bg-bg p-1" role="radiogroup" aria-label="양력 음력">
              {[['solar', '양력'], ['lunar', '음력']].map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={f.calendar === k} onClick={() => set({ calendar: k, leap: false })}
                  className={`rounded-lg py-2.5 text-[16px] font-medium ${f.calendar === k ? 'bg-card shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-sub'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
              <select aria-label="년" className={selectCls} value={f.year} onChange={(e) => set({ year: Number(e.target.value) })}>
                {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select aria-label="월" className={selectCls} value={f.month} onChange={(e) => set({ month: Number(e.target.value) })}>
                {range(12).map((m) => <option key={m} value={m}>{m}월</option>)}
              </select>
              <select aria-label="일" className={selectCls} value={f.day} onChange={(e) => set({ day: Number(e.target.value) })}>
                {range(f.calendar === 'lunar' ? 30 : 31).map((d) => <option key={d} value={d}>{d}일</option>)}
              </select>
            </div>
            {f.calendar === 'lunar' && (
              <label className="mt-4 flex items-center gap-2 text-[15px] text-sub">
                <input type="checkbox" checked={f.leap} onChange={(e) => set({ leap: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" />
                윤달이에요
              </label>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-8">
            <label className="block">
              <span className="text-[13px] text-sub">시간</span>
              <input type="time" value={f.time} disabled={f.unknownTime} onChange={(e) => set({ time: e.target.value })}
                className="mt-1 w-full border-b-2 border-line bg-transparent py-2.5 text-[24px] focus:border-ink focus:outline-none disabled:text-faint" />
            </label>
            <div className="mt-8">
              <span className="text-[13px] text-sub">태어난 곳 (시간 보정에 쓰여요)</span>
              <CityPicker city={f.city} lon={f.lon} onPick={(v) => set(v)} />
            </div>
            <p className="mt-3 rounded-xl bg-bg px-3 py-2.5 text-[13px] leading-relaxed text-sub">
              {f.time && !f.unknownTime
                ? solarNote(f)
                : '태어난 시간을 몰라도 운세를 볼 수 있어요. 시간을 알면 시주까지 정확해져요.'}
            </p>
            <label className={`mt-5 flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-[15.5px]
              ${f.unknownTime ? 'border-ink bg-ink text-white' : 'border-line bg-card text-ink'}`}>
              <input type="checkbox" checked={f.unknownTime} onChange={(e) => set({ unknownTime: e.target.checked })}
                className="h-6 w-6 shrink-0 accent-[var(--color-ink)]" />
              <span className="font-semibold">태어난 시간을 몰라요</span>
              <span className={`ml-auto text-[13px] ${f.unknownTime ? 'text-white/70' : 'text-faint'}`}>시주 없이 보기</span>
            </label>
          </div>
        )}

        {step === 3 && (
          <>
            <p className="mt-2 text-[14px] text-sub">
              최대 3개까지 고를 수 있어요. 운세에 맞춤 조언으로 보여 드려요.{isAdd && ' 몰라도 건너뛸 수 있어요.'}
            </p>
            <div className="mt-6 space-y-5">
              {CONCERN_GROUPS.map((g) => (
                <div key={g}>
                  <p className="mb-2 text-[13px] font-semibold text-sub">{g}</p>
                  <div className="flex flex-wrap gap-2">
                    {CONCERNS.filter((c) => c.group === g).map(({ key }) => {
                      const on = f.concerns.includes(key);
                      const full = !on && f.concerns.length >= 3;
                      return (
                        <button key={key} type="button" aria-pressed={on} disabled={full}
                          onClick={() => set({ concerns: on ? f.concerns.filter((c) => c !== key) : [...f.concerns, key] })}
                          className={`rounded-full border px-4 py-2.5 text-[15px] transition-colors
                            ${on ? 'border-ink bg-ink font-semibold text-white' : 'border-line'} ${full ? 'opacity-40' : ''}`}>
                          {key}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <dl className="mt-6">
            {[
              ...(isAdd ? [['관계', f.relation, 0]] : []),
              ['이름', profile.name || '입력 안 함', 0],
              ['성별', f.gender === 'M' ? '남자' : '여자', 0],
              ['생년월일', `${f.year}.${pad(f.month)}.${pad(f.day)} (${f.calendar === 'lunar' ? `음력${f.leap ? ' 윤달' : ''}` : '양력'})`, 1],
              ['시간', timeLabel(f), 2],
              ['태어난 곳', f.city || '모름', 2],
              ['고민', f.concerns.join(', ') || '선택 안 함', 3],
            ].map(([k, v, s]) => (
              <button key={k} type="button" onClick={() => setStep(s)}
                className="flex w-full items-center justify-between border-b border-line py-5 text-left">
                <dt className="text-[15px] text-sub">{k}</dt>
                <dd className="flex items-center gap-1 text-[16px] font-bold">{v}<ChevronRight size={16} className="text-faint" /></dd>
              </button>
            ))}
          </dl>
        )}

        {error && <p role="alert" className="mt-5 rounded-xl bg-[#FDECE9] px-3 py-2.5 text-[14px] text-[#C23B26]">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[440px] gap-2 border-t border-line bg-card px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        {step > 0 && (
          <button type="button" onClick={back} className="w-[34%] rounded-2xl bg-bg py-4 text-[17px] font-semibold">이전</button>
        )}
        <button type="button" onClick={next} disabled={!canNext}
          className="flex-1 rounded-2xl bg-ink py-4 text-[17px] font-semibold text-white disabled:bg-bg disabled:text-faint">
          {step === 4 ? (isAdd ? '사주 뽑기' : '내 사주 뽑기') : step === 3 && isAdd && f.concerns.length === 0 ? '건너뛰기' : '다음'}
        </button>
      </div>
    </div>
  );
}

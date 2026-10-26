import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, Images, RefreshCw, ScanFace, ShieldCheck, Sparkles } from 'lucide-react';
import { computeFortune, manseryeok } from '../lib/saju.js';
import { FACE_ERR, detectFace, fileToImage, prepare } from '../lib/faceModel.js';
import { EL_KO, faceContext, faceMarkers, measureFace, readFace } from '../lib/gwansang.js';
import { Card, FunNotice, Term } from './ui.jsx';
import { personLabel } from '../lib/people.js';

const KEY = (id) => `ttiring.face.${id}`;
const load = (id) => {
  try {
    const v = localStorage.getItem(KEY(id));
    return v ? JSON.parse(v) : null;
  } catch { return null; }
};
const save = (id, v) => {
  try {
    if (v === null) localStorage.removeItem(KEY(id));
    else localStorage.setItem(KEY(id), JSON.stringify(v));
  } catch { /* 저장 불가 */ }
};

const STEPS = [
  '얼굴의 열두 자리를 잡는 중…',
  '삼정(三停)을 재는 중 — 이마·코·턱',
  '오악(五嶽)을 살피는 중 — 이마·광대·코·턱',
  '명궁과 재백궁을 읽는 중…',
  '사주 여덟 글자와 맞춰 보는 중…',
];
const SCAN_DOTS = [
  { top: '24%', left: '50%', label: '이마' },
  { top: '38%', left: '33%', label: '눈' },
  { top: '38%', left: '67%', label: '눈' },
  { top: '54%', left: '50%', label: '코' },
  { top: '68%', left: '50%', label: '입' },
  { top: '80%', left: '50%', label: '턱' },
];

function Bar({ label, score, sub }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[72px] shrink-0 text-[13.5px] font-semibold">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${score}%` }} />
      </div>
      <span className="w-[34px] shrink-0 text-right text-[13.5px] font-bold tabular-nums">{score}</span>
      {sub && <span className="w-[26px] shrink-0 text-[11px] text-faint">{sub}</span>}
    </div>
  );
}

function PartCard({ part, delay }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="reveal rounded-[20px] border border-line bg-card" style={{ animationDelay: `${delay}ms` }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full p-4 text-left">
        <div className="flex items-center gap-2">
          <h3 className="text-[15.5px] font-bold">{part.key}</h3>
          <span className="rounded-full bg-bg px-2 py-0.5 text-[11.5px] text-sub">{part.palace}</span>
          <span className="ml-auto text-[16px] font-bold tabular-nums">{part.score}</span>
          <ChevronDown size={17} className={`text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
        <p className="mt-1.5 text-[12.5px] text-faint">{part.life}</p>
      </button>
      {open && (
        <p className="fade-in px-4 pb-4 text-[14.5px] leading-[1.8] text-[#3a3a42]">{part.text}</p>
      )}
    </section>
  );
}

export default function FaceTab({ profile, dateOffset = 0, toast }) {
  const [saved, setSaved] = useState(() => load(profile.id));
  const [photo, setPhoto] = useState(null);
  const [phase, setPhase] = useState(saved ? 'done' : 'idle'); // idle | scanning | done | error
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const camRef = useRef(null);
  const fileRef = useRef(null);
  const aliveRef = useRef(true);

  // 화면을 떠난 뒤에 결과를 그리지 않으려는 표시 (다시 들어오면 되살려요)
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);
  useEffect(() => {
    setSaved(load(profile.id));
    setPhoto(null);
    setPhase(load(profile.id) ? 'done' : 'idle');
    setError('');
  }, [profile.id]);

  // 분석 중일 때만 안내 문구를 넘겨요
  useEffect(() => {
    if (phase !== 'scanning') return undefined;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 900);
    return () => clearInterval(t);
  }, [phase]);

  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d;
  }, [dateOffset]);

  const reading = useMemo(() => {
    if (!saved?.measures) return null;
    try {
      const manse = manseryeok(profile);
      if (!manse) return null;
      const fortune = computeFortune(profile, date);
      return readFace(saved.measures, faceContext(manse, fortune));
    } catch {
      return null;
    }
  }, [saved, profile, date]);

  const run = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setStep(0);
    let shot;
    try {
      shot = await fileToImage(file);
    } catch (e) {
      setError(e.message || FACE_ERR.read);
      setPhase('error');
      return;
    }
    setPhoto(shot.dataUrl);
    setPhase('scanning');
    const started = Date.now();
    try {
      const pts = await detectFace(shot.canvas);
      const measures = measureFace(pts);
      const markers = faceMarkers(pts);
      // 분석이 너무 빨리 끝나도 스캔이 보이도록 잠깐 기다려요
      await new Promise((r) => setTimeout(r, Math.max(0, 2600 - (Date.now() - started))));
      if (!aliveRef.current) return;
      const next = { measures, markers, photo: shot.dataUrl, at: Date.now() };
      setSaved(next);
      save(profile.id, { measures, markers, at: next.at }); // 사진은 저장하지 않아요
      setPhase('done');
      toast?.('관상 분석을 마쳤어요');
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e.message || FACE_ERR.model);
      setPhase('error');
    }
  }, [profile.id, toast]);

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 사진을 다시 골라도 동작하게
    run(file);
  };

  const reset = () => { setPhoto(null); setPhase('idle'); setError(''); };
  const name = profile.name?.trim();
  const who = profile.id === 'me' ? (name ? `${name}님` : '내') : `${personLabel(profile)}님의`;
  const shownPhoto = photo || saved?.photo || null;

  return (
    <div className="pb-6 pt-1">
      <input ref={camRef} type="file" accept="image/*" capture="user" onChange={onPick} className="hidden" aria-hidden="true" tabIndex={-1} />
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" aria-hidden="true" tabIndex={-1} />

      {/* ── 사진 없음 ── */}
      {phase === 'idle' && (
        <>
          <Card className="text-center">
            <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-bg">
              <ScanFace size={34} strokeWidth={1.7} />
            </div>
            <h2 className="mt-3 text-[19px] font-bold">{who} 관상 보기</h2>
            <p className="mt-2 text-[14.5px] leading-[1.75] text-sub">
              정면 사진 한 장이면 <Term name="삼정" className="font-semibold text-ink">삼정(三停)</Term>과{' '}
              <Term name="오악" className="font-semibold text-ink">오악(五嶽)</Term>을 재서,
              내 사주에서 모자란 기운을 얼굴이 어떻게 받쳐 주는지 풀어 드려요.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => camRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink py-4 text-[15.5px] font-semibold text-white">
                <Camera size={18} aria-hidden="true" /> 사진 찍기
              </button>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-card py-4 text-[15.5px] font-semibold">
                <Images size={18} aria-hidden="true" /> 앨범에서
              </button>
            </div>
          </Card>

          <aside className="mt-3 flex gap-2.5 rounded-[20px] bg-[#EFF6EE] px-4 py-3.5" aria-label="사진 처리 안내">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#3f7a4f]" aria-hidden="true" />
            <p className="text-[13px] leading-[1.7] text-[#34503a]">
              사진은 <b>휴대폰 안에서만</b> 분석하고 어디로도 보내지 않아요. 분석이 끝나면 사진은 저장하지 않고
              잰 수치만 남겨요. 앱을 지우면 함께 사라져요.
            </p>
          </aside>

          <Card title="잘 나오는 사진" delay={60} className="mt-3">
            <ul className="space-y-1.5 text-[14px] leading-[1.7] text-sub">
              <li>· 얼굴이 화면에 크게, 정면으로 나오게</li>
              <li>· 앞머리나 모자로 이마를 가리지 않게</li>
              <li>· 밝은 곳에서, 안경은 벗는 쪽이 정확해요</li>
              <li>· 웃지 않은 담담한 표정이 본래 상에 가까워요</li>
            </ul>
          </Card>
          <div className="mt-3"><FunNotice /></div>
        </>
      )}

      {/* ── 분석 중 ── */}
      {phase === 'scanning' && (
        <Card title="정밀 분석 중" right={<Sparkles size={16} className="text-faint" />}>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-[20px] bg-bg">
            {shownPhoto && <img src={shownPhoto} alt="" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-ink/15" aria-hidden="true" />
            <div className="scan-line absolute inset-x-0 h-[3px] bg-[#E8C25C] shadow-[0_0_14px_4px_rgba(232,194,92,.65)]" aria-hidden="true" />
            {SCAN_DOTS.map((d, i) => (
              <span key={`${d.label}-${i}`} className="scan-dot absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#E8C25C] bg-[#E8C25C]/35"
                style={{ top: d.top, left: d.left, animationDelay: `${i * 260}ms` }} aria-hidden="true" />
            ))}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-3 pt-8">
              <p className="text-[13px] font-medium text-white">{STEPS[step]}</p>
            </div>
          </div>
          <p className="mt-4 text-center text-[13px] leading-relaxed text-sub">
            처음 한 번은 분석기를 내려받느라 몇 초 걸려요.<br />사진은 휴대폰 밖으로 나가지 않아요.
          </p>
        </Card>
      )}

      {/* ── 실패 ── */}
      {phase === 'error' && (
        <Card title="분석하지 못했어요">
          <p className="text-[15px] leading-[1.8]">{error}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-faint">
            얼굴을 못 찾았을 때 억지로 결과를 지어내지 않아요. 사진을 바꿔서 다시 해 주세요.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => camRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink py-3.5 text-[15px] font-semibold text-white">
              <Camera size={17} aria-hidden="true" /> 다시 찍기
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-card py-3.5 text-[15px] font-semibold">
              <Images size={17} aria-hidden="true" /> 다른 사진
            </button>
          </div>
        </Card>
      )}

      {/* ── 결과 ── */}
      {phase === 'done' && reading && (
        <div className="space-y-3">
          <section className="reveal rounded-[22px] border-[1.5px] border-ink bg-card p-5">
            <div className="flex items-center gap-4">
              {shownPhoto ? (
                <div className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-2xl">
                  <img src={shownPhoto} alt="" className="h-full w-full object-cover" />
                  {saved?.markers?.map((mk) => (
                    <span key={mk.key} className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E8C25C] ring-1 ring-white/70"
                      style={{ left: `${mk.x * 100}%`, top: `${mk.y * 100}%` }} aria-hidden="true" />
                  ))}
                </div>
              ) : (
                <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl bg-bg">
                  <ScanFace size={34} strokeWidth={1.6} className="text-faint" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[13px] text-sub">얼굴 오행형</p>
                <p className="mt-0.5 text-[22px] font-extrabold leading-tight">{reading.shape.name}</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-sub">{reading.shape.desc}</p>
              </div>
            </div>
          </section>

          <Card title="오늘 일진과 내 관상" right={<span className="text-[12px] text-sub">날마다 바뀌어요</span>} delay={40}>
            <p className="text-[15.5px] leading-[1.85] text-[#3a3a42]">{reading.todayLine}</p>
          </Card>

          <Card title="오악(五嶽)" right={<span className="text-[12px] text-sub">50이 보통</span>} delay={80}>
            <div className="space-y-2.5">
              {[['이마 · 남악', reading.scores.오악.남악, '火'],
                ['왼광대 · 동악', reading.scores.오악.동악, '木'],
                ['코 · 중악', reading.scores.오악.중악, '土'],
                ['오른광대 · 서악', reading.scores.오악.서악, '金'],
                ['턱 · 북악', reading.scores.오악.북악, '水']].map(([l, v, e]) => (
                  <Bar key={l} label={l} score={v} sub={e} />
                ))}
            </div>
            <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-[12.5px] leading-relaxed text-sub">
              마의상법은 얼굴의 다섯 봉우리를 오악이라 불러요. 이마는 남악(火), 왼쪽 광대는 동악(木),
              코는 중악(土), 오른쪽 광대는 서악(金), 턱은 북악(水)이에요. 이 다섯이 사주의 오행과 맞물려요.
            </p>
          </Card>

          <Card title="삼정(三停) — 초년·중년·말년" delay={120}>
            <div className="space-y-2.5">
              <Bar label="초년 · 이마" score={reading.scores.삼정.상정} />
              <Bar label="중년 · 눈코" score={reading.scores.삼정.중정} />
              <Bar label="말년 · 입턱" score={reading.scores.삼정.하정} />
            </div>
            <p className="mt-3 text-[14.5px] leading-[1.8] text-[#3a3a42]">{reading.flow}</p>
          </Card>

          <div className="space-y-2">
            {reading.parts.map((p, i) => <PartCard key={p.key} part={p} delay={160 + i * 50} />)}
          </div>

          <Card title="명궁(命宮)" delay={400}>
            <p className="text-[14.5px] leading-[1.8] text-[#3a3a42]">{reading.myeonggung}</p>
          </Card>

          <Card title="사주 × 관상 교차 풀이" right={<span className="text-[12px] text-sub">명(命)과 상(相)</span>} delay={440}>
            <div className="space-y-3">
              {reading.cross.map((c, i) => (
                <p key={i} className="text-[15px] leading-[1.85] text-[#3a3a42]">{c}</p>
              ))}
            </div>
          </Card>

          <button type="button" onClick={reset}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-line bg-card py-4 text-[15.5px] font-semibold">
            <RefreshCw size={17} aria-hidden="true" /> 다른 사진으로 다시 보기
          </button>

          <aside className="rounded-[20px] bg-[#F6F1FF] px-5 py-4" aria-label="관상 이용 안내">
            <p className="text-[14px] font-bold text-[#5B3FB0]">관상은 이렇게 봐 주세요</p>
            <p className="mt-1.5 text-[13.5px] leading-[1.7] text-[#4a4458]">
              얼굴의 비율은 사진에서 실제로 잰 값이지만, 그 비율을 운으로 풀이하는 건 옛 책의 이야기예요.
              사람의 값어치나 앞날은 얼굴로 정해지지 않아요. 재미로만 봐 주세요.
            </p>
          </aside>
        </div>
      )}

      {phase === 'done' && !reading && (
        <Card title="관상 풀이를 만들지 못했어요">
          <p className="text-[15px] leading-[1.8]">사주 정보가 모자라요. 설정에서 생년월일을 확인해 주세요.</p>
          <button type="button" onClick={reset} className="mt-4 w-full rounded-2xl bg-ink py-3.5 text-[15px] font-semibold text-white">
            다시 시도
          </button>
        </Card>
      )}
    </div>
  );
}

export { prepare as prepareFaceModel, EL_KO };

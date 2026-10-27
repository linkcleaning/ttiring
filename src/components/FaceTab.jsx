import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, Images, RefreshCw, ScanFace, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { computeFortune, manseryeok } from '../lib/saju.js';
import {
  CAM_ERR, FACE_ERR, cameraSupported, captureFrame, closeCamera, detectFace, fileToImage, openCamera,
} from '../lib/faceModel.js';
import { faceContext, faceMarkers, faceQuality, measureFace, readFace } from '../lib/gwansang.js';
import { Card, FunNotice, Term } from './ui.jsx';
import PersonBar from './PersonBar.jsx';
import { Sheet } from './ui.jsx';
import { clearFace, loadFace, saveFace } from '../lib/faceStore.js';
import { personLabel } from '../lib/people.js';

const ASPECT = 3 / 4; // 카메라 화면 비율 (가로÷세로)

const STEPS = [
  '얼굴의 열두 자리를 잡는 중…',
  '삼정(三停)을 재는 중 — 이마·코·턱',
  '오악(五嶽)을 살피는 중 — 이마·광대·코·턱',
  '명궁과 재백궁을 읽는 중…',
  '사주 여덟 글자와 맞춰 보는 중…',
];
const SCAN_DOTS = [
  { top: '24%', left: '50%' }, { top: '38%', left: '33%' }, { top: '38%', left: '67%' },
  { top: '54%', left: '50%' }, { top: '68%', left: '50%' }, { top: '80%', left: '50%' },
];

/** 얼굴을 맞출 타원 가이드 (삼정 선 포함) */
function FaceGuide() {
  return (
    <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <mask id="ttiring-face-hole">
          <rect width="300" height="400" fill="white" />
          <ellipse cx="150" cy="196" rx="97" ry="130" fill="black" />
        </mask>
      </defs>
      <rect width="300" height="400" fill="rgba(16,16,20,.52)" mask="url(#ttiring-face-hole)" />
      <ellipse cx="150" cy="196" rx="97" ry="130" fill="none" stroke="#E8C25C" strokeWidth="2.5" strokeDasharray="10 8" />
      {/* 삼정 기준선: 눈썹 / 코끝 */}
      <line x1="80" y1="153" x2="220" y2="153" stroke="#E8C25C" strokeWidth="1.2" strokeDasharray="4 6" opacity=".75" />
      <line x1="80" y1="240" x2="220" y2="240" stroke="#E8C25C" strokeWidth="1.2" strokeDasharray="4 6" opacity=".75" />
      <text x="150" y="147" textAnchor="middle" fill="#E8C25C" fontSize="11">눈썹</text>
      <text x="150" y="234" textAnchor="middle" fill="#E8C25C" fontSize="11">코끝</text>
    </svg>
  );
}

function Bar({ label, score, sub }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[76px] shrink-0 text-[13.5px] font-semibold">{label}</span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${score}%` }} />
      </div>
      <span className="w-[30px] shrink-0 text-right text-[13.5px] font-bold tabular-nums">{score}</span>
      {sub && <span className="w-[22px] shrink-0 text-[11px] text-faint">{sub}</span>}
    </div>
  );
}

function PartCard({ part, delay, open, onToggle }) {
  return (
    <section className="reveal rounded-[20px] border border-line bg-card" style={{ animationDelay: `${delay}ms` }}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full p-4 text-left">
        <div className="flex items-center gap-2">
          <h3 className="shrink-0 text-[15.5px] font-bold">{part.key}</h3>
          {part.name && (
            <span className="shrink-0 rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-white">
              {part.name}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[16px] font-bold tabular-nums">{part.score}</span>
          <ChevronDown size={17} className={`shrink-0 text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
        <p className="mt-1.5 truncate text-[12.5px] text-faint">
          {part.palace}{part.hanja ? ` · ${part.hanja}` : ''} · {part.life}{part.age ? ` · ${part.age}` : ''}
        </p>
      </button>
      {open && <p className="fade-in px-4 pb-4 text-[14.5px] leading-[1.85] text-[#3a3a42]">{part.text}</p>}
    </section>
  );
}

export default function FaceTab({ profile, people = [], activeId, onSelectPerson, onAddPerson, dateOffset = 0, toast }) {
  const [saved, setSaved] = useState(() => loadFace(profile.id));
  const [photo, setPhoto] = useState(null);
  const [phase, setPhase] = useState(saved ? 'done' : 'idle'); // idle|camera|scanning|done|error
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [camError, setCamError] = useState('');
  const [ready, setReady] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const [openPart, setOpenPart] = useState('눈');
  const [allOpen, setAllOpen] = useState(false);
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; closeCamera(streamRef.current); streamRef.current = null; };
  }, []);

  useEffect(() => {
    const s = loadFace(profile.id);
    setSaved(s);
    setPhoto(null);
    setPhase(s ? 'done' : 'idle');
    setError('');
  }, [profile.id]);

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
      return readFace(saved.measures, faceContext(manse, computeFortune(profile, date)));
    } catch { return null; }
  }, [saved, profile, date]);

  const stopCam = useCallback(() => {
    closeCamera(streamRef.current);
    streamRef.current = null;
    setReady(false);
  }, []);

  const analyse = useCallback(async (shot) => {
    setPhoto(shot.dataUrl);
    setPhase('scanning');
    setStep(0);
    const started = Date.now();
    try {
      const pts = await detectFace(shot.canvas);
      const measures = measureFace(pts);
      const markers = faceMarkers(pts);
      const quality = faceQuality(pts);
      await new Promise((r) => setTimeout(r, Math.max(0, 2600 - (Date.now() - started))));
      if (!aliveRef.current) return;
      const next = { measures, markers, quality, photo: shot.dataUrl, at: Date.now() };
      setSaved(next);
      saveFace(profile.id, { measures, markers, quality, at: next.at }); // 사진은 저장하지 않아요
      setPhase('done');
      toast?.(quality.ok ? '관상 분석을 마쳤어요' : '분석했어요. 다시 찍으면 더 정확해요');
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e.message || FACE_ERR.model);
      setPhase('error');
    }
  }, [profile.id, toast]);

  const startCamera = useCallback(async () => {
    setCamError('');
    setError('');
    setPhase('camera');
    setReady(false);
    try {
      const stream = await openCamera();
      if (!aliveRef.current) { closeCamera(stream); return; }
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
        setReady(true);
      }
    } catch (e) {
      stopCam();
      setCamError(e.message || CAM_ERR.none);
      setPhase('idle');
    }
  }, [stopCam]);

  const shoot = useCallback(() => {
    try {
      const shot = captureFrame(videoRef.current, ASPECT);
      stopCam();
      analyse(shot);
    } catch (e) {
      stopCam();
      setError(e.message || FACE_ERR.read);
      setPhase('error');
    }
  }, [analyse, stopCam]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    stopCam();
    setError('');
    try {
      analyse(await fileToImage(file));
    } catch (err) {
      setError(err.message || FACE_ERR.read);
      setPhase('error');
    }
  };

  const reset = () => { stopCam(); setPhoto(null); setError(''); setPhase('idle'); };
  const doClear = () => {
    clearFace(profile.id);
    setAskClear(false);
    setSaved(null);
    reset();
    toast?.('관상 기록을 지웠어요');
  };
  const name = profile.name?.trim();
  const who = profile.id === 'me' ? (name ? `${name}님` : '내') : `${personLabel(profile)}님의`;
  const shownPhoto = photo || saved?.photo || null;
  const quality = saved?.quality;

  return (
    <div className="pb-6 pt-1">
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" aria-hidden="true" tabIndex={-1} />

      {/* 사람 고르기 — 관상도 사람마다 따로 저장돼요 */}
      {phase !== 'camera' && phase !== 'scanning' && onSelectPerson && (
        <div className="mb-3">
          <PersonBar people={people} activeId={activeId ?? profile.id} onSelect={onSelectPerson} onAdd={onAddPerson} />
        </div>
      )}

      {/* ── 시작 ── */}
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
            <button type="button" onClick={startCamera}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-[16px] font-semibold text-white">
              <Camera size={19} className="shrink-0" aria-hidden="true" /> 얼굴 맞춰 찍기
            </button>
            <p className="mt-2 text-[12.5px] text-faint">화면에 타원 가이드가 나와요. 거기에 얼굴을 맞추면 돼요.</p>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-card py-3.5 text-[15px] font-semibold">
              <Images size={17} className="shrink-0" aria-hidden="true" /> 앨범에서 고르기
            </button>
            {camError && <p className="mt-3 rounded-xl bg-[#FDECE9] px-3 py-2.5 text-[13px] leading-relaxed text-[#C23B26]">{camError}</p>}
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
              <li>· 얼굴을 타원 가이드에 꽉 차게</li>
              <li>· 앞머리나 모자로 이마를 가리지 않게</li>
              <li>· 밝은 곳에서, 안경은 벗는 쪽이 정확해요</li>
              <li>· 웃지 않은 담담한 표정이 본래 상에 가까워요</li>
            </ul>
          </Card>
          <div className="mt-3"><FunNotice /></div>
        </>
      )}

      {/* ── 카메라 ── */}
      {phase === 'camera' && (
        <Card title="얼굴을 타원에 맞춰 주세요"
          right={<button type="button" onClick={reset} aria-label="카메라 닫기" className="rounded-full p-1 text-sub"><X size={20} /></button>}>
          <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[20px] bg-ink" style={{ aspectRatio: '3 / 4' }}>
            <video ref={videoRef} playsInline muted autoPlay className="h-full w-full -scale-x-100 object-cover" />
            <FaceGuide />
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-center text-[12.5px] leading-relaxed text-white">
              눈썹은 위 점선, 코끝은 아래 점선에 맞추면 가장 정확해요
            </p>
          </div>
          <button type="button" onClick={shoot} disabled={!ready}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-[16px] font-semibold text-white disabled:bg-[#55555e]">
            <Camera size={19} className="shrink-0" aria-hidden="true" /> {ready ? '찍기' : '카메라 켜는 중…'}
          </button>
          <button type="button" onClick={() => { stopCam(); fileRef.current?.click(); }}
            className="mt-2 w-full rounded-2xl border border-line bg-card py-3.5 text-[15px] font-semibold">
            앨범에서 고르기
          </button>
        </Card>
      )}

      {/* ── 분석 중 ── */}
      {phase === 'scanning' && (
        <Card title="정밀 분석 중" right={<Sparkles size={16} className="text-faint" />}>
          <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[20px] bg-bg" style={{ aspectRatio: '3 / 4' }}>
            {shownPhoto && <img src={shownPhoto} alt="" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-ink/15" aria-hidden="true" />
            <div className="scan-line absolute inset-x-0 h-[3px] bg-[#E8C25C] shadow-[0_0_14px_4px_rgba(232,194,92,.65)]" aria-hidden="true" />
            {SCAN_DOTS.map((d, i) => (
              <span key={i} className="scan-dot absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#E8C25C] bg-[#E8C25C]/35"
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
            얼굴을 못 찾았을 때 억지로 결과를 지어내지 않아요. 다시 찍어 주세요.
          </p>
          <button type="button" onClick={startCamera}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[15.5px] font-semibold text-white">
            <Camera size={18} className="shrink-0" aria-hidden="true" /> 얼굴 맞춰 다시 찍기
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="mt-2 w-full rounded-2xl border border-line bg-card py-3.5 text-[15px] font-semibold">
            앨범에서 고르기
          </button>
        </Card>
      )}

      {/* ── 결과 ── */}
      {phase === 'done' && reading && (
        <div className="space-y-3">
          {quality && !quality.ok && (
            <aside className="reveal rounded-[20px] bg-[#FFF6E5] px-4 py-3.5" aria-label="사진 상태 안내">
              <p className="text-[13.5px] font-bold text-[#B7791F]">다시 찍으면 더 정확해요</p>
              <ul className="mt-1.5 space-y-1 text-[13px] leading-[1.7] text-[#6b5520]">
                {quality.issues.map((i) => <li key={i}>· {i}</li>)}
              </ul>
            </aside>
          )}

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
                <p className="text-[13px] text-sub">{profile.id === 'me' ? '얼굴 오행형' : `${personLabel(profile)}님 · 얼굴 오행형`}</p>
                <p className="mt-0.5 text-[22px] font-extrabold leading-tight">{reading.shape.name}</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-sub">{reading.shape.desc}</p>
                <p className="mt-2 text-[12.5px] font-semibold leading-[1.5] text-ink">{reading.headline}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={startCamera}
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-[14px] font-semibold text-white">
                <Camera size={16} className="shrink-0" aria-hidden="true" /> 다시 찍기
              </button>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-card py-2.5 text-[14px] font-semibold">
                <Images size={16} className="shrink-0" aria-hidden="true" /> 앨범에서
              </button>
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
                ['턱 · 북악', reading.scores.오악.북악, '水']].map(([l, v, e]) => <Bar key={l} label={l} score={v} sub={e} />)}
            </div>
            <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-[12.5px] leading-relaxed text-sub">
              마의상법은 얼굴의 다섯 봉우리를 오악이라 불러요. 이마는 남악(火), 왼쪽 광대는 동악(木),
              코는 중악(土), 오른쪽 광대는 서악(金), 턱은 북악(水)이에요. 좌우는 사진이 아니라 본인 기준이에요.
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

          <div className="flex items-center justify-between px-1">
            <h2 className="text-[16px] font-bold">부위별 풀이</h2>
            <button type="button" onClick={() => setAllOpen((v) => !v)}
              className="rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold">
              {allOpen ? '모두 접기' : '모두 펼치기'}
            </button>
          </div>
          <div className="space-y-2">
            {reading.parts.map((p, i) => (
              <PartCard key={p.key} part={p} delay={160 + i * 40}
                open={openPart === p.key || allOpen}
                onToggle={() => { setAllOpen(false); setOpenPart(openPart === p.key ? null : p.key); }} />
            ))}
          </div>

          <Card title="유년(流年) 흐름" right={<span className="text-[12px] text-sub">십삼부위</span>} delay={430}>
            <p className="text-[14.5px] leading-[1.85] text-[#3a3a42]">{reading.ages}</p>
          </Card>

          <Card title="명궁(命宮)" delay={400}>
            <p className="text-[14.5px] leading-[1.8] text-[#3a3a42]">{reading.myeonggung}</p>
          </Card>

          <Card title="사주 × 관상 교차 풀이" right={<span className="text-[12px] text-sub">명(命)과 상(相)</span>} delay={440}>
            <div className="space-y-3">
              {reading.cross.map((c, i) => <p key={i} className="text-[15px] leading-[1.85] text-[#3a3a42]">{c}</p>)}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-line bg-card py-4 text-[15px] font-semibold">
              <RefreshCw size={17} className="shrink-0" aria-hidden="true" /> 맨 위로
            </button>
            <button type="button" onClick={() => setAskClear(true)}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-line bg-card py-4 text-[15px] font-semibold text-point">
              <Trash2 size={17} className="shrink-0" aria-hidden="true" /> 관상 초기화
            </button>
          </div>

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
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={reset} className="rounded-2xl bg-ink py-3.5 text-[15px] font-semibold text-white">다시 시도</button>
            <button type="button" onClick={() => setAskClear(true)} className="rounded-2xl border border-line bg-card py-3.5 text-[15px] font-semibold text-point">관상 초기화</button>
          </div>
        </Card>
      )}

      <Sheet open={askClear} onClose={() => setAskClear(false)} label="관상 초기화">
        <h2 className="text-[19px] font-bold">
          {profile.id === 'me' ? '내' : `${personLabel(profile)}님의`} 관상 기록을 지울까요?
        </h2>
        <p className="mt-2 text-[14.5px] leading-[1.75] text-sub">
          사진에서 잰 수치와 풀이가 사라져요. 다시 보려면 사진을 한 번 더 찍어야 해요.
          다른 사람의 관상과 사주·운세 기록은 그대로 남아요.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAskClear(false)}
            className="rounded-2xl bg-bg py-4 text-[16px] font-semibold">그대로 두기</button>
          <button type="button" onClick={doClear}
            className="rounded-2xl bg-[#E0455A] py-4 text-[16px] font-semibold text-white">지우기</button>
        </div>
      </Sheet>
    </div>
  );
}

export { cameraSupported };

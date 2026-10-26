import { useCallback, useEffect, useState } from 'react';
import { ArrowUp, CalendarDays, House, ScanFace, ScrollText, Settings } from 'lucide-react';
import Onboarding, { toProfile } from './components/Onboarding.jsx';
import HomeTab from './components/HomeTab.jsx';
import ManseTab from './components/ManseTab.jsx';
import MonthCalendar from './components/MonthCalendar.jsx';
import FaceTab from './components/FaceTab.jsx';
import SettingsTab from './components/SettingsTab.jsx';
import { TermContext, TermSheet, TopBar } from './components/ui.jsx';
import { migrateProfile, personLabel, personYear } from './lib/people.js';
import { setVibrate } from './lib/sound.js';
import { catchUp, registerPeriodicSync, syncConfigToSW } from './lib/notify.js';
import { clearAllFaces, clearFace } from './lib/faceStore.js';

const KEYS = { people: 'ttiring.people.v1', active: 'ttiring.active', profile: 'paljja.profile.v2', settings: 'paljja.settings', drawn: 'paljja.drawn' };
const load = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const save = (k, v) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch { /* 저장 불가 환경 */ }
};

const TABS = [
  { key: 'home', label: '홈', icon: House, title: '홈' },
  { key: 'face', label: '관상', icon: ScanFace, title: '관상 보기' },
  { key: 'manse', label: '만세력', icon: ScrollText, title: '나의 만세력' },
  { key: 'calendar', label: '달력', icon: CalendarDays, title: '운세 달력' },
  { key: 'settings', label: '설정', icon: Settings, title: '설정' },
];

export default function App() {
  const [people, setPeople] = useState(() => {
    const list = load(KEYS.people, null);
    if (list?.length) return list;
    return migrateProfile(load(KEYS.profile, null)); // 예전 버전에서 넘어온 한 사람
  });
  const [activeId, setActiveId] = useState(() => load(KEYS.active, 'me'));
  const [settings, setSettings] = useState(() => ({ sound: true, vibrate: true, bigText: false, ...load(KEYS.settings, {}) }));
  const [drawn, setDrawn] = useState(() => {
    const old = load(KEYS.drawn, '');
    return typeof old === 'string' ? (old ? { me: old } : {}) : old;
  });
  const [tab, setTab] = useState(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('view');
      return ['home', 'face', 'manse', 'calendar', 'settings'].includes(v) ? v : 'home';
    } catch {
      return 'home';
    }
  });
  const [editing, setEditing] = useState(null); // null | { mode, person }
  const [dateOffset, setDateOffset] = useState(0);
  const [term, setTerm] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [showTop, setShowTop] = useState(false);

  useEffect(() => save(KEYS.settings, settings), [settings]);
  useEffect(() => { setVibrate(settings.vibrate); }, [settings.vibrate]);
  useEffect(() => {
    document.documentElement.style.zoom = settings.bigText ? '1.12' : '';
  }, [settings.bigText]);
  // 알림: 설정 시각이 지났는데 오늘 못 봤으면 바로 띄우고, 하루 한 번 깨우기를 등록
  useEffect(() => {
    syncConfigToSW();
    registerPeriodicSync();
    catchUp();
    const onVisible = () => { if (!document.hidden) catchUp(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toast = useCallback((m) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(''), 2200);
  }, []);
  const go = (t) => { setTab(t); window.scrollTo(0, 0); };

  const savePeople = (list) => { setPeople(list); save(KEYS.people, list); };
  const selectPerson = (id) => { setActiveId(id); save(KEYS.active, id); setDateOffset(0); window.scrollTo(0, 0); };

  const finishOnboarding = (p) => {
    const mode = editing?.mode ?? 'first';
    if (mode === 'first') {
      const me = { ...p, id: 'me', relation: '나' };
      savePeople([me]);
      selectPerson('me');
    } else if (mode === 'add') {
      savePeople([...people, p]);
      selectPerson(p.id);
    } else {
      savePeople(people.map((x) => (x.id === p.id ? { ...p, id: x.id, relation: x.relation } : x)));
      selectPerson(p.id);
    }
    setEditing(null);
    go('home');
  };

  const profile = people.find((x) => x.id === activeId) || people[0];

  if (!profile || editing) {
    return (
      <TermContext.Provider value={setTerm}>
        <Onboarding mode={editing?.mode ?? 'first'} initial={editing?.person ?? null}
          onDone={finishOnboarding} onCancel={() => setEditing(null)} soundOn={settings.sound} />
      </TermContext.Provider>
    );
  }

  const isMe = profile.id === 'me';

  const current = TABS.find((t) => t.key === tab);

  return (
    <TermContext.Provider value={setTerm}>
      <div className="mx-auto min-h-screen max-w-[440px] px-4 pb-[calc(84px+env(safe-area-inset-bottom))]">
        <TopBar title={isMe ? current.title : `${personLabel(profile)}님의 ${current.key === 'home' ? '운세' : current.title.replace('나의 ', '').replace(' 보기', '')}`} />

        {tab === 'home' && (
          <HomeTab key={profile.id} profile={profile} soundOn={settings.sound}
            people={people} activeId={profile.id} onSelectPerson={selectPerson}
            onAddPerson={() => setEditing({ mode: 'add', person: null })}
            onEditPerson={() => setEditing({ mode: profile.id === 'me' ? 'edit' : 'add', person: profile })}
            drawnDate={drawn[profile.id] || ''}
            onDrawn={() => {
              const d = new Date();
              const next = { ...drawn, [profile.id]: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` };
              setDrawn(next); save(KEYS.drawn, next);
            }}
            dateOffset={dateOffset} setDateOffset={setDateOffset}
            onOpenCalendar={() => go('calendar')} toast={toast} />
        )}
        {tab === 'face' && (
          <FaceTab key={profile.id} profile={profile} dateOffset={dateOffset} toast={toast}
            people={people} activeId={profile.id} onSelectPerson={selectPerson}
            onAddPerson={() => setEditing({ mode: 'add', person: null })} />
        )}
        {tab === 'manse' && <ManseTab key={profile.id} profile={profile} />}
        {tab === 'calendar' && (
          <div className="pb-6 pt-1">
            <MonthCalendar key={profile.id} input={profile} zodiac={personYear(profile)}
              onOpenDay={(off) => { setDateOffset(off); go('home'); }} />
            <p className="mt-3 px-1 text-[12px] leading-relaxed text-faint">
              날짜를 누르면 그날의 점수와 한마디가 나와요. 아이콘은 특별한 기운이 드는 날이에요. 낮은 점수의 날도 그냥 조금 조심하자는 뜻일 뿐, 약속이나 일정을 운세 때문에 바꿀 필요는 없어요.
            </p>
          </div>
        )}
        {tab === 'settings' && (
          <SettingsTab profile={profile} settings={settings} setSettings={setSettings}
            people={people} activeId={profile.id} openTerm={setTerm}
            onSelectPerson={selectPerson}
            onEdit={(person) => setEditing({ mode: person.id === 'me' ? 'edit' : 'add', person })}
            onAddPerson={() => setEditing({ mode: 'add', person: null })}
            onDeletePerson={(id) => {
              clearFace(id);
              const list = people.filter((x) => x.id !== id);
              savePeople(list);
              if (activeId === id) selectPerson(list[0]?.id ?? 'me');
              toast('삭제했어요');
            }}
            onUpdateProfile={(p) => {
              const next = toProfile({ ...p, unknownTime: !p.time });
              savePeople(people.map((x) => (x.id === p.id ? { ...next, id: x.id, relation: x.relation } : x)));
            }}
            onClearedFaces={(n) => toast(n ? `관상 기록 ${n}개를 지웠어요` : '지울 관상 기록이 없어요')}
            onReset={() => { Object.values(KEYS).forEach((k) => save(k, null)); clearAllFaces(); setPeople([]); setDrawn({}); setTab('home'); }} />
        )}
      </div>

      {/* 아래 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="메뉴">
        <div className="mx-auto grid max-w-[440px] grid-cols-5">
          {TABS.map(({ key, label, icon: Icon }) => {
            const on = tab === key;
            return (
              <button key={key} type="button" onClick={() => go(key)} aria-current={on ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${on ? 'font-bold text-ink' : 'text-faint'}`}>
                <span className={`rounded-xl px-3 py-1 ${on ? 'bg-bg' : ''}`}><Icon size={21} strokeWidth={on ? 2.4 : 2} /></span>
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {showTop && (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="맨 위로"
          className="reveal fixed z-30 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card shadow-[0_4px_14px_rgba(0,0,0,.12)]"
          style={{ right: 'max(16px, calc((100vw - 440px) / 2 + 16px))', bottom: 'calc(86px + env(safe-area-inset-bottom))' }}>
          <ArrowUp size={22} />
        </button>
      )}

      {toastMsg && (
        <div role="status" className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full bg-ink px-4 py-2 text-[14px] text-white shadow-lg">
          {toastMsg}
        </div>
      )}

      <TermSheet term={term} onClose={() => setTerm(null)} />
    </TermContext.Provider>
  );
}

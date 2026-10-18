// 공용 UI: 아래 시트, 용어 버튼, 카드, 상단 바
import { createContext, useContext, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { GLOSSARY } from '../lib/glossary.js';

export const TermContext = createContext(() => {});

/** 누르면 용어 풀이가 올라오는 글자 */
export function Term({ name, children, className = '' }) {
  const open = useContext(TermContext);
  if (!GLOSSARY[name]) return <span className={className}>{children ?? name}</span>;
  return (
    <button type="button" onClick={() => open(name)}
      className={`underline decoration-dotted decoration-[1.5px] underline-offset-[3px] ${className}`}>
      {children ?? name}
    </button>
  );
}

export function Sheet({ open, onClose, children, label }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="닫기" onClick={onClose} className="fade-in absolute inset-0 bg-black/40" />
      <div className="sheet-in relative max-h-[82vh] w-full max-w-[440px] overflow-y-auto rounded-t-[26px] bg-card px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        {children}
      </div>
    </div>
  );
}

export function TermSheet({ term, onClose }) {
  const g = term && GLOSSARY[term];
  return (
    <Sheet open={!!g} onClose={onClose} label="용어 풀이">
      {g && (
        <>
          <h2 className="text-[19px] font-bold">{term} ({g.hanja})</h2>
          <p className="mt-2 text-[15px] leading-[1.7] text-[#3a3a42]">{g.desc}</p>
          <div className="mt-4 rounded-2xl bg-bg px-4 py-3">
            <p className="text-[12px] text-sub">예시</p>
            <p className="mt-1 text-[14.5px] leading-[1.6]">{g.ex}</p>
          </div>
          <button type="button" onClick={onClose}
            className="mt-5 w-full rounded-2xl bg-ink py-4 text-[16px] font-semibold text-white">확인</button>
        </>
      )}
    </Sheet>
  );
}

export const Card = ({ title, right, children, className = '', delay = 0 }) => (
  <section className={`reveal rounded-[22px] border border-line bg-card p-5 ${className}`} style={{ animationDelay: `${delay}ms` }}>
    {(title || right) && (
      <div className="mb-3 flex items-center justify-between gap-2">
        {title && <h2 className="text-[16px] font-bold">{title}</h2>}
        {right}
      </div>
    )}
    {children}
  </section>
);

export function TopBar({ title, onBack, right }) {
  return (
    <header className="sticky top-0 z-30 -mx-4 flex h-[56px] items-center bg-bg/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="w-11">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="뒤로" className="rounded-full p-2">
            <ChevronLeft size={26} />
          </button>
        )}
      </div>
      <h1 className="flex-1 text-center text-[17px] font-bold">{title}</h1>
      <div className="flex w-11 justify-end">{right}</div>
    </header>
  );
}

/** 재미로 보는 운세 안내 */
export function FunNotice({ compact = false }) {
  if (compact) {
    return <p className="px-2 text-center text-[12px] text-faint">재미로만 봐 주세요!</p>;
  }
  return (
    <aside className="rounded-[20px] bg-[#F6F1FF] px-5 py-4" aria-label="운세 이용 안내">
      <p className="text-[14px] font-bold text-[#5B3FB0]">재미로 봐 주세요</p>
      <p className="mt-1.5 text-[13.5px] leading-[1.7] text-[#4a4458]">
        점수가 낮다고 걱정하지 마세요. 중요한 결정은 내 판단으로 내려 주세요.
      </p>
    </aside>
  );
}

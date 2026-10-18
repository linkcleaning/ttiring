import { Plus } from 'lucide-react';
import ZodiacAvatar from './ZodiacAvatar.jsx';
import { personLabel, personYear } from '../lib/people.js';

/** 홈 맨 위에서 운세를 볼 사람을 고르는 줄 */
export default function PersonBar({ people, activeId, onSelect, onAdd }) {
  if (people.length <= 1) {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-2.5">
        <p className="text-[13.5px] text-sub">가족·친구 운세도 봐 줄 수 있어요</p>
        <button type="button" onClick={onAdd}
          className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold text-white">
          <Plus size={14} strokeWidth={3} /> 사람 추가
        </button>
      </div>
    );
  }
  return (
    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1" role="tablist" aria-label="운세를 볼 사람">
      {people.map((p) => {
        const on = p.id === activeId;
        const y = personYear(p);
        return (
          <button key={p.id} type="button" role="tab" aria-selected={on} onClick={() => onSelect(p.id)}
            className="flex w-[58px] shrink-0 flex-col items-center gap-1">
            <span className={`rounded-full p-[2px] ${on ? 'bg-ink' : 'bg-transparent'}`}>
              <ZodiacAvatar branch={y.branch} stem={y.stem} size={48} mood={on ? 4 : 3}
                className={on ? '' : 'opacity-60'} title={personLabel(p)} />
            </span>
            <span className={`w-full truncate text-center text-[11.5px] ${on ? 'font-bold text-ink' : 'text-sub'}`}>
              {p.id === 'me' ? (p.name?.trim() || '나') : personLabel(p)}
            </span>
          </button>
        );
      })}
      <button type="button" onClick={onAdd} aria-label="사람 추가"
        className="flex w-[58px] shrink-0 flex-col items-center gap-1">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-dashed border-line text-faint">
          <Plus size={22} />
        </span>
        <span className="text-[11.5px] text-sub">추가</span>
      </button>
    </div>
  );
}

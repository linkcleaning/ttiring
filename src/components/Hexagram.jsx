import { hexagramLines } from '../lib/saju.js';

/** 6효 괘 그림. moving(1~6)은 붉게 표시, 위에서부터 그림 */
export default function Hexagram({ hex, moving, title, delay = 0, faded = false }) {
  const lines = hexagramLines(hex);
  return (
    <figure className={`flex flex-col items-center ${faded ? 'opacity-50' : ''}`}>
      <figcaption className="mb-2 text-[11px] text-sub">{title}</figcaption>
      <div className="flex w-[78px] flex-col gap-[7px]" aria-hidden="true">
        {[5, 4, 3, 2, 1, 0].map((i, n) => {
          const yang = lines[i] === 1;
          const color = moving === i + 1 ? 'bg-point' : 'bg-ink';
          const style = { animationDelay: `${delay + n * 140}ms` };
          return yang ? (
            <span key={i} className={`line-in h-[9px] rounded-[2px] ${color}`} style={style} />
          ) : (
            <span key={i} className="line-in flex h-[9px] justify-between" style={style}>
              <span className={`w-[44%] rounded-[2px] ${color}`} />
              <span className={`w-[44%] rounded-[2px] ${color}`} />
            </span>
          );
        })}
      </div>
      <p className="mt-2 font-brush text-[19px] leading-tight">{hex.hanja}</p>
      <p className="text-[13px] text-sub">{hex.ko}</p>
    </figure>
  );
}

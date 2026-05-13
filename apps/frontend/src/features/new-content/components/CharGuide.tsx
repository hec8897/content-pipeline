'use client';

const MIN = 1200;
const MAX = 1800;
const SCALE = 2200;

type Status = 'low' | 'ok' | 'high';

function statusOf(count: number): Status {
  if (count < MIN) return 'low';
  if (count > MAX) return 'high';
  return 'ok';
}

const STATUS_LABEL: Record<Status, string> = {
  low: '짧음',
  ok: '적정 길이',
  high: '길어요',
};

const STATUS_COLOR: Record<Status, string> = {
  low: 'var(--color-warn)',
  ok: 'var(--color-success)',
  high: 'var(--color-danger)',
};

function hint(count: number, status: Status): string {
  if (status === 'low') return `1,200자까지 ${(MIN - count).toLocaleString()}자 남음`;
  if (status === 'high') return `권장보다 ${(count - MAX).toLocaleString()}자 김 · 분할 검토`;
  return '1,200~1,800자 권장 범위';
}

type Props = { count: number };

export function CharGuide({ count }: Props) {
  const status = statusOf(count);
  const color = STATUS_COLOR[status];
  const fillWidth = Math.min(100, (count / SCALE) * 100);
  const sweetLeft = (MIN / SCALE) * 100;
  const sweetWidth = ((MAX - MIN) / SCALE) * 100;

  return (
    <div className="border-t border-border bg-surface px-4 pt-2.5 pb-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[10.5px] font-mono">
        <span className="text-text-2">
          <span className="text-[12px] font-semibold text-text">
            {count.toLocaleString()}자
          </span>{' '}
          · 권장 1,200~1,800
        </span>
        <span style={{ color }} className="font-bold inline-flex items-center gap-1">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: color }}
          />
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${sweetLeft}%`,
            width: `${sweetWidth}%`,
            background: 'rgba(47, 148, 97, 0.18)',
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${sweetLeft}%`, background: 'rgba(47, 148, 97, 0.55)' }}
        />
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${sweetLeft + sweetWidth}%`, background: 'rgba(47, 148, 97, 0.55)' }}
        />
        <div
          className="absolute top-0 bottom-0 transition-[width] duration-150"
          style={{ width: `${fillWidth}%`, background: color, opacity: 0.85 }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-text-3">
        <span>0</span>
        <span>{hint(count, status)}</span>
        <span>{SCALE.toLocaleString()}</span>
      </div>
    </div>
  );
}

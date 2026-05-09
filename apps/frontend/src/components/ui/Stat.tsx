type Props = {
  label: string;
  value: string;
  trend?: string;
  trendKind?: 'neutral' | 'success';
};

export function Stat({ label, value, trend, trendKind = 'neutral' }: Props) {
  return (
    <div className="bg-surface border border-border rounded-[10px] p-3.5 flex flex-col gap-1.5">
      <span className="text-[11.5px] text-text-3 uppercase tracking-wide">{label}</span>
      <span className="text-[24px] font-semibold text-text" style={{ letterSpacing: '-0.6px' }}>
        {value}
      </span>
      {trend && (
        <span className={`text-[11px] ${trendKind === 'success' ? 'text-success' : 'text-text-2'}`}>
          {trend}
        </span>
      )}
    </div>
  );
}

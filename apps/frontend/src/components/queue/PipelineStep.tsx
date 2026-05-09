type Props = {
  label: string;
  step: number;
  active?: boolean;
  done?: boolean;
};

export function PipelineStep({ label, step, active, done }: Props) {
  return (
    <div
      className={`relative flex flex-col gap-1.5 px-3 py-2.5 border rounded-md ${
        active
          ? 'border-accent bg-accent-soft'
          : done
            ? 'border-border bg-surface'
            : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-mono ${active ? 'text-accent' : 'text-text-3'}`}>
          {String(step).padStart(2, '0')}
        </span>
        {active && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[pulse-dot_1.4s_infinite]" />
        )}
        {done && !active && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
      </div>
      <span
        className={`text-[12px] font-medium ${
          active ? 'text-accent' : done ? 'text-text' : 'text-text-2'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

import { Calendar, Zap } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';

export type ScheduleMode = 'now' | 'scheduled';

type Props = {
  mode: ScheduleMode;
  onModeChange: (mode: ScheduleMode) => void;
  date: string;
  onDateChange: (date: string) => void;
  time: string;
  onTimeChange: (time: string) => void;
};

export function ScheduleSelector({
  mode,
  onModeChange,
  date,
  onDateChange,
  time,
  onTimeChange,
}: Props) {
  return (
    <Panel title="발행 시점">
      <div className="px-3.5 py-3 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onModeChange('now')}
            className={`px-3 py-2.5 rounded-md border text-[12.5px] inline-flex items-center justify-center gap-1.5 ${
              mode === 'now'
                ? 'border-accent bg-accent-soft text-accent font-semibold'
                : 'border-border text-text-2'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> 즉시 발행
          </button>
          <button
            onClick={() => onModeChange('scheduled')}
            className={`px-3 py-2.5 rounded-md border text-[12.5px] inline-flex items-center justify-center gap-1.5 ${
              mode === 'scheduled'
                ? 'border-accent bg-accent-soft text-accent font-semibold'
                : 'border-border text-text-2'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> 예약 발행
          </button>
        </div>

        {mode === 'scheduled' && (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px]"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px]"
            />
          </div>
        )}
      </div>
    </Panel>
  );
}

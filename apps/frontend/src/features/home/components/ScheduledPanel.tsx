import { Panel } from '@/components/ui/Panel';

export function ScheduledPanel() {
  return (
    <Panel title="발행 예정" sub="0개">
      <div className="px-3.5 py-6 text-[12px] text-text-3 text-center">
        예약된 발행이 없어요
      </div>
    </Panel>
  );
}

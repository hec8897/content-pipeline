import { Panel } from '@/components/ui/Panel';
import { PipelineStep } from '@/features/queue/components/PipelineStep';

export function EnginePanel() {
  return (
    <Panel title="n8n 실행 엔진">
      <div className="px-3.5 py-3 flex items-center gap-3 border-b border-border">
        <span className="w-2 h-2 rounded-full bg-success animate-[pulse-dot_1.4s_infinite]" />
        <span className="text-[12.5px] font-mono text-text">n8n@dev</span>
        <span className="text-[11.5px] text-text-3">connected · last heartbeat 2s 전</span>
        <span className="ml-auto text-[11px] text-text-3 font-mono">
          workflow: publish-router
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5">
        <PipelineStep label="DB 큐 폴링" step={1} done />
        <PipelineStep label="webhook 수신" step={2} done />
        <PipelineStep label="채널 라우팅" step={3} active />
        <PipelineStep label="채널 발행" step={4} />
      </div>
    </Panel>
  );
}

import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { QueueStat } from "@/components/queue/QueueStat";
import { QueueRow } from "@/components/queue/QueueRow";
import { PipelineStep } from "@/components/queue/PipelineStep";
import { QUEUE_ITEMS } from "@/lib/mock-data";
import type { QueueItem } from "@/lib/types";

export default function QueuePage() {
  const groups: { key: QueueItem["state"]; label: string }[] = [
    { key: "processing", label: "진행 중" },
    { key: "pending", label: "대기" },
    { key: "scheduled", label: "예약됨" },
    { key: "failed", label: "실패" },
  ];

  return (
    <>
      <PageHeader
        title="발행 큐"
        subtitle="자동 새로고침 · 5초 간격 · n8n@dev 연결됨"
        actions={
          <Button variant="ghost">
            <ScrollText className="w-3.5 h-3.5" /> 실행 로그
          </Button>
        }
      />

      <div className="px-7 py-6 flex flex-col gap-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {groups.map((g) => (
            <QueueStat
              key={g.key}
              label={g.label}
              state={g.key}
              count={
                QUEUE_ITEMS.filter((q) => q.state === g.key).length
              }
            />
          ))}
        </div>

        {/* n8n connection */}
        <Panel title="n8n 실행 엔진">
          <div className="px-3.5 py-3 flex items-center gap-3 border-b border-border">
            <span className="w-2 h-2 rounded-full bg-success animate-[pulse-dot_1.4s_infinite]" />
            <span className="text-[12.5px] font-mono text-text">n8n@dev</span>
            <span className="text-[11.5px] text-text-3">
              connected · last heartbeat 2s 전
            </span>
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

        {/* Groups */}
        <div className="flex flex-col gap-5">
          {groups.map((g) => {
            const items = QUEUE_ITEMS.filter((q) => q.state === g.key);
            if (items.length === 0) return null;
            return (
              <section key={g.key} className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2 px-1">
                  <h2 className="text-[12px] font-semibold text-text uppercase tracking-wider">
                    {g.label}
                  </h2>
                  <span className="text-[11px] text-text-3">
                    {items.length}개
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((it) => (
                    <QueueRow key={it.id} item={it} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

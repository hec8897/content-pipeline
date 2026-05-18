import { Panel } from '@/components/ui/Panel';
import { ChannelStat } from '@/features/home/components/ChannelStat';

export function ChannelPerformancePanel() {
  return (
    <Panel title="이번 주 채널 성과">
      <div className="flex flex-col">
        <ChannelStat
          channel="naver"
          name="네이버 블로그"
          metric="조회 2,517 · 댓글 24"
          trend="+18%"
        />
        <ChannelStat
          channel="insta"
          name="인스타그램"
          metric="좋아요 412 · 저장 38"
          trend="+9%"
        />
      </div>
    </Panel>
  );
}

import { Stat } from '@/components/ui/Stat';

export function DashboardStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="이번 달 콘텐츠" value="3" trend="+2 지난 주" />
      <Stat label="총 조회수" value="4,319" trend="+1,284 7일" />
      <Stat label="발행 성공률" value="92%" trend="11/12" />
      <Stat label="평균 양산 시간" value="47s" trend="목표 60s" trendKind="success" />
    </div>
  );
}

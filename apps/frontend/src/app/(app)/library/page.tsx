import { PageHeader } from '@/components/layout/PageHeader';
import { LibraryGrid } from '@/features/library/components/LibraryGrid';
import { LIBRARY_ITEMS } from '@/mocks';

export default function LibraryPage() {
  const counts = LIBRARY_ITEMS.reduce<Record<string, number>>((acc, p) => {
    acc[p.state] = (acc[p.state] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="라이브러리"
        subtitle={`총 ${LIBRARY_ITEMS.length}개 · 발행됨 ${counts.live ?? 0}, 예약됨 ${counts.scheduled ?? 0}, 초안 ${counts.draft ?? 0}, 실패 ${counts.failed ?? 0}`}
      />
      <div className="px-7 py-6">
        <LibraryGrid items={LIBRARY_ITEMS} />
      </div>
    </>
  );
}

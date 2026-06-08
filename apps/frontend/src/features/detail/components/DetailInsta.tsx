import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { CaptionPanel } from './CaptionPanel';
import { CardNewsView } from './CardNewsView';
import { PngExportButton } from '@/features/insta-export/components/PngExportButton';
import type { CardNewsCardData, DraftStatus } from '@/lib/api/types';
import { routes } from '@/lib/routes';

type Props = {
  contentId: string;
  draftId: string;
  status: DraftStatus;
  topicTitle: string;
  cards: CardNewsCardData[];
  caption: string | null;
};

export function DetailInsta({ contentId, draftId, status, topicTitle, cards, caption }: Props) {
  // CardNewsCardData (API) → CardNewsCard (id 보강). DetailInsta 는 read-only 라
  // 인덱스 기반 id 안전. prefix 로 안티패턴 시각적 신호 줄임 + 그리드/캡처가 같은
  // 객체 참조.
  const viewCards = cards.map((c, i) => ({ ...c, id: `card-${i}` }));

  return (
    <div className="px-7 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-text-3">{cards.length}장 · 1080×1080</span>
        <div className="flex items-center gap-2">
          <PngExportButton cards={viewCards} topicTitle={topicTitle} />
          <Link
            href={routes.libraryItemEdit(contentId, 'insta')}
            className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3 py-2 text-[12.5px] font-semibold hover:bg-black"
          >
            <Pencil className="w-3.5 h-3.5" /> 카드뉴스 편집
          </Link>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="py-16 text-[13px] text-text-3 text-center">카드뉴스 데이터가 없어요.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {viewCards.map((c, i) => (
            <CardNewsView key={c.id} card={c} idx={i} />
          ))}
        </div>
      )}

      <CaptionPanel draftId={draftId} status={status} caption={caption} />
    </div>
  );
}

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { CardNewsView } from './CardNewsView';
import { Panel } from '@/components/ui/Panel';
import type { CardNewsCardData } from '@/lib/api/types';
import { routes } from '@/lib/routes';

// 캡션은 발행 phase 까지 mock 유지. blog_tags 와 별도 컬럼이라 본 phase 에선 안 채움.
const CAPTION_MOCK = `🐶 5살 푸들 입양한 지 한 달, 1인 가구가 알게 된 것들

성견 입양 = '키우는' 게 아니라 '함께 적응해가는' 일.
적응 기간은 길어요. 조급해하지 마세요.

자세한 후기는 프로필 링크에서 네이버 블로그로 ↗
#성견입양 #1인가구 #푸들 #반려견일상 #입양후기`;

type Props = { contentId: string; cards: CardNewsCardData[] };

export function DetailInsta({ contentId, cards }: Props) {
  return (
    <div className="px-7 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-text-3">{cards.length}장 · 1080×1080</span>
        <Link
          href={routes.libraryItemEdit(contentId, 'insta')}
          className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3 py-2 text-[12.5px] font-semibold hover:bg-black"
        >
          <Pencil className="w-3.5 h-3.5" /> 카드뉴스 편집
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="py-16 text-[13px] text-text-3 text-center">카드뉴스 데이터가 없어요.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cards.map((c, i) => (
            <CardNewsView key={i} card={{ ...c, id: String(i) }} idx={i} />
          ))}
        </div>
      )}

      <Panel title="캡션">
        <pre className="px-3.5 py-3 text-[12.5px] text-text-2 whitespace-pre-wrap font-sans leading-relaxed">
          {CAPTION_MOCK}
        </pre>
      </Panel>
    </div>
  );
}

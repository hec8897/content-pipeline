import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { CardNewsView } from './CardNewsView';
import { Panel } from '@/components/ui/Panel';
import { CARD_NEWS } from '@/mocks';
import { routes } from '@/lib/routes';

const CAPTION = `🐶 5살 푸들 입양한 지 한 달, 1인 가구가 알게 된 것들

성견 입양 = '키우는' 게 아니라 '함께 적응해가는' 일.
적응 기간은 길어요. 조급해하지 마세요.

자세한 후기는 프로필 링크에서 네이버 블로그로 ↗
#성견입양 #1인가구 #푸들 #반려견일상 #입양후기`;

type Props = { contentId: string };

export function DetailInsta({ contentId }: Props) {
  return (
    <div className="px-7 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-text-3">8장 · 1080×1080</span>
        <Link
          href={routes.libraryItemEdit(contentId, 'insta')}
          className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3 py-2 text-[12.5px] font-semibold hover:bg-black"
        >
          <Pencil className="w-3.5 h-3.5" /> 카드뉴스 편집
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {CARD_NEWS.map((c, i) => (
          <CardNewsView key={c.id} card={c} idx={i} />
        ))}
      </div>

      <Panel title="캡션">
        <pre className="px-3.5 py-3 text-[12.5px] text-text-2 whitespace-pre-wrap font-sans leading-relaxed">
          {CAPTION}
        </pre>
      </Panel>
    </div>
  );
}

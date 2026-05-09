import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { DetailHero } from '@/components/detail/DetailHero';
import { CardNewsEditor } from '@/components/detail/CardNewsEditor';
import { Button } from '@/components/ui/Button';
import { CARD_NEWS, LIBRARY_ITEMS } from '@/lib/mock-data';
import { routes } from '@/lib/routes';

export default async function ContentEditPage(props: PageProps<'/library/[id]/edit'>) {
  const { id } = await props.params;
  const content = LIBRARY_ITEMS.find((c) => c.id === id);
  if (!content) notFound();

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href={routes.libraryItem(content.id)}
            className="inline-flex items-center gap-1 hover:text-text"
          >
            <ChevronLeft className="w-3 h-3" /> {content.title}
          </Link>
        }
        title={`${content.title} — 편집 중`}
        actions={
          <>
            <Link
              href={routes.libraryItem(content.id)}
              className="inline-flex items-center gap-1.5 border border-border rounded-md px-3 py-2 text-[12.5px] text-text-2 hover:bg-surface-2"
            >
              취소
            </Link>
            <Button variant="primary">변경사항 저장</Button>
          </>
        }
      />
      <DetailHero content={content} />
      <div className="border-b border-border bg-surface px-7">
        <div className="flex items-center gap-5">
          <span className="relative py-3 text-[12.5px] text-text font-semibold">
            카드뉴스 편집
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-text" />
          </span>
        </div>
      </div>
      <CardNewsEditor initial={CARD_NEWS} />
    </>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MoreHorizontal, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { DetailHero } from '@/components/detail/DetailHero';
import { DetailTabs } from '@/components/detail/DetailTabs';
import { DetailOverview } from '@/components/detail/DetailOverview';
import { DetailInsta } from '@/components/detail/DetailInsta';
import { DetailBlog } from '@/components/detail/DetailBlog';
import { DetailActivity } from '@/components/detail/DetailActivity';
import { Button } from '@/components/ui/Button';
import { LIBRARY_ITEMS } from '@/lib/mock-data';
import { routes } from '@/lib/routes';

export default async function ContentDetailPage(props: PageProps<'/library/[id]'>) {
  const { id } = await props.params;
  const content = LIBRARY_ITEMS.find((c) => c.id === id);
  if (!content) notFound();

  const editLabel = content.state === 'draft' ? '이어서 편집' : '편집';

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href={routes.library} className="inline-flex items-center gap-1 hover:text-text">
            <ChevronLeft className="w-3 h-3" /> 라이브러리
          </Link>
        }
        title={content.title}
        actions={
          <>
            <Button variant="ghost">
              <MoreHorizontal className="w-3.5 h-3.5" /> 더보기
            </Button>
            <Link
              href={routes.libraryItemEdit(content.id)}
              className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3.5 py-2 text-[12.5px] font-semibold hover:bg-black"
            >
              <Pencil className="w-3.5 h-3.5" /> {editLabel}
            </Link>
          </>
        }
      />
      <DetailHero content={content} />
      <DetailTabs
        panels={{
          overview: <DetailOverview content={content} />,
          insta: <DetailInsta />,
          blog: <DetailBlog />,
          activity: <DetailActivity />,
        }}
      />
    </>
  );
}

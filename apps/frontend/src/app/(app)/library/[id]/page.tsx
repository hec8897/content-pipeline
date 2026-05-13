import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DetailHero } from '@/features/detail/components/DetailHero';
import { DetailTabs } from '@/features/detail/components/DetailTabs';
import { DetailOverview } from '@/features/detail/components/DetailOverview';
import { DetailInsta } from '@/features/detail/components/DetailInsta';
import { DetailBlog } from '@/features/detail/components/DetailBlog';
import { DetailActivity } from '@/features/detail/components/DetailActivity';
import { Button } from '@/components/ui/Button';
import { LIBRARY_ITEMS } from '@/mocks';
import { routes } from '@/lib/routes';

export default async function ContentDetailPage(props: PageProps<'/library/[id]'>) {
  const { id } = await props.params;
  const content = LIBRARY_ITEMS.find((c) => c.id === id);
  if (!content) notFound();

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
          <Button variant="ghost">
            <MoreHorizontal className="w-3.5 h-3.5" /> 더보기
          </Button>
        }
      />
      <DetailHero content={content} />
      <DetailTabs
        panels={{
          overview: <DetailOverview content={content} />,
          insta: <DetailInsta contentId={content.id} />,
          blog: <DetailBlog contentId={content.id} />,
          activity: <DetailActivity />,
        }}
      />
    </>
  );
}

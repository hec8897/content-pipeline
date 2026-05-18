import Link from 'next/link';
import { Plus } from 'lucide-react';
import { routes } from '@/lib/routes';

export function MobileTopBar() {
  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 bg-surface border-b border-border px-4 py-3">
      <div
        className="w-5 h-5 rounded"
        style={{ background: 'linear-gradient(135deg, #5b5bd6, #8b5cf6)' }}
      />
      <span className="text-[13px] font-semibold text-text">content-pipeline</span>
      <Link
        href={routes.newContent}
        className="ml-auto flex items-center gap-1 bg-text text-white rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold"
      >
        <Plus className="w-3.5 h-3.5" />새 콘텐츠
      </Link>
    </header>
  );
}

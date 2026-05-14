'use client';

import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { qk } from '@/lib/api/queryKeys';
import { routes } from '@/lib/routes';

export function DashboardActions() {
  const qc = useQueryClient();

  return (
    <>
      <Button variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: qk.drafts() })}>
        <RefreshCw className="w-3.5 h-3.5" /> 새로고침
      </Button>
      <Link
        href={routes.newContent}
        className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3.5 py-2 text-[12.5px] font-semibold hover:bg-black"
      >
        <Plus className="w-3.5 h-3.5" /> 새 콘텐츠
      </Link>
    </>
  );
}

import { notFound } from 'next/navigation';

import { ModalsDemo } from '@/features/dev/components/ModalsDemo';

// 프로덕션 비공개 — dev/preview 빌드에서만 접근 가능.
export default function ModalsDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return <ModalsDemo />;
}

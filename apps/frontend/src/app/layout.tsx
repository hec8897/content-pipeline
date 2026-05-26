import type { Metadata } from 'next';
import './globals.css';

import { ConfirmDialogRoot } from '@/components/ui/ConfirmDialogRoot';
import { QueryProvider } from '@/providers/QueryProvider';
import { SupabaseProvider } from '@/providers/SupabaseProvider';

export const metadata: Metadata = {
  title: 'content-pipeline',
  description: 'AI 인터뷰 기반 한국 채널 콘텐츠 자동화 SaaS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <QueryProvider>
          <SupabaseProvider>{children}</SupabaseProvider>
        </QueryProvider>
        <ConfirmDialogRoot />
      </body>
    </html>
  );
}

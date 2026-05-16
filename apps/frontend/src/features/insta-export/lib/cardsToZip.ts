import { createElement } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import type { CardNewsCard } from '@/types';

import { InstaPreviewCard } from '../components/InstaPreviewCard';
import { slugify } from './slug';

// off-screen 1080×1080 컨테이너에 InstaPreviewCard 한 장씩 마운트 → html-to-image
// 로 toPng → jszip 묶고 다운로드 트리거. 전체 성공 시에만 zip 생성, 한 장이라도
// 실패하면 throw — 부분 zip 다운로드 X.
export async function cardsToZip(cards: CardNewsCard[], topicTitle: string): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const root = createRoot(container);
  const zip = new JSZip();

  try {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      flushSync(() => {
        root.render(createElement(InstaPreviewCard, { card }));
      });
      const node = container.firstElementChild as HTMLElement | null;
      if (!node) throw new Error(`Failed to render card ${i + 1}`);
      const dataUrl = await toPng(node, { width: 1080, height: 1080, pixelRatio: 1 });
      const base64 = dataUrl.split(',')[1] ?? '';
      if (!base64) throw new Error(`Empty PNG for card ${i + 1}`);
      zip.file(`card-${String(i + 1).padStart(2, '0')}.png`, base64, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const slug = slugify(topicTitle);
    const zipName = slug ? `${slug}.zip` : 'cardnews.zip';
    triggerDownload(blob, zipName);
  } finally {
    root.unmount();
    container.remove();
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

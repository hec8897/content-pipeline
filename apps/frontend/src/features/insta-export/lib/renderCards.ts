import { createElement } from 'react';
import { toPng } from 'html-to-image';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import type { CardNewsCard } from '@/types';

import { InstaPreviewCard } from '../components/InstaPreviewCard';

// off-screen 1080×1080 컨테이너에 InstaPreviewCard 한 장씩 마운트 → html-to-image toPng →
// dataURL → Blob 변환 후 순서대로 반환. 한 장이라도 실패하면 throw(부분 결과 X).
// off-screen 컨테이너·root 는 finally 에서 반드시 정리.
export async function renderCardsToPngBlobs(cards: CardNewsCard[]): Promise<Blob[]> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const root = createRoot(container);
  const blobs: Blob[] = [];

  try {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const slot = String(i + 1).padStart(2, '0');
      flushSync(() => {
        root.render(createElement(InstaPreviewCard, { card }));
      });
      const node = container.firstElementChild as HTMLElement | null;
      if (!node) throw new Error(`카드 ${slot} 렌더 실패`);
      const dataUrl = await toPng(node, { width: 1080, height: 1080, pixelRatio: 1 });
      // dataURL → Blob 변환(fetch 경유가 가장 단순하고 타입 안전)
      const blob = await fetch(dataUrl).then((r) => r.blob());
      blobs.push(blob);
    }
  } finally {
    root.unmount();
    container.remove();
  }

  return blobs;
}

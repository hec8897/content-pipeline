import JSZip from 'jszip';

import type { CardNewsCard } from '@/types';

import { renderCardsToPngBlobs } from './renderCards';
import { slugify } from './slug';

// renderCardsToPngBlobs 로 Blob[] 획득 → jszip 으로 묶어 다운로드 트리거.
// 전체 성공 시에만 zip 생성, 한 장이라도 실패하면 throw — 부분 zip 다운로드 X.
export async function cardsToZip(cards: CardNewsCard[], topicTitle: string): Promise<void> {
  const blobs = await renderCardsToPngBlobs(cards);

  const zip = new JSZip();
  for (let i = 0; i < blobs.length; i++) {
    const slot = String(i + 1).padStart(2, '0');
    // Blob → ArrayBuffer → zip 에 추가
    const arrayBuffer = await blobs[i].arrayBuffer();
    zip.file(`card-${slot}.png`, arrayBuffer);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const slug = slugify(topicTitle);
  const zipName = slug ? `${slug}.zip` : 'cardnews.zip';
  triggerDownload(zipBlob, zipName);
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

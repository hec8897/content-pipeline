import { draftsApi } from '@/lib/api/drafts';
import type { CardNewsCardData } from '@/lib/api/types';
import type { CardNewsCard } from '@/types';
import { renderCardsToPngBlobs } from '@/features/insta-export/lib/renderCards';

// CardNewsCardData[] → PNG 렌더 → Storage 업로드 → 공개 URL 배열 반환.
// 한 장이라도 실패하면 throw(부분 발행 X). 인덱스 순서 보장.
export async function uploadCarouselImages(
  draftId: string,
  cards: CardNewsCardData[],
): Promise<string[]> {
  // CardNewsCardData 는 id 필드가 없으므로 합성 id 부여 — 렌더에는 미사용.
  const renderCards: CardNewsCard[] = cards.map((card, i) => ({
    ...card,
    id: String(i),
  }));

  const blobs = await renderCardsToPngBlobs(renderCards);

  // 인덱스 순서 보장 병렬 업로드
  const urls = await Promise.all(
    blobs.map(async (blob, i) => {
      const file = new File([blob], `card-${i}.png`, { type: 'image/png' });
      const { imageUrl } = await draftsApi.uploadCardImage(draftId, i, file);
      return imageUrl;
    }),
  );

  return urls;
}

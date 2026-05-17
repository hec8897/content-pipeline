// 한국어 보존 slugify — 공백 → "-", 알파벳/숫자/한글 등 유니코드 letter+number 외 특수문자 제거.
// 빈 결과는 fallback 가능하도록 호출처에서 처리.
export function slugify(text: string): string {
  const cleaned = text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}\-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned;
}

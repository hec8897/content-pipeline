// 카드 배경색 프리셋. CardNewsEditor 우측 패널의 BackgroundPalette 에서 사용.
// 백엔드 zod schema 의 PALETTE_PAIRS 와 별개 (편집 단계는 자유 색 허용,
// 양산 단계만 zod 화이트리스트 적용).
export const PRESETS: { bg: string; fg: string }[] = [
  { bg: '#1a1a2e', fg: 'white' },
  { bg: '#0a3d2c', fg: 'white' },
  { bg: '#5b5bd6', fg: 'white' },
  { bg: '#c87f0a', fg: 'white' },
  { bg: '#222', fg: 'white' },
  { bg: '#f6f5f1', fg: '#222' },
  { bg: '#fef3c7', fg: '#3a2e0c' },
  { bg: '#e0f2fe', fg: '#0c4a6e' },
];

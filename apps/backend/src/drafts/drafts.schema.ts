import { z } from 'zod';

// 카드 색 팔레트 — LLM 출력 디자인 컨트롤용 화이트리스트.
// prompts.ts 가 LLM 에게 "이 7쌍 중에서 골라" 라고 지시함. zod 는 마지막 방어선.
export const PALETTE_PAIRS = [
  { bg: '#1a1a2e', fg: 'white' },
  { bg: '#0a3d2c', fg: 'white' },
  { bg: '#5b5bd6', fg: 'white' },
  { bg: '#c87f0a', fg: 'white' },
  { bg: '#222', fg: 'white' },
  { bg: '#f6f5f1', fg: '#222' },
  { bg: '#fef3c7', fg: '#3a2e0c' },
] as const;

const BG_VALUES = [
  '#1a1a2e',
  '#0a3d2c',
  '#5b5bd6',
  '#c87f0a',
  '#222',
  '#f6f5f1',
  '#fef3c7',
] as const;
const FG_VALUES = ['white', '#222', '#3a2e0c'] as const;

const bgEnum = z.enum(BG_VALUES);
const fgEnum = z.enum(FG_VALUES);

const coverCardSchema = z.object({
  type: z.literal('cover'),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(80).optional(),
  tag: z.string().min(1).max(40).optional(),
  bg: bgEnum,
  fg: fgEnum,
});

// num 은 위치 = 번호 불변량을 zod 에서 강제 (튜플 인덱스 → 리터럴 매칭).
const makeBodyCardSchema = (num: '01' | '02' | '03' | '04' | '05' | '06') =>
  z.object({
    type: z.literal('body'),
    num: z.literal(num),
    title: z.string().min(1).max(80),
    body: z.string().min(1).max(200),
    bg: bgEnum,
    fg: fgEnum,
  });

const outroCardSchema = z.object({
  type: z.literal('outro'),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(200),
  cta: z.string().min(1).max(60).optional(),
  bg: bgEnum,
  fg: fgEnum,
});

export const cardNewsSchema = z.tuple([
  coverCardSchema,
  makeBodyCardSchema('01'),
  makeBodyCardSchema('02'),
  makeBodyCardSchema('03'),
  makeBodyCardSchema('04'),
  makeBodyCardSchema('05'),
  makeBodyCardSchema('06'),
  outroCardSchema,
]);

export type CardNews = z.infer<typeof cardNewsSchema>;
export type CardNewsCard = CardNews[number];

export const patchDraftSchema = z
  .object({
    card_news: cardNewsSchema.optional(),
    blog_title: z.string().min(1).max(200).optional(),
    blog_body: z.string().min(1).max(10_000).optional(),
    blog_tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  })
  .refine(
    (val) =>
      val.card_news !== undefined ||
      val.blog_title !== undefined ||
      val.blog_body !== undefined ||
      val.blog_tags !== undefined,
    {
      message: 'At least one of card_news / blog_title / blog_body / blog_tags must be provided',
    },
  );

export type PatchDraftPayload = z.infer<typeof patchDraftSchema>;

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

// Phase 7.5 — 카드 배경 이미지 Storage public URL. AI 재생성/사용자 업로드 결과.
const bgImage = z.string().url().optional();

const coverCardSchema = z.object({
  type: z.literal('cover'),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(80).optional(),
  tag: z.string().min(1).max(40).optional(),
  bg: bgEnum,
  fg: fgEnum,
  bg_image: bgImage,
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
    bg_image: bgImage,
  });

const outroCardSchema = z.object({
  type: z.literal('outro'),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(200),
  cta: z.string().min(1).max(60).optional(),
  bg: bgEnum,
  fg: fgEnum,
  bg_image: bgImage,
});

// 양산(generate) 단계 — LLM 출력 검증. 정확히 cover + body01~06 + outro 8장 tuple.
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

// 편집(PATCH) 단계 — 카드 수 자유 (max 8) + bg/fg 도 자유 hex/색이름 (color picker
// 와 8번째 preset, 사용자 custom 컬러 허용). 양산용 cardNewsSchema 의 bg/fg enum 은
// LLM 출력 검증으로 그대로 유지.
const editColor = z.string().regex(/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/, 'invalid color');

const editCoverSchema = z.object({
  type: z.literal('cover'),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(80).optional(),
  tag: z.string().min(1).max(40).optional(),
  bg: editColor,
  fg: editColor,
  bg_image: bgImage,
});
const editBodySchema = z.object({
  type: z.literal('body'),
  num: z.string().min(1).max(4).optional(),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(200),
  bg: editColor,
  fg: editColor,
  bg_image: bgImage,
});
const editOutroSchema = z.object({
  type: z.literal('outro'),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(200),
  cta: z.string().min(1).max(60).optional(),
  bg: editColor,
  fg: editColor,
  bg_image: bgImage,
});

const cardNewsEditSchema = z
  .array(z.discriminatedUnion('type', [editCoverSchema, editBodySchema, editOutroSchema]))
  .min(1)
  .max(8);

export const patchDraftSchema = z
  .object({
    card_news: cardNewsEditSchema.optional(),
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

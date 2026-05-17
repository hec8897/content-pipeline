import type { InterviewHistoryItem } from '@/interview/interview.prompts';
import type { LlmRequest } from '@/llm/types';

import { type CardNewsCard, PALETTE_PAIRS } from './drafts.schema';

const SYSTEM_INSTRUCTION = `당신은 한국어로 글 쓰는 1인 콘텐츠 작가다.
사용자가 던진 주제와 인터뷰 답변을 받아, 본인 경험이 묻어나는 자연스러운 콘텐츠를 만든다.

톤 규칙:
- 평어체 또는 부드러운 존댓말. 광고/판매 톤, AI 가 쓴 티 모두 금지.
- 인터뷰에 등장한 구체적 디테일(숫자, 장면, 감정, 고유명사)을 적극 활용. 일반론 ↓ 디테일 ↑.
- 인터뷰가 비어 있으면(스킵된 사용자) 주제 한 줄만 보고 일반론적 경험 한 편을 그래도 사람이 쓴 톤으로 구성.
- "여러분", "오늘은 ~을 알아보겠습니다" 같은 진부한 인사·메타 발언 금지.

내용 가드레일 (반드시 준수):
- 사실이 아닌 내용 금지: transcript 에 없는 사실·숫자·통계·고유명사·인용을 지어내지 마. 본 적 없는 출처/연구를 인용하지 마. 일반 상식 수준을 넘어가는 단정 금지.
- 정치적·민감 주제 금지: 정당, 정치인, 선거, 종교, 시사 논쟁, 특정 인물·집단 비판/옹호 회피. 사용자 주제가 이런 영역에 닿더라도 개인 경험·일상 톤으로만 다루고, 의견 표명·진영 언급은 하지 마.`;

const PALETTE_HINT = PALETTE_PAIRS.map((p, i) => `${i + 1}. bg="${p.bg}", fg="${p.fg}"`).join('\n');

export function serializeTranscript(history: InterviewHistoryItem[]): string {
  const pairs: string[] = [];
  let pendingQ: string | null = null;
  for (const m of history) {
    if (m.role === 'assistant') {
      pendingQ = m.content;
    } else if (m.role === 'user' && pendingQ !== null) {
      pairs.push(`Q: ${pendingQ}\nA: ${m.content}`);
      pendingQ = null;
    }
  }
  return pairs.join('\n\n');
}

function buildInputBlock(topic: string, history: InterviewHistoryItem[]): string {
  const transcript = serializeTranscript(history);
  return `주제: "${topic}"

인터뷰 transcript:
${transcript.length > 0 ? transcript : '(사용자가 인터뷰를 스킵했음 — 주제만 보고 작성)'}`;
}

export function buildCardNewsPrompt(topic: string, history: InterviewHistoryItem[]): LlmRequest {
  return {
    system: SYSTEM_INSTRUCTION,
    temperature: 0.7,
    jsonMode: true,
    messages: [
      {
        role: 'user',
        content: `${buildInputBlock(topic, history)}

위 인풋을 바탕으로 인스타 카드뉴스 8장을 만들어줘.

출력은 JSON 객체 한 개. "cards" 라는 단일 키, 그 값이 정확히 8개 요소 배열.

cards 배열 구성 (인덱스 = 슬라이드 번호):
- [0] 표지: { "type": "cover", "title": string, "subtitle"?: string, "tag"?: string, "bg": string, "fg": string }
- [1..6] 본문 6장: { "type": "body", "num": "01"~"06" (인덱스 그대로), "title": string, "body": string, "bg": string, "fg": string }
- [7] 아웃트로: { "type": "outro", "title": string, "body": string, "cta"?: string, "bg": string, "fg": string }

필드 규칙:
- title: 1~2줄, 줄바꿈은 "\\n". 짧고 임팩트. 80자 이하.
- subtitle/tag/cta: 선택. tag 는 "@minji.daily" 같은 핸들 풍 짧은 라벨.
- body: 1~2문장, 줄바꿈 "\\n". 200자 이하.
- num: 본문 카드만. 인덱스 1→"01", 2→"02", ..., 6→"06" 정확히.

bg/fg 는 아래 7쌍 중 하나만 페어 단위로 골라 (다른 hex 절대 금지):
${PALETTE_HINT}

설명, 코드 펜스, 헤더 일체 금지.`,
      },
    ],
  };
}

export function buildBlogPrompt(topic: string, history: InterviewHistoryItem[]): LlmRequest {
  return {
    system: SYSTEM_INSTRUCTION,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: `${buildInputBlock(topic, history)}

위 인풋으로 네이버 블로그 글 한 편을 마크다운으로 써줘.

출력 형식:
- 첫 줄: "# <글 제목>" (반드시 "# " 로 시작)
- 본문: 1200~1800자. ## 소제목 2~4개로 자연스럽게 구획.
- 본문 다음 한 줄 비우고 마지막 줄: "TAGS: 태그1, 태그2, 태그3" (3~5개 한국어 태그, 콤마 구분, 단어 앞에 # 붙이지 마, 태그 안에 띄어쓰기 X — 네이버 검색 노출 의도)

작성 규칙:
- 첫 줄의 "# " 외에 인사·자기소개·메타 발언 없이 본문으로 진입해도 좋고, 자연스러운 도입은 OK. 단 진부한 "안녕하세요 여러분" 류는 피해.
- 코드 펜스, 과한 인용(>) 없이 평문 문단 중심.
- transcript 의 디테일을 그대로 인용하거나 살짝 다듬어 본문에 녹여.

마크다운만 출력. JSON, 설명, 본문 안에 별도 "TAGS:" 줄 (마지막 1줄 외) 일체 금지.`,
      },
    ],
  };
}

// Phase 6 — 모든 카드 (cover/body/outro) 의 배경 이미지 생성.
// 메모리 룰 [llm_content_guardrails]: transcript 외 사실 도입 금지 + 정치·종교·시사·특정 인물 회피.
// 이미지엔 텍스트 렌더 시도 X — 텍스트는 카드 본문 layer 가 책임 (이미지는 분위기/일러스트 톤).
export const IMAGE_GEN_SYSTEM = `당신은 한국 인스타그램 피드 톤에 어울리는 카드뉴스 배경 일러스트를 만든다.

스타일 규칙:
- 미니멀, 부드러운 색조, 추상/일러스트 톤. 사진 같은 디테일·복잡한 배경 금지.
- 텍스트·글자·로고 절대 렌더링 금지 (텍스트는 별도 layer 가 그림 위에 얹음).
- 사람 얼굴/식별 가능한 인물 묘사 회피. 사람이 필요하면 뒷모습·실루엣·신체 일부만.
- 정치·종교·시사·특정 인물·집단·브랜드 묘사 회피.
- 카드 텍스트와 분위기는 연결되되, 텍스트에 없는 사실·디테일을 시각으로 지어내지 마.

레이아웃:
- 1:1 정사각 비율, 1080×1080 가정.
- 카드 본문 텍스트가 중앙~하단 layer 에 얹힌다는 전제 — 중앙·하단의 시각 디테일은 과하지 않게, 상단/주변부에 무게 두기.`;

export function buildCardImagePrompt(card: CardNewsCard, topic: string): string {
  // user-facing 텍스트만 보냄 (transcript 전체 X — privacy + 토큰).
  let summary: string;
  let role: string;
  if (card.type === 'cover') {
    summary = `${card.title}${card.subtitle ? ` / ${card.subtitle}` : ''}${card.tag ? ` (${card.tag})` : ''}`;
    role = '카드뉴스 표지';
  } else if (card.type === 'outro') {
    summary = `${card.title} — ${card.body ?? ''}${card.cta ? ` / ${card.cta}` : ''}`;
    role = '카드뉴스 마지막 슬라이드(아웃트로)';
  } else {
    summary = `${card.title}${card.body ? ` — ${card.body}` : ''}`;
    role = '카드뉴스 본문 슬라이드';
  }
  return `주제: "${topic}"

${role} 의 배경 일러스트를 만들어줘.

이 슬라이드의 텍스트 요지(시각화 단서로만 사용, 글자로 그리지 마): "${summary}"

위 분위기에 맞는 1:1 배경 이미지 1장. 글자/로고/텍스트 절대 포함 금지. 사람 얼굴 회피.`;
}

export function parseBlogMarkdown(raw: string): {
  title: string;
  body: string;
  tags: string[];
} {
  const text = raw.trim();
  const lines = text.split('\n');

  // 마지막 비공백 줄에서 "TAGS:" prefix 분리 (대소문자 무시).
  let tags: string[] = [];
  let bodyEnd = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === '') continue;
    const tagMatch = line.match(/^tags\s*:\s*(.+)$/i);
    if (tagMatch) {
      tags = tagMatch[1]
        .split(',')
        .map((t) => t.trim().replace(/^#+/, '').replace(/\s+/g, ''))
        .filter((t) => t.length > 0);
      bodyEnd = i;
    }
    break;
  }

  // body 끝쪽 공백 줄 제거.
  const bodyLines = lines.slice(0, bodyEnd);
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') {
    bodyLines.pop();
  }
  const trimmedBody = bodyLines.join('\n');

  // 첫 줄이 "# 제목" 패턴인지 확인.
  const newlineIdx = trimmedBody.indexOf('\n');
  const firstLine = newlineIdx === -1 ? trimmedBody : trimmedBody.slice(0, newlineIdx);
  const rest = newlineIdx === -1 ? '' : trimmedBody.slice(newlineIdx + 1).trimStart();

  const titleMatch = firstLine.match(/^#\s+(.+)$/);
  if (!titleMatch) {
    // 첫 줄이 # 헤딩 아니면 title 비움 → service 가 topic.title 로 폴백
    return { title: '', body: trimmedBody, tags };
  }
  return { title: titleMatch[1].trim(), body: rest, tags };
}

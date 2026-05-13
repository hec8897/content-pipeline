import type { GenerateContentRequest } from '@google/generative-ai';

import type { InterviewHistoryItem } from '@/interview/interview.prompts';

import { PALETTE_PAIRS } from './drafts.schema';

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

export function buildCardNewsPrompt(
  topic: string,
  history: InterviewHistoryItem[],
): GenerateContentRequest {
  return {
    systemInstruction: { role: 'system', parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${buildInputBlock(topic, history)}

위 인풋을 바탕으로 인스타 카드뉴스 8장을 만들어줘.

출력은 JSON 배열, 정확히 8개 요소. 그 외 어떤 텍스트도 출력하지 마.

배열 구성 (인덱스 = 슬라이드 번호):
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

설명, 코드 펜스, 헤더 일체 금지. 첫 글자는 [, 마지막 글자는 ].`,
          },
        ],
      },
    ],
  };
}

export function buildBlogPrompt(
  topic: string,
  history: InterviewHistoryItem[],
): GenerateContentRequest {
  return {
    systemInstruction: { role: 'system', parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: { temperature: 0.7 },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${buildInputBlock(topic, history)}

위 인풋으로 네이버 블로그 글 한 편을 마크다운으로 써줘.

출력 형식:
- 첫 줄: "# <글 제목>" (반드시 "# " 로 시작)
- 본문: 1200~1800자. ## 소제목 2~4개로 자연스럽게 구획.
- 마지막 줄: "#태그1 #태그2 #태그3" (3~5개 한국어 해시태그, 띄어쓰기 X — 네이버 검색 노출 의도)

작성 규칙:
- 첫 줄의 "# " 외에 인사·자기소개·메타 발언 없이 본문으로 진입해도 좋고, 자연스러운 도입은 OK. 단 진부한 "안녕하세요 여러분" 류는 피해.
- 코드 펜스, 과한 인용(>) 없이 평문 문단 중심.
- transcript 의 디테일을 그대로 인용하거나 살짝 다듬어 본문에 녹여.

마크다운만 출력. JSON, 설명 일체 금지.`,
          },
        ],
      },
    ],
  };
}

export function parseBlogMarkdown(raw: string): { title: string; body: string } {
  const text = raw.trim();
  const newlineIdx = text.indexOf('\n');
  const firstLine = newlineIdx === -1 ? text : text.slice(0, newlineIdx);
  const rest = newlineIdx === -1 ? '' : text.slice(newlineIdx + 1).trimStart();

  const match = firstLine.match(/^#\s+(.+)$/);
  if (!match) {
    // 첫 줄이 # 헤딩 아니면 title 비움 → service 가 topic.title 로 폴백
    return { title: '', body: text };
  }
  return { title: match[1].trim(), body: rest };
}

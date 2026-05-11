import type { Content, GenerateContentRequest } from '@google/generative-ai';

export interface InterviewHistoryItem {
  role: 'assistant' | 'user';
  content: string;
}

const SYSTEM_INSTRUCTION = `당신은 한국어로 진행하는 콘텐츠 작가의 인터뷰어다.
목표: 사용자가 던진 한 줄 주제에서 출발해, 직전 답변을 받아 점점 더 구체적으로 파고들어 글감이 될 만한 사용자의 경험·감정·디테일을 끌어낸다.

규칙:
- 한 번에 질문 하나만. 두 가지를 묶지 않는다.
- 매 질문은 직전 답변의 키워드를 받아 한 단계 더 깊게 파고든다. 일반론 금지.
- 한 문장, 평어체("~했어?", "~한 적 있어?"). 30자 내외.
- "좋은 답변이네요", "이제 다음 질문드릴게요" 같은 메타 발언 금지. 질문 본문만 출력.
- 사용자의 개인 경험·구체적 장면·감정·숫자·고유명사를 끌어내는 쪽으로 유도.
- 마크다운, 따옴표, 번호 매기기 금지. 질문 텍스트만.`;

function toContents(history: InterviewHistoryItem[]): Content[] {
  return history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

export function buildFirstQuestionPrompt(topic: string): GenerateContentRequest {
  return {
    systemInstruction: { role: 'system', parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `주제: "${topic}"\n\n위 주제에 대해 사용자에게 던질 첫 질문을 만들어줘. 주제를 그대로 되묻지 말고, 사용자의 구체적 경험으로 한 발 들어가는 질문이어야 해.`,
          },
        ],
      },
    ],
  };
}

export function buildNextQuestionPrompt(
  topic: string,
  history: InterviewHistoryItem[],
): GenerateContentRequest {
  return {
    systemInstruction: { role: 'system', parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `주제: "${topic}"\n지금까지 인터뷰가 이어지고 있어. 직전 사용자 답변을 받아 한 단계 더 깊게 파고드는 다음 질문을 만들어줘.`,
          },
        ],
      },
      ...toContents(history),
      {
        role: 'user',
        parts: [{ text: '다음 질문을 출력해.' }],
      },
    ],
  };
}

export function buildEnoughJudgePrompt(
  topic: string,
  history: InterviewHistoryItem[],
): GenerateContentRequest {
  const transcript = history
    .map((m) => `${m.role === 'assistant' ? 'Q' : 'A'}: ${m.content}`)
    .join('\n');

  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `다음은 "${topic}" 주제로 진행한 인터뷰의 transcript 다.

${transcript}

블로그 글 + 카드뉴스 한 묶음을 만들기에 사용자의 구체적 경험·디테일이 충분히 모였는지 판단해. 더 깊게 파야 할 미해소 지점이 있으면 NO, 충분하면 YES.

규칙:
- 출력은 정확히 "YES" 또는 "NO" 하나만.
- 다른 단어, 설명, 문장부호 금지.`,
          },
        ],
      },
    ],
  };
}

export function parseEnoughJudgement(raw: string): 'enough' | 'more' {
  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (normalized.startsWith('YES')) return 'enough';
  return 'more';
}

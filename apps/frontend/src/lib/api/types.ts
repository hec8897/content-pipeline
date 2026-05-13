export type SessionStatus = 'active' | 'completed' | 'skipped';
export type EndReason = 'user_stop' | 'ai_judged_enough' | 'max_reached';
export type MessageRole = 'assistant' | 'user';

export interface Topic {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewSession {
  id: string;
  topic_id: string;
  user_id: string;
  status: SessionStatus;
  end_reason: EndReason | null;
  started_at: string;
  ended_at: string | null;
}

export interface InterviewMessage {
  id: string;
  session_id: string;
  turn: number;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface TopicDetail {
  topic: Topic;
  session: InterviewSession | null;
  messages: InterviewMessage[];
}

export interface StartInterviewResult {
  session: InterviewSession;
  messages: InterviewMessage[];
}

export type AnswerResult =
  | {
      kind: 'next';
      userMessage: InterviewMessage;
      assistantMessage: InterviewMessage;
      session: InterviewSession;
    }
  | {
      kind: 'done';
      userMessage: InterviewMessage;
      session: InterviewSession;
    };

export type DraftStatus = 'pending' | 'generating' | 'ready' | 'failed';

// 백엔드 zod 스키마(`CardNewsCard`) 와 모양 일치. `id` 는 frontend 측 sortable 용으로
// /new/edit 에서 별도 부여 — DB/API 레이어에는 보존하지 않음.
export interface CardNewsCardData {
  type: 'cover' | 'body' | 'outro';
  title: string;
  subtitle?: string;
  body?: string;
  num?: string;
  tag?: string;
  cta?: string;
  bg: string;
  fg: string;
}

export interface Draft {
  id: string;
  topic_id: string;
  user_id: string;
  status: DraftStatus;
  card_news: CardNewsCardData[] | null;
  blog_title: string | null;
  blog_body: string | null;
  blog_tags: string[];
  error_reason: string | null;
  model_used: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftWithTopic {
  topic: Topic;
  draft: Draft | null;
}

export interface PatchDraftPayload {
  card_news?: CardNewsCardData[];
  blog_title?: string;
  blog_body?: string;
  blog_tags?: string[];
}

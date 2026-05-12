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

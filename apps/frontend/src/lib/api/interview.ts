import { api } from './client';
import type {
  AnswerResult,
  InterviewMessage,
  InterviewSession,
} from './types';

export const interviewApi = {
  async answer(sessionId: string, content: string): Promise<AnswerResult> {
    const res = await api.post<AnswerResult>(`/interview/${sessionId}/answer`, {
      content,
    });
    return res.data;
  },

  async stop(sessionId: string): Promise<InterviewSession> {
    const res = await api.post<InterviewSession>(
      `/interview/${sessionId}/stop`,
    );
    return res.data;
  },

  async patchMessage(
    sessionId: string,
    messageId: string,
    content: string,
  ): Promise<InterviewMessage> {
    const res = await api.patch<InterviewMessage>(
      `/interview/${sessionId}/messages/${messageId}`,
      { content },
    );
    return res.data;
  },
};

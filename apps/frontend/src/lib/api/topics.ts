import { api } from './client';
import type {
  InterviewSession,
  StartInterviewResult,
  Topic,
  TopicDetail,
} from './types';

export const topicsApi = {
  async create(title: string): Promise<Topic> {
    const res = await api.post<Topic>('/topics', { title });
    return res.data;
  },

  async detail(topicId: string): Promise<TopicDetail> {
    const res = await api.get<TopicDetail>(`/topics/${topicId}`);
    return res.data;
  },

  async startInterview(topicId: string): Promise<StartInterviewResult> {
    const res = await api.post<StartInterviewResult>(
      `/topics/${topicId}/interview/start`,
    );
    return res.data;
  },

  async skipInterview(topicId: string): Promise<InterviewSession> {
    const res = await api.post<InterviewSession>(
      `/topics/${topicId}/skip-interview`,
    );
    return res.data;
  },
};

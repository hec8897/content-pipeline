import { api } from './client';
import type { Draft, DraftWithTopic, PatchDraftPayload } from './types';

export const draftsApi = {
  async generate(topicId: string): Promise<Draft> {
    const res = await api.post<Draft>(`/topics/${topicId}/draft/generate`);
    return res.data;
  },

  async get(topicId: string): Promise<DraftWithTopic> {
    const res = await api.get<DraftWithTopic>(`/topics/${topicId}/draft`);
    return res.data;
  },

  async patch(draftId: string, payload: PatchDraftPayload): Promise<Draft> {
    const res = await api.patch<Draft>(`/drafts/${draftId}`, payload);
    return res.data;
  },
};

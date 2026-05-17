import { api } from './client';
import type { Draft, DraftListItem, DraftWithTopic, PatchDraftPayload } from './types';

export const draftsApi = {
  async list(): Promise<DraftListItem[]> {
    const res = await api.get<DraftListItem[]>('/drafts');
    return res.data;
  },

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

  async regenerateCardImage(
    draftId: string,
    cardIndex: number,
  ): Promise<{ imageBase64: string }> {
    const res = await api.post<{ imageBase64: string }>(
      `/drafts/${draftId}/cards/${cardIndex}/regenerate-image`,
    );
    return res.data;
  },
};

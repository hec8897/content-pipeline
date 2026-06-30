// React Query 키 컨벤션
// - 모든 키는 배열. 첫 segment 가 도메인.
// - 인자 의존 키는 함수로 노출. invalidate 는 `qk.topics()` 같은 prefix 로 가능.

export const qk = {
  topics: () => ['topics'] as const,
  topic: (id: string) => ['topics', id] as const,
  interviewSession: (sessionId: string) => ['interview', sessionId] as const,
  draft: (topicId: string) => ['draft', topicId] as const,
  drafts: () => ['drafts'] as const,
  draftInterview: (draftId: string) => ['drafts', draftId, 'interview'] as const,
  publishJobs: (draftId: string) => ['drafts', draftId, 'publish-jobs'] as const,
};

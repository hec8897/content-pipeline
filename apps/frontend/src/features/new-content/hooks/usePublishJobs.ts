'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Channel } from '@/types';
import { publishApi } from '@/lib/api/publish';
import { qk } from '@/lib/api/queryKeys';
import type { PublishJob } from '@/lib/api/types';

// 활성(미종결) job 이 하나라도 있으면 워커 진행을 따라가기 위해 폴링.
const POLL_INTERVAL_MS = 3000;

function hasActiveJob(jobs: PublishJob[]): boolean {
  return jobs.some((j) => j.status === 'pending' || j.status === 'processing');
}

export function usePublishJobs(draftId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: draftId ? qk.publishJobs(draftId) : ['publish-jobs', 'noop'],
    queryFn: () => publishApi.listJobs(draftId!),
    enabled: !!draftId,
    // 진행 중 job 이 있는 동안만 폴링, 전부 종결되면 멈춤.
    refetchInterval: (q) => (q.state.data && hasActiveJob(q.state.data) ? POLL_INTERVAL_MS : false),
  });

  const invalidate = () => {
    if (draftId) qc.invalidateQueries({ queryKey: qk.publishJobs(draftId) });
  };

  const createJobs = useMutation({
    mutationFn: (vars: { channels: Channel[]; images?: string[] }) =>
      publishApi.create(draftId!, vars.channels, vars.images),
    onSuccess: invalidate,
  });

  const retryJob = useMutation({
    mutationFn: (jobId: string) => publishApi.retry(jobId),
    onSuccess: invalidate,
  });

  return { query, createJobs, retryJob };
}

import { Loader2, RotateCw } from 'lucide-react';

import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { Panel } from '@/components/ui/Panel';
import type { PublishJob } from '@/lib/api/types';

import { JobStatusBadge } from './JobStatusBadge';

const CHANNEL_LABEL: Record<PublishJob['channel'], string> = {
  naver: '네이버 블로그',
  insta: '인스타그램',
};

type Props = {
  jobs: PublishJob[];
  onRetry: (jobId: string) => void;
  retryingId: string | null;
};

export function PublishJobsPanel({ jobs, onRetry, retryingId }: Props) {
  return (
    <Panel title="발행 현황">
      <div className="flex flex-col">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-3 px-3.5 py-3 border-t border-border first:border-t-0"
          >
            <ChannelIcon channel={job.channel} size={28} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-text">
                {CHANNEL_LABEL[job.channel]}
              </div>
              <div className="text-[11px] text-text-3 font-mono truncate">
                {job.attempts > 0 && `attempt ${job.attempts}/${job.max_attempts}`}
                {job.status === 'failed' && job.last_error && ` · ${job.last_error}`}
                {job.status === 'published' && job.external_ref && ` · ${job.external_ref}`}
              </div>
            </div>
            <JobStatusBadge status={job.status} />
            {job.status === 'failed' && (
              <button
                onClick={() => onRetry(job.id)}
                disabled={retryingId === job.id}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[11.5px] text-text-2 border border-border hover:bg-surface-2 disabled:opacity-40"
              >
                {retryingId === job.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RotateCw className="w-3 h-3" />
                )}{' '}
                재시도
              </button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

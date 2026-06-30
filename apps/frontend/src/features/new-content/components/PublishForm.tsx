'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Send, Zap } from 'lucide-react';

import type { Channel } from '@/types';
import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { toast } from '@/lib/toast';
import { routes } from '@/lib/routes';
import { useNewContent } from '@/features/new-content/context';
import { ChannelSelector } from '@/features/new-content/components/ChannelSelector';
import { PublishJobsPanel } from '@/features/new-content/components/PublishJobsPanel';
import { usePublishJobs } from '@/features/new-content/hooks/usePublishJobs';
import { uploadCarouselImages } from '@/features/new-content/lib/uploadCarouselImages';

export function PublishForm() {
  const router = useRouter();
  const { topicId } = useNewContent();

  useEffect(() => {
    if (!topicId) router.replace(routes.newContent);
  }, [topicId, router]);

  const draftQuery = useQuery({
    queryKey: topicId ? qk.draft(topicId) : ['draft', 'noop'],
    queryFn: () => draftsApi.get(topicId!),
    enabled: !!topicId,
  });

  const draftMissing = draftQuery.data?.draft === null;
  useEffect(() => {
    if (draftMissing) router.replace(routes.newGenerate);
  }, [draftMissing, router]);

  const draftId = draftQuery.data?.draft?.id ?? null;
  // draft 에서 카드·캡션 읽기 — insta 발행 가드·업로드에 사용
  const cardNews = draftQuery.data?.draft?.card_news ?? null;
  const caption = draftQuery.data?.draft?.caption ?? null;

  const { query: jobsQuery, createJobs, retryJob } = usePublishJobs(draftId);

  const [enabled, setEnabled] = useState<Record<Channel, boolean>>({ naver: true, insta: true });
  // 이미지 준비(렌더→업로드) 진행 중 로컬 busy 상태
  const [imagesBusy, setImagesBusy] = useState(false);
  const toggle = (ch: Channel) => setEnabled((prev) => ({ ...prev, [ch]: !prev[ch] }));

  if (!topicId) return null;

  if (draftQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  const jobs = jobsQuery.data ?? [];
  const hasJobs = jobs.length > 0;

  const selectedChannels = (Object.keys(enabled) as Channel[]).filter((ch) => enabled[ch]);
  const instaSelected = enabled.insta;

  // insta 발행 가드 — 캡션 또는 카드 수 조건 미충족 시 true
  const instaInvalid =
    instaSelected &&
    (!caption?.trim() || !cardNews || cardNews.length < 2 || cardNews.length > 10);

  const isBusy = imagesBusy || createJobs.isPending;

  const submit = async () => {
    let images: string[] | undefined;

    if (instaSelected && cardNews) {
      // 인스타 채널: 카드 렌더 → Storage 업로드 → URL 배열 확보
      setImagesBusy(true);
      try {
        images = await uploadCarouselImages(draftId!, cardNews);
      } catch (err) {
        toast.error('이미지 준비 실패', {
          msg: err instanceof Error ? err.message : '카드 이미지 업로드 중 오류가 발생했어요',
        });
        setImagesBusy(false);
        return;
      }
      setImagesBusy(false);
    }

    createJobs.mutate(
      { channels: selectedChannels, images },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            // 이미 활성 job 있는 채널 — 기존 현황으로 폴백.
            toast.warn('이미 발행 대기 중', { msg: err.message });
            jobsQuery.refetch();
          } else {
            toast.error('발행 요청 실패', {
              msg: err instanceof ApiError ? err.message : '잠시 후 다시 시도해 주세요',
            });
          }
        },
      },
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[680px] flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <span className="text-[11.5px] uppercase tracking-wider text-text-3 font-mono">
            STEP 05 · 발행
          </span>
          <h1 className="text-[22px] font-semibold text-text">
            {hasJobs ? '발행 현황' : '어디에 발행할까요?'}
          </h1>
        </header>

        {hasJobs ? (
          <PublishJobsPanel
            jobs={jobs}
            onRetry={(jobId) => retryJob.mutate(jobId)}
            retryingId={retryJob.isPending ? (retryJob.variables ?? null) : null}
          />
        ) : (
          <>
            <ChannelSelector enabled={enabled} onToggle={toggle} />

            {/* insta 발행 가드 안내 */}
            {instaInvalid && (
              <p className="text-[12px] text-amber-600 px-1">
                인스타 발행에는 캡션과 카드 2장 이상이 필요해요
              </p>
            )}

            <div className="flex items-center gap-1.5 text-[12px] text-text-2 px-1">
              <Zap className="w-3.5 h-3.5 text-accent" /> 즉시 발행됩니다
            </div>

            <button
              onClick={submit}
              disabled={selectedChannels.length === 0 || isBusy || instaInvalid}
              className="inline-flex items-center justify-center gap-2 bg-text text-white rounded-md px-5 py-3 text-[13px] font-semibold hover:bg-black disabled:opacity-40"
            >
              {imagesBusy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> 이미지 준비 중
                </>
              ) : (
                <>
                  {createJobs.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}{' '}
                  발행하기
                </>
              )}
            </button>

            <p className="text-[11px] text-text-3 text-center">
              발행 큐에 추가되며 백엔드 → n8n webhook으로 전달됩니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

-- Phase 8-1 발행 큐: 채널당 활성 job 1개 보장 (이중 발행 방어).
-- "채널당 1 job = draft × channel" 불변식을 DB 레벨에서 강제.
-- pending/processing 인 (draft_id, channel) 조합만 유일. published/failed(종결) 후엔
-- 같은 채널 재발행을 허용하려고 partial index 로 활성 상태에만 적용.
create unique index publish_jobs_active_uniq
  on publish_jobs (draft_id, channel)
  where status in ('pending', 'processing');

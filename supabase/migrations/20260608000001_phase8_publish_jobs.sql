-- Phase 8-1 발행 큐: publish_jobs (채널당 1 job = draft × channel)
-- 우리 앱이 발행 큐의 Source of Truth. 워커가 pending 을 집어 n8n 트리거,
-- n8n 콜백이 published/failed 로 확정. pending → processing → published / failed.

create table publish_jobs (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references drafts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('naver', 'instagram')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'published', 'failed')),
  scheduled_at timestamptz not null default now(),
  attempts int not null default 0,
  max_attempts int not null default 3,
  last_error text,
  external_ref text,          -- 발행 결과 식별자 (인스타 media id 등, Phase 9/10)
  triggered_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 워커 폴링: status='pending' AND scheduled_at<=now() 스캔용.
create index publish_jobs_poll_idx on publish_jobs(status, scheduled_at);
-- draft 상세에서 job 목록 조회용.
create index publish_jobs_draft_idx on publish_jobs(draft_id);

-- updated_at 자동 갱신 (set_updated_at() 는 drafts 마이그레이션에서 정의됨, 재사용).
create trigger publish_jobs_set_updated_at
  before update on publish_jobs
  for each row execute function set_updated_at();

-- RLS — owner-only. 워커/콜백은 service-role 로 RLS 우회.
alter table publish_jobs enable row level security;

create policy publish_jobs_owner on publish_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

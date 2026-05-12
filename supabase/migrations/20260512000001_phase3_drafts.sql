-- Phase 3 도메인: drafts (1 topic : 1 draft, regenerate 시 in-place update)
-- 카드뉴스 JSON + 블로그 마크다운을 한 행에 묶어 보관. 발행(Phase 5) 의 입력.

create table drafts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'ready', 'failed')),
  card_news jsonb,
  blog_title text,
  blog_body text,
  error_reason text,
  model_used text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1 topic : 1 draft 강제. 재양산은 in-place update.
create unique index drafts_topic_idx on drafts(topic_id);
create index drafts_user_created_idx on drafts(user_id, created_at desc);

-- updated_at 자동 갱신 (PATCH 가 잦은 테이블)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger drafts_set_updated_at
  before update on drafts
  for each row execute function set_updated_at();

-- RLS
alter table drafts enable row level security;

create policy drafts_owner on drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Phase 2 도메인: topics / interview_sessions / interview_messages
-- RLS 활성화. 백엔드는 service-role(admin) 로 우회하지만 Phase 후반 직접 클라이언트 read 가능성 대비 정책도 셋팅.

-- topics
create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index topics_user_created_idx on topics(user_id, created_at desc);

-- interview_sessions
create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'completed', 'skipped')),
  end_reason text
    check (end_reason in ('user_stop', 'ai_judged_enough', 'max_reached')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
-- topic 당 active session 1개만 허용 (partial unique)
create unique index interview_sessions_topic_active_idx
  on interview_sessions(topic_id) where status = 'active';
create index interview_sessions_topic_idx on interview_sessions(topic_id);

-- interview_messages
create table interview_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions(id) on delete cascade,
  turn integer not null,
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  created_at timestamptz not null default now()
);
create unique index interview_messages_session_turn_role_idx
  on interview_messages(session_id, turn, role);
create index interview_messages_session_idx on interview_messages(session_id, turn);

-- RLS
alter table topics enable row level security;
alter table interview_sessions enable row level security;
alter table interview_messages enable row level security;

create policy topics_owner on topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sessions_owner on interview_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy messages_owner on interview_messages
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = interview_messages.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = interview_messages.session_id and s.user_id = auth.uid()
    )
  );

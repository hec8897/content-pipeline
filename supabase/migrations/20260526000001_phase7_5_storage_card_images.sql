-- Phase 7.5 Storage: card-images 버킷 + RLS 정책
-- 카드뉴스 배경 이미지(AI 재생성 / 사용자 업로드)의 영속 저장소.
-- 지금은 프론트 in-memory data URL 만 보관 → 새로고침 시 소실 + 발행 시 외부 채널이
-- fetch 할 URL 없음. public read 라 외부 채널(인스타 Graph API 등)이 URL 만으로 fetch 가능.

-- 버킷 생성 (public read, 5MB 제한, png/jpeg/webp 만)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- RLS — storage.objects 는 기본 RLS enabled. 아래 정책으로 card-images 접근을 규정한다.
-- 실제 업로드는 backend 가 service-role key 로 처리(RLS 우회)하고 controller ownership 검증이
-- 1차 방어. 아래 정책들은 사용자가 anon/authenticated key 로 직접 access 하는 경우의 안전장치.
-- 경로 규약: card-images/<user_id>/<draft_id>/<file> — 첫 폴더 segment 가 소유자 user_id.

-- READ: public (URL 만 알면 누구나 — 외부 채널 fetch 위해)
create policy "Public read for card-images"
  on storage.objects for select
  using (bucket_id = 'card-images');

-- INSERT: 본인 폴더에만 (path 첫 segment = auth.uid())
create policy "User can upload to own card-images folder"
  on storage.objects for insert
  with check (
    bucket_id = 'card-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE: 본인 폴더만
create policy "User can update own card-images"
  on storage.objects for update
  using (
    bucket_id = 'card-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: 본인 폴더만
create policy "User can delete own card-images"
  on storage.objects for delete
  using (
    bucket_id = 'card-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

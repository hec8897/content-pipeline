-- Phase 4: 블로그 해시태그를 본문 마지막 줄에서 분리해 별도 컬럼으로 보관.
-- 양산 시 prompt 파서가 본문에서 추출 → blog_tags 채움.
-- 편집기는 chip 으로 표시/수정. 빈 배열 default — null vs 빈 배열 양분 회피.

alter table drafts
  add column blog_tags text[] not null default '{}';

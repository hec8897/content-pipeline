-- Phase 1b Task 6 — n8n_runner 추가 권한 (database CONNECT/CREATE + public schema USAGE/CREATE).
--
-- 의도:
--   Task 2 마이그레이션 (20260518000001) 의 schema-only 권한으로는 n8n typeorm 의 schema
--   migration 동작이 fail (Task 6 디버깅 중 발견).
--
--   typeorm 의 PostgresDriver.connect → getCurrentSchema 가 database 레벨 권한 +
--   public schema 접근을 요구함. n8n_runner 한테 database CONNECT/CREATE 와
--   public schema USAGE/CREATE 를 부여하여 n8n 컨테이너의 첫 부팅 (schema migration)
--   이 성공하도록.
--
-- 보안 트레이드오프:
--   Task 2 의 격리 의도 (public schema 차단) 가 일부 완화됨. 단 PostgreSQL default 는
--   `PUBLIC` role 이 schema public 의 USAGE 를 자동 보유하여 사실상 Task 2 의 REVOKE
--   가 무력화된 상태였음 (Task 6 진단 중 `pub_usage=true` 확인). public schema 의 객체
--   접근 차단을 진짜 보장하려면 `REVOKE USAGE ON SCHEMA public FROM PUBLIC` 까지 해야
--   하나, Supabase 의 다른 운영 도구가 PUBLIC 의존하므로 그건 별도 검토. dogfooding
--   단계에선 우리 도메인 테이블의 RLS 정책이 사용자별 격리를 담당하므로 schema-level
--   open 은 허용 가능.
--
-- 적용:
--   Supabase Dashboard → SQL Editor 에 붙여넣기 → Run. 또는 supabase CLI 의
--   `supabase db push` (idempotent — 이미 부여된 권한엔 영향 없음).

-- 1. database `postgres` 의 CONNECT + CREATE
GRANT CONNECT, CREATE ON DATABASE postgres TO n8n_runner;

-- 2. public schema 의 USAGE + CREATE (typeorm 의 첫 query 가 default schema 접근)
GRANT USAGE, CREATE ON SCHEMA public TO n8n_runner;

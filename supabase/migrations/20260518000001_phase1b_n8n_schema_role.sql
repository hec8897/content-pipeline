-- Phase 1b — n8n self-host 용 schema + role.
--
-- 의도:
--   ECS 위에 띄울 n8n 컨테이너가 우리 Supabase Postgres 를 backend 로 사용.
--   별도 RDS 추가 없이 같은 Postgres 안 `n8n` schema 에 워크플로우 데이터 격리.
--   `n8n_runner` role 은 `n8n` schema 만 만질 수 있고 우리 앱의 `public` schema 는
--   접근 차단 — least privilege.
--
-- 적용 방법:
--   1. password 를 본인 환경에서 생성:
--        openssl rand -base64 32 | tr -d '/+=' | head -c 32 ; echo
--   2. 생성된 password 를 안전한 곳 (1Password 등) 에 저장. 추후 Phase 1b Task 5/6
--      에서 SSM Parameter Store `/cp/n8n_runner_password` 에 저장 → ECS task def 가
--      secret 으로 주입.
--   3. 본 SQL 의 `__N8N_RUNNER_PASSWORD__` 를 생성한 password 로 치환 (sed / 에디터).
--   4. Supabase Dashboard → SQL Editor 에 치환한 SQL 붙여넣기 → Run.
--      또는 supabase CLI: `supabase db push` (migrations 디렉토리 자동 인식).
--   5. **치환된 SQL 은 commit 금지** — 본 파일 (placeholder 버전) 만 commit.

-- 1. n8n_runner role 생성 (이미 있으면 skip)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'n8n_runner') THEN
    EXECUTE format('CREATE ROLE n8n_runner LOGIN PASSWORD %L', '__N8N_RUNNER_PASSWORD__');
  END IF;
END $$;

-- 2. n8n schema 생성. owner = current_user (postgres). Supabase 의 default user 가
-- n8n_runner 의 ADMIN 권한 보유 X 라 `AUTHORIZATION n8n_runner` 또는
-- `GRANT n8n_runner TO CURRENT_USER` 같은 명령은 권한 거부됨. owner 는 그대로 두고
-- n8n_runner 에게 USAGE + CREATE 만 grant. n8n 가 schema 안에 자기 테이블 만들 때
-- 그 테이블의 owner 는 자동으로 n8n_runner (CREATE 한 role 이 owner) → default
-- privileges 명령 불필요 (owner 본인이라 모든 권한 자동).
CREATE SCHEMA IF NOT EXISTS n8n;

-- 3. n8n_runner 에게 n8n schema 안 자유로운 객체 생성 권한
GRANT USAGE, CREATE ON SCHEMA n8n TO n8n_runner;

-- 4. public schema (우리 앱 도메인 테이블) 접근 차단
REVOKE ALL ON SCHEMA public FROM n8n_runner;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM n8n_runner;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM n8n_runner;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM n8n_runner;

-- 5. search_path 기본값 n8n 로 (n8n 컨테이너가 매번 SET 안 해도 되게)
ALTER ROLE n8n_runner SET search_path TO n8n;

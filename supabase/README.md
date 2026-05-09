# Supabase Migrations

content-pipeline 전용 Supabase 프로젝트 (`fphlsaulrqfjtjmwbkdw`) 의 raw SQL 마이그레이션을 관리합니다.

## 명명 규칙

`YYYYMMDDHHMMSS_<description>.sql` — 14자리 타임스탬프 + 스네이크케이스 설명.

예: `20260509115211_extensions.sql`

> 호스티드 적용 시점의 실제 timestamp 를 파일명에 그대로 반영 (Supabase CLI `supabase db push` 와 호환되는 명명 규칙). 적용 전 임시 timestamp 로 작성한 후, 적용 후 호스티드 `migrations.version` 에 맞춰 파일명을 rename 한다.

## 적용 방법 (Phase 1a — 호스티드 직접 적용)

1. https://supabase.com/dashboard 의 cp 프로젝트 → **SQL Editor** 진입
2. `migrations/` 디렉토리의 파일을 **타임스탬프 오름차순**으로 하나씩 열어 SQL Editor 에 붙여넣고 **Run**
3. 적용 후 커밋 메시지에 적용 일자 / 환경(`dev` / `prod`) 기록

> Phase 1b 이후 CI/CD 가 굳혀지면 `supabase db push` (Supabase CLI) 또는 GitHub Actions 자동 적용으로 전환 검토.

## 롤백 정책

본 레포는 **down 마이그레이션을 두지 않습니다**. 롤백이 필요하면 새 타임스탬프로 `revert_<original_name>.sql` 파일을 추가합니다 — 이력이 남고 prod 적용 추적이 쉬움.

## 도메인 테이블 도입 시점

Phase 1a 시점은 익스텐션 활성화만. 도메인 테이블 (`topics` / `interview_sessions` / `interview_messages` / `drafts` / `publish_queue` 등) 은 Phase 2 첫 마이그레이션에서 `user_id uuid references auth.users(id)` FK + RLS 정책 (`auth.uid() = user_id`) 함께 도입.

# Phase 1a — 인증 기반

**목표**: backend에 Supabase 인증/Health, frontend에 login/callback/AuthGuard. Phase 2(AI 인터뷰) 위에 얹을 토대 완성.

**원칙**: devjournal 1차 패턴 1:1 재활용 (`/Users/dawoon/Desktop/dev/toy-monorepo/apps/devjournal/{backend,frontend}`). 코드 디테일은 거기 보고 베끼면 됨.

**Out-of-scope**: 도메인 테이블(Phase 2), Docker/ECS/n8n(Phase 1b), HMAC(Phase 5).

---

## 사전 작업

- Supabase 신규 프로젝트 `content-pipeline` 생성 (Seoul region)
- Supabase Auth Providers → Google 활성화 (Google Cloud OAuth 2.0 Client ID 발급 필요)
- Supabase Auth Redirect URLs 에 `http://localhost:3000/auth/callback` 추가
- `apps/backend/.env` + `apps/frontend/.env.local` 작성 (`.env.example`도 같이 커밋)

환경 변수:
- backend: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL=http://localhost:3000`, `PORT=3001`
- frontend: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Task 1 — Supabase 마이그레이션 디렉토리

- `supabase/migrations/20260509000001_extensions.sql` 작성: `create extension if not exists pgcrypto;`
- Dashboard SQL Editor 에 직접 적용
- `supabase/README.md` 에 적용/롤백 가이드 1쪽

## Task 2 — Backend 의존성 + 구조 정리

- `pnpm --filter backend add @nestjs/config @supabase/supabase-js`
- `tsconfig.json` 에 `"paths": { "@/*": ["src/*"] }` 추가
- `src/{app.module,app.controller,app.controller.spec,app.service}.ts` → `src/app/` 로 이동
- `main.ts` 의 import 경로만 갱신

## Task 3 — Backend SupabaseModule

- 베끼기: `toy-monorepo/apps/devjournal/backend/src/supabase/{supabase.module,supabase.service,database.types}.ts`
- `database.types.ts`는 빈 placeholder (Phase 2에서 자동 생성으로 교체)
- `AppModule`에 `ConfigModule.forRoot({ isGlobal: true })` + `SupabaseModule` 추가

## Task 4 — Backend SupabaseAuthGuard

- 베끼기: `toy-monorepo/apps/devjournal/backend/src/auth/supabase-auth.guard.ts`
- 테스트 코드는 작성하지 않음 (토큰 관리 — 후속 사이클로 보류)

## Task 5 — Backend HealthController

- public `GET /api/health` → `{ status: 'ok', timestamp }`
- 테스트 코드는 작성하지 않음

## Task 6 — Backend main.ts 정비

- `setGlobalPrefix('api')`, `ValidationPipe(whitelist+forbidNonWhitelisted+transform)`, CORS는 `FRONTEND_URL`만 허용, port 3001
- 검증: `curl http://localhost:3001/api/health` → 200

## Task 7 — Frontend 의존성 + Supabase client

- `pnpm --filter frontend add @supabase/supabase-js @supabase/ssr zustand`
- `src/lib/supabase/client.ts` (browser) + `src/lib/supabase/server.ts` (server) — devjournal 패턴 그대로

## Task 8 — Frontend authStore + SupabaseProvider

- 베끼기: devjournal `domains/auth/infrastructure/authStore.ts`, `shared/providers/SupabaseProvider.tsx`
- 위치는 본 레포 컨벤션에 맞춰: `src/lib/auth/store.ts`, `src/components/providers/SupabaseProvider.tsx`
- `RootLayout` (`src/app/layout.tsx`)에 `<SupabaseProvider>` 적용

## Task 9 — Frontend Login + Callback

- `src/app/(auth)/layout.tsx` (centered)
- `src/app/(auth)/login/page.tsx` — GitHub OAuth 버튼 (devjournal `LoginPageView` 참고)
- `src/app/auth/callback/route.ts` — code → session 교환 후 `/` 리다이렉트, 실패 시 `/login?error=`

## Task 10 — Frontend AuthGuard

- `src/components/auth/AuthGuard.tsx` (devjournal 그대로)
- `src/app/(app)/layout.tsx` 에 wrapping. 기존 5개 화면 + new flow의 mock-data는 **그대로 둔다** (Phase 2부터 점진 교체)

## Task 11 — 통합 검증 (수동)

`pnpm dev` → 브라우저:

1. 시크릿 창으로 `localhost:3000` → `/login` 리다이렉트 ✓
2. Google 로그인 → `/auth/callback` → `/` 진입, 사이드바 보임 ✓
3. Supabase Dashboard → Authentication → Users 에 1행 추가 ✓
4. `curl localhost:3001/api/health` → 200 ✓

## Task 12 — 마무리

- `CLAUDE.md` 에 Supabase env 필요 1줄 추가
- 브랜치 정리 (`finishing-a-development-branch` 호출)

---

## 완료 기준

- type-check pass (test 신규 작성은 본 phase 스코프 외 — 토큰 관리)
- `pnpm dev` 로 둘 다 기동 + Health 200
- GitHub 로그인 → 보호 라우트 진입까지 한 번 성공
- 호스티드 Supabase에 `pgcrypto` 활성화

다음: Phase 2 (AI 인터뷰) plan 작성. Phase 2 첫 작업이 도메인 테이블 첫 마이그레이션 — 이 plan에서 다진 `supabase/migrations/` 패턴 위에 그대로 얹는다.

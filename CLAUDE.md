# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

`content-pipeline` 은 한국 채널 특화 콘텐츠 자동화 SaaS. 사용자가 주제 한 줄을 던지면 AI가 멀티턴 인터뷰로 경험을 끌어내고, 인스타 카드뉴스 + 블로그 글 묶음을 양산해 한국 채널(네이버 블로그 메일 트릭, Meta Graph API 인스타)로 자동 발행한다.

제품/아키텍처 결정의 단일 진실 원천은 **`docs/plans/2026-04-28-content-pipeline-saas-design.md`** 다. 제품/아키텍처에 영향 가는 작업을 시작하기 전에 반드시 먼저 읽을 것 — brainstorming 결과, Phase 기반 MVP 스코프, 결정 이력이 모두 여기 있음. Phase 별 구현 plan 은 같은 디렉토리(`docs/plans/`)에 함께 둔다.

## 명령어

루트에서 pnpm + Turborepo 로 실행. workspace 타겟팅은 turbo `--filter` 사용.

```bash
pnpm install                    # 워크스페이스 전체 의존성 설치
pnpm dev                        # turbo dev (frontend + backend 병렬)
pnpm dev:frontend               # next dev (apps/frontend)
pnpm dev:backend                # nest start --watch (apps/backend)
pnpm build                      # turbo build (^build dependsOn 그래프 따름)
pnpm build:frontend / build:backend
pnpm lint                       # 워크스페이스 전체 lint
pnpm type-check                 # 워크스페이스 전체 tsc --noEmit
pnpm test                       # turbo test (build 산출물 의존)
pnpm format                     # prettier 전체 포맷
```

백엔드 단일 테스트 실행 (jest, `apps/backend`):

```bash
pnpm --filter backend test -- <pattern>          # 패턴 매칭 단위 테스트
pnpm --filter backend test:watch
pnpm --filter backend test:e2e                   # test/jest-e2e.json 사용
pnpm --filter backend test:cov
```

## 아키텍처

### 레포 구조

```
apps/
  backend/    # NestJS 11 (기본 스캐폴드; nest-cli + jest)
  frontend/   # Next.js 16 + Tailwind v4 + App Router + src/
packages/     # 자리만 비워둠. 공용 타입/zod 스키마 필요해질 때 여기에 둠
```

Turborepo 태스크 파이프라인 (`turbo.json`):

- `build` 는 `^build` 의존, 출력은 `dist/**` 와 `.next/**` (`.next/cache` 제외)
- `dev` 는 `cache: false, persistent: true`
- `test`, `type-check` 는 `^build` 의존

워크스페이스 선언은 `pnpm-workspace.yaml`. 같은 파일에 `ignoredBuiltDependencies` (`sharp`, `unrs-resolver`) 도 있음.

### 계획된 런타임 아키텍처

아직 구현 안 됨. 코드 추가 시 사전 제약으로 반영할 것:

- **우리 앱이 발행 큐의 Source of Truth.** 발행 작업은 우리 DB에 `pending → processing → published / failed` 로 영속화.
- **n8n 은 replaceable 실행 엔진**, webhook 으로 트리거. 발행 어댑터 인터페이스를 추상화해서 n8n 교체 시 도메인 코드 안 건드리게 유지.
- **인증**: Supabase Auth + NestJS 측 `SupabaseAuthGuard`.
- **DB**: content-pipeline 전용 Supabase Postgres. n8n 영속은 같은 DB 의 별도 `n8n` schema + `n8n_runner` role.
- **배포**: ECS Fargate + ECR, 단일 VPC public subnet only (NAT 없음). `n8n.<도메인>` UI 는 Cloudflare Access (Zero Trust) 게이트, `/webhook/*` 는 public + 백엔드 HMAC 시그니처.
- **CI/CD**: GitHub Actions OIDC → ECR push → `aws ecs update-service --force-new-deployment`.
- **AI**: `openai` SDK, 텍스트 `gpt-5` 메인 + `gpt-5-mini` 폴백, 이미지 `gpt-image-1` (medium, 1024×1024).
- **로컬 개발**: `apps/backend/.env` + `apps/frontend/.env.local` 에 cp 전용 Supabase 신규 프로젝트의 `SUPABASE_URL` / `SUPABASE_ANON_KEY` (= `sb_publishable_*`) / `SUPABASE_SERVICE_ROLE_KEY` (= `sb_secret_*`) 가 필요. 백엔드 `.env` 에는 추가로 `OPENAI_API_KEY` (platform.openai.com) 필요. 각 패키지의 `.env(.local).example` 참고. 마이그레이션은 `supabase/migrations/` 디렉토리 하에 raw SQL 로 관리, Dashboard SQL Editor 또는 MCP `apply_migration` 으로 적용.

## 컨벤션

- **Prettier 는 루트로 통합** (`.prettierrc`, `.prettierignore`). 패키지별 `.prettierrc` 다시 만들지 말 것 (NestJS 스캐폴드가 만든 것은 의도적으로 제거함).
- **`apps/frontend/AGENTS.md` 경고**: 이 Next.js (v16) 는 학습 데이터의 Next.js 와 다름. 프론트 코드 작성 전에 `apps/frontend/node_modules/next/dist/docs/` 의 관련 가이드를 먼저 읽고 deprecation 안내를 따를 것.
- 각 워크스페이스는 `dev`, `build`, `lint`, `test`, `type-check` 스크립트를 노출해 Turborepo 가 일관되게 오케스트레이션하도록 유지. 새 워크스페이스 추가 시 같은 표면을 맞출 것.
- 프론트 코드는 `apps/frontend/src/` 아래 (App Router 는 `src/app/`).

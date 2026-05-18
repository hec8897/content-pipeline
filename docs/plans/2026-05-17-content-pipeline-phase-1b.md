# Phase 1b — 인프라 (Vercel + ECS Fargate + n8n + AWS Cognito)

**목표**: dogfooding 사이클을 로컬에서 클라우드로 끌어올린다. frontend 는 Vercel, backend + n8n 은 ECS Fargate (단일 VPC public subnet only) 위에. 발행 phase (8~) 진입 직전 단계 — Meta Graph API / 네이버 / n8n 워크플로우 셋업이 가능한 인프라 토대를 깐다.

**아키텍처 한 줄**: frontend → Vercel (CDN + Next.js 16 first-party). backend (NestJS) + n8n (self-host) → ECS Fargate on 단일 VPC. n8n 데이터는 cp Supabase Postgres 의 `n8n` schema (Supabase pooler). 도메인 = 가비아 구매 + Route53 nameserver 위임. `n8n.<도메인>` UI 는 **ALB authenticate-cognito** (User Pool 본인 1명) 게이트, `/webhook/*` 는 별도 listener rule 로 public + 백엔드 HMAC 시그니처. CI/CD = GitHub Actions OIDC → ECR push → `aws ecs update-service --force-new-deployment`.

**스택 변동**:
- 신규: AWS (ECS Fargate, ECR, ALB, VPC, IAM OIDC, **Route53 hosted zone, ACM, Cognito user pool**), Vercel 계정, **가비아 도메인 1개**
- backend `apps/backend/Dockerfile` 신규
- n8n 은 공식 `n8nio/n8n` 이미지 그대로 사용 (자체 Dockerfile X)
- GitHub Actions 워크플로우 신규 (build + push + deploy)
- `apps/frontend/vercel.json` (선택, 환경별 분기 필요 시)
- Cloudflare 사용 X (이전 plan 의 Cloudflare DNS / Zero Trust 결정 폐기)

**Out-of-scope**:
- 실제 발행 어댑터 (Meta Graph API / 네이버 메일 트릭) — Phase 9, 10
- 발행 큐 / 스케줄러 도메인 모델 (`publish_jobs` 같은 테이블) — Phase 8
- n8n 워크플로우 그 자체 (HTTP webhook 수신 후 어댑터 호출) — Phase 8+
- backend horizontal scaling / 다중 task / blue-green 배포 — 본 phase 는 ECS service 1 desired count 로 시작
- 모니터링 / 로깅 / alerting (CloudWatch dashboard / Datadog 등) — 본 phase 는 ECS task logs (CloudWatch Logs) 뷰만
- DB backup 전략 — Supabase 자체 자동 백업 기본값 의존, 별도 dump 정책 없음
- 비용 최적화 (Fargate Spot, Compute Savings Plan) — dogfooding 단계엔 on-demand
- HTTPS cert 자동 갱신 정책 세분화 — ACM 자동 갱신 의존, 갱신 실패 알림 SNS 는 후속 phase

---

## 사전 작업

- AWS 계정 + 결제 등록. IAM 사용자 / Org / 리전 (`ap-northeast-2` Seoul 권장 — Supabase ap-northeast-2 와 매칭)
- **가비아 계정 + 도메인 1개 구매** (`.com` / `.dev` / `.co.kr` 중. dogfooding 한정이면 `.dev` 또는 `.com` 추천)
- AWS Route53 hosted zone 생성 → NS 레코드 4개 확인 → **가비아 도메인 설정에서 nameserver 변경** (propagation 24~48h, 대부분 1~3h 안 끝남)
- Vercel 계정 (GitHub 로그인 권장 — Vercel ↔ GitHub Action 자동 deploy)
- GitHub repo Secrets / OIDC 셋업 권한
- Supabase 프로젝트의 `n8n_runner` role + `n8n` schema 사전 생성 (SQL migration 1개)

---

## 도메인 결정 (lock-in)

### 1. frontend = Vercel (Next.js 16 first-party)
- Hobby tier 무료, PR preview 자동, 이미지/폰트/edge runtime 자동 최적화.
- environment variable `NEXT_PUBLIC_API_BASE_URL` 는 Vercel project setting 에서 production / preview 분리 — production 은 ECS ALB 도메인, preview 는 staging backend 또는 동일 prod 백엔드 임시 공유.
- 사유 — Vercel CLI / GitHub 통합으로 deploy 셋업 거의 0. ECS 위에 Next.js standalone 띄울 이유 약함 (이미지 최적화 / CDN / 빌드 캐시 자체 구현 부담).
- 후보 폐기: Vercel 외 Netlify / CloudFront + S3 정적 호스팅 — Next 16 App Router 의 RSC / Server Action 호환 비용 큼.

### 2. backend + n8n = ECS Fargate (단일 VPC public subnet)
- 2026-04-29 결정 그대로 유지 (Docker 학습 + 껐다 켰다 비용 모델).
- 단일 VPC, public subnet 2개 (가용영역 2개), NAT Gateway 없음 (NAT 비용 회피).
- backend = ECS service A (desired 1, 포트 3001), n8n = ECS service B (desired 1, 포트 5678).
- 두 service 모두 ALB 1개 뒤. 호스트 헤더 기반 라우팅 — `api.<도메인>` → backend, `n8n.<도메인>` → n8n.
- 사유 — production-grade 학습 + 인프라 표면 미래 확장 가능 (n8n 워크플로우 늘면 task 분리, backend 부하 시 desired count ↑).

### 3. n8n 영속 = cp Supabase Postgres 의 `n8n` schema (2026-04-29 결정 유지)
- 별도 RDS / managed Postgres 추가 X. 비용 / 관리 표면 단일화.
- `n8n_runner` PostgreSQL role + `n8n` schema 만 권한 제한 (다른 도메인 테이블 접근 X). `supabase/migrations/00X_n8n_role.sql` 신규.
- n8n 환경변수: `DB_TYPE=postgresdb`, `DB_POSTGRESDB_HOST/PORT/DATABASE/USER/PASSWORD/SCHEMA` 를 Supabase pooler 정보로.
- 사유 — content-pipeline 의 DB 가 진실의 단일 원천(SoT). n8n 의 워크플로우 상태도 같은 DB 안 별도 schema 로 보관 → 백업 / RLS 격리 / 모니터링 일원화.

### 4. n8n 노출 = AWS Cognito + ALB authenticate-cognito (UI) + public webhook (HMAC)
- `n8n.<도메인>` 의 root path → ALB listener rule `authenticate-cognito` action. Cognito User Pool 1개 + App Client 1개. User Pool 에 본인 계정 1명만 등록.
- 단 `n8n.<도메인>/webhook/*` 는 별도 ALB listener rule (priority 더 높게) — Cognito skip + n8n TG 로 forward. backend 가 webhook 호출 시 HMAC signature (HMAC-SHA256, `x-cp-signature` 헤더). n8n 워크플로우 첫 노드가 signature 검증.
- 사유 — Cloudflare Access 동등 효과를 AWS 안에서 (가비아+Route53 결정으로 Cloudflare 스택 제거됨). ALB authenticate-cognito 는 listener rule 단위로 정책 분기 가능 → UI 만 게이트, webhook 은 public. AWS 학습 가치 high. 후보 (Tailscale VPN / oauth2-proxy / Cloudflare Tunnel 하이브리드) 는 메모로 남김.
- Cognito 호스팅 UI = Cognito 의 default `<pool-domain>.auth.<region>.amazoncognito.com` 사용 (커스텀 도메인 X — 본 phase 스코프 절약). MFA 는 본인 계정 한정이라 SMS/TOTP 옵션이지만 본 phase 는 단순 비밀번호 + email verify.

### 5. 도메인 / TLS / DNS = 가비아(구매) + AWS Route53(DNS) + ACM(TLS)
- 도메인 구매처 = **가비아** (한국 vendor, 결제·영수증 한국 표준, `.com` ~15,000원/년 / `.dev` ~25,000원/년 / `.co.kr` 도 가능).
- 가비아 도메인 설정 → nameserver 를 **AWS Route53** 의 NS 레코드 (4개) 로 변경. propagation 24~48h 가능성.
- Route53 hosted zone 안 레코드:
  - `app.<도메인>` → Vercel CNAME (Vercel 안에서 자동 SSL)
  - `api.<도메인>` → ALB A record (alias)
  - `n8n.<도메인>` → ALB A record (alias)
- TLS — **ACM 발급 `*.<도메인>` wildcard cert** (Route53 DNS 자동 검증, 자동 갱신). ALB listener :443 에 attach.
- 사유 — Cloudflare 스택 제거 결정 (도메인 결정 4 의 Cognito 채택과 정합). AWS 단일 게이트 + 한국 vendor 도메인 구매 학습 가치. ACM ↔ Route53 통합은 AWS 표준이라 학습 의미.

### 6. CI/CD = GitHub Actions OIDC → ECR → ECS (2026-04-29 결정 유지)
- AWS IAM OIDC provider 등록 (GitHub Actions). IAM role 의 trust policy 가 본 repo + `main`/`develop` branch 만 허용.
- workflow:
  - `develop` push → staging deploy (한 환경만 우선, staging 없으면 single 환경)
  - `main` push → production deploy
- 단계: build → docker build → `aws ecr get-login-password` → push → `aws ecs update-service --force-new-deployment`.
- frontend 는 별도 — Vercel ↔ GitHub 통합으로 push 자동 deploy (Vercel 측에서 처리, Actions 와 분리).
- 사유 — OIDC 키 만료 / 회전 운영 부담 0. AWS access key 를 secrets 에 안 둠.

### 7. backend Dockerfile / 빌드 산출물
- multi-stage Dockerfile: (a) deps install → (b) build (`pnpm --filter backend build`) → (c) production runtime (`node:22-slim` 또는 `node:22-alpine`).
- 산출물 = `dist/main.js` + `node_modules` (prod only) + `package.json`.
- ENTRYPOINT = `node dist/main.js`.
- ECS task health check = `GET /api/health` (이미 `apps/backend/src/health/` 존재 확인).
- 사유 — 이미지 크기 최소 + 로컬 docker compose 와 동일 동작 (개발/배포 환경 일관).

### 8. secrets / env 관리
- backend `.env` 의 모든 값 (SUPABASE_*, OPENAI_API_KEY, FRONTEND_URL, PORT, IMAGE_GEN_MODE, HMAC 시크릿) → ECS task definition 의 `secrets` 필드로 AWS Systems Manager Parameter Store 참조.
- Parameter Store 는 SecureString. IAM role 의 task execution role 에 `ssm:GetParameters` 권한.
- 사유 — Secrets Manager 보다 Parameter Store 가 무료 tier 넉넉 (10000 params) + dogfooding 스케일 충분. Vercel 측 frontend env 는 Vercel project setting 그대로.

### 9. 비용 / 스케일 예상
- 가비아 도메인 — `.com` ~15,000원/년 (~$1/월), `.dev` ~25,000원/년 (~$1.7/월). 1회성 1년 결제
- ECS Fargate (0.25 vCPU + 0.5GB) × 2 task (backend + n8n) × 24h × 30일 ≈ ~$15~20/월
- ALB ≈ ~$16/월 (시간 단위 + LCU)
- Route53 hosted zone $0.50/월 + query 미세
- ACM 무료
- Cognito 50 MAU free tier — 본인 1명이라 무료
- Supabase free tier 그대로 (DB / Auth)
- Vercel hobby 무료
- 총: 약 **$33~38/월** + 도메인 연 ~$15 (이전 Cloudflare-단일 plan 의 $30~40 과 거의 동등 — Cognito·Route53·ACM 추가가 Cloudflare proxy 무료를 상쇄)
- backend / n8n 야간 정지 옵션 — `aws ecs update-service --desired-count 0` 으로 껐다 켰다. 운영 시간만 켜면 절반 이하.

### 10. 실패 / 롤백 시나리오
- 배포 실패 → ECS service 의 deployment configuration `minimumHealthyPercent: 100, maximumPercent: 200` 으로 rolling. 헬스체크 실패 시 자동 롤백 (ECS 가 직전 task 유지).
- Route53 hosted zone 장애 → 도메인 응답 X. AWS SLA 의존 (Route53 = 100% SLA 약속, 사실상 안전).
- ALB / ACM cert 갱신 실패 → ACM 자동 갱신 실패 시 cert 만료. 갱신 알림 SNS 셋업 권장 (본 phase 외).
- DB 장애 → backend / n8n 둘 다 fail. Supabase 자체 SLA 의존 (free tier 는 SLA 약함 — dogfooding 한정).
- Cognito 장애 → n8n UI 인증 차단 (webhook 은 별개 listener rule 이라 영향 X). AWS 표준 의존.

---

## API 표면

신규 / 변경 없음. 본 phase 는 인프라만 다룸. 기존 라우트 (`/api/drafts/*`, `/api/interview/*`, `/api/topics/*`, `/api/health`) 그대로.

n8n webhook endpoint 는 외부 노출:
```
POST n8n.<도메인>/webhook/<workflow-id>
  헤더: x-cp-signature: <hex hmac sha256>
  body: workflow-specific JSON
  응답: workflow 결과 (Phase 8+ 의 워크플로우 자체 책임)
```
본 phase 에선 endpoint 가 동작 (HMAC 검증 노드만 들어간 sample workflow) 까지만 확인.

---

## 파일 구조

**신규 (backend)**
- `apps/backend/Dockerfile` — multi-stage. base `node:22-slim`. 빌드 단계 `pnpm install --frozen-lockfile && pnpm --filter backend build`. runtime 단계 prod deps + `dist/main.js`.
- `apps/backend/.dockerignore` — `node_modules`, `dist`, `.env*`, `*.log`.

**신규 (CI/CD)**
- `.github/workflows/deploy-backend.yml` — develop/main push → docker build → ECR push → ECS update-service.
- (선택) `.github/workflows/preview-frontend.yml` — Vercel deploy 는 자동이라 generally 불필요. PR comment hook 필요 시 신설.

**신규 (DB)**
- `supabase/migrations/00X_n8n_schema_role.sql` — `CREATE SCHEMA n8n`, `CREATE ROLE n8n_runner`, schema 내 모든 권한 grant.

**신규 (인프라 코드, 선택)**
- `infra/` 디렉토리 — Terraform 또는 AWS CDK 로 ECS / ALB / IAM 정의. 본 phase 는 **AWS Console + IaC 둘 다 선택지로 열어둠** — 결정 11 (아래 추가).

**수정**
- `apps/backend/package.json` — production start 명령 확인 (`node dist/main`). 이미 있다면 무변경.
- `apps/backend/.env.example` — `HMAC_WEBHOOK_SECRET=` 추가 (n8n webhook signature 용. Phase 8 에서 사용하지만 인프라에 secrets 자리 미리 잡음).
- `apps/frontend/.env.local.example` — `NEXT_PUBLIC_API_BASE_URL` 의 default 값을 prod 도메인 (`https://api.<도메인>`) 으로.
- `CLAUDE.md` — 인프라 한 줄 갱신 (Vercel + ECS + n8n schema 명시).
- `docs/plans/2026-04-28-content-pipeline-saas-design.md` — Phase 1b 완료 마킹 + 결정 이력 한 줄.

### 11. IaC vs Console 결정 (필요 시)
- 후보 A: **AWS Console + CLI 수동** — dogfooding 단계엔 빠름. 셋업 1회성. 단 재현성 낮음.
- 후보 B: **Terraform / CDK** — 재현성 / 코드 리뷰 가능. 학습 cost.
- 본 phase 결정: **AWS Console + CLI** 로 1차 셋업, 셋업 끝난 직후 동일 구성을 Terraform 으로 import 해두는 phase-1b-tail 후속 step. 본 plan 의 Task 8 에서 결정.
- 사유 — 첫 셋업 학습 비용 / Terraform 학습 비용 동시에 가는 게 부담. 동작 확인 후 IaC 화.

---

## Tasks

### 1. AWS / 가비아 / Route53 / Vercel 계정 + 도메인 셋업
- AWS 계정 결제 등록 + IAM 사용자 (admin) + access key 생성 (단 OIDC 셋업 후 long-lived key 폐기). 리전 `ap-northeast-2` (Seoul).
- 가비아에서 도메인 1개 구매 (`.com` / `.dev` 등).
- Route53 hosted zone 생성 → 자동 부여된 NS 레코드 4개 복사.
- 가비아 도메인 관리 페이지 → "네임서버 설정" → AWS Route53 NS 4개 입력. propagation 대기 (`dig <도메인> NS` 또는 `whois <도메인>` 으로 확인, 보통 1~3h).
- ACM 에서 `*.<도메인>` wildcard cert 요청 → Route53 DNS 검증 자동 생성 옵션 선택 → 검증 완료 (수~수십 분).
- Vercel 계정 (GitHub 로그인). 본 repo 임포트 후 `apps/frontend` root 인식 확인.
- 검증: Vercel 의 자동 deploy 한 번 트리거 후 production URL (e.g. `content-pipeline.vercel.app`) 접속. login 페이지가 렌더되는지 확인 — 데이터 호출은 backend 미배포라 fail 예상 (정상). `dig api.<도메인> A` 가 아직 비어있음 (Task 4 에서 ALB 레코드 추가 예정).

### 2. Supabase n8n schema / role
- `supabase/migrations/00X_n8n_schema_role.sql` 신규. `CREATE SCHEMA IF NOT EXISTS n8n`, `CREATE ROLE n8n_runner LOGIN PASSWORD '...'`, schema 권한 grant, public schema 접근 차단.
- Supabase Dashboard SQL Editor 또는 MCP `apply_migration` 으로 적용.
- 검증: `psql` 로 `n8n_runner` 접속 후 `\dn` 으로 schema 보임 + public 의 다른 테이블 SELECT 거부.

### 3. ECR repository + 이미지 빌드
- ECR repo 2개: `cp-backend`, `cp-n8n` (n8n 은 공식 이미지 mirror 또는 그냥 docker hub 의 `n8nio/n8n` 직접 참조).
- `apps/backend/Dockerfile` + `.dockerignore` 신규.
- 로컬에서 `docker build -t cp-backend .` 한 번 빌드 성공 확인.
- ECR login + push 한 번 수동.
- 검증: ECR 에 backend image 가 올라가있음. `docker run -e SUPABASE_URL=... -e OPENAI_API_KEY=... -p 3001:3001 cp-backend` 로 로컬 컨테이너 띄워 `/api/health` 200.

### 4. ECS 클러스터 + ALB + VPC + Route53 alias
- VPC 1개 (`/16`), public subnet 2개 (가용영역 2). Internet Gateway. Route table public.
- Security Group: ALB → 0.0.0.0/0:443, ECS task → ALB only.
- ECS cluster `cp-cluster` (Fargate).
- ALB `cp-alb` + listener :443 (**ACM `*.<도메인>` cert attach**) + 호스트 헤더 규칙 (`api.<도메인>` → backend TG, `n8n.<도메인>` → n8n TG. n8n 의 `/webhook/*` path 규칙은 Task 7 에서).
- Route53 에 `api.<도메인>` / `n8n.<도메인>` A record (alias) → ALB.
- 검증: `curl https://api.<도메인>/api/health` 200 (Task 5 의 backend 떴을 때). DNS / cert / ALB 라우팅 일관 확인.

### 5. backend ECS task definition + service
- task def: `cp-backend:1`. fargate 0.25 vCPU / 0.5GB. env 는 SSM Parameter Store 참조 (SUPABASE_*, OPENAI_API_KEY, IMAGE_GEN_MODE, FRONTEND_URL, PORT).
- service `cp-backend-svc`, desired count 1, ALB target group attach, health check `/api/health`.
- 검증: ECS Console 에서 task RUNNING + 헬스 healthy. `curl https://api.<도메인>/api/health` 200.

### 6. n8n ECS task definition + service
- task def: `cp-n8n:1`. fargate 0.25 vCPU / 0.5GB. image = `n8nio/n8n:latest`.
- env: `N8N_HOST=n8n.<도메인>`, `N8N_PROTOCOL=https`, `WEBHOOK_URL=https://n8n.<도메인>/`, `DB_TYPE=postgresdb` + Supabase pooler 정보, `N8N_BASIC_AUTH_ACTIVE=false` (ALB authenticate-cognito 가 게이트 역할 — Task 7).
- 영속 볼륨: n8n 자체는 stateless 가정 (모든 상태 Postgres). EFS / EBS 마운트 없음.
- service `cp-n8n-svc`, desired count 1, ALB target group attach.
- 검증: 본 task 시점엔 Cognito 미설정이라 `n8n.<도메인>` 직접 접근 시 ALB 가 인증 redirect (Task 7 후 정상). 우선 ECS task 가 RUNNING + 헬스 healthy 인지만 확인.

### 7. Cognito + ALB authenticate-cognito (n8n UI 게이트)
- AWS Cognito **User Pool 1개** (`cp-pool`) + **App Client 1개** (`cp-n8n-alb`). 본인 계정 1명 등록 (이메일 + 비밀번호 + email verify). MFA 옵션 본 phase 외.
- App Client 설정 — `Callback URLs` = `https://n8n.<도메인>/oauth2/idpresponse` (ALB 표준 경로), `OAuth flows` = Authorization code grant, scope = `openid email`.
- ALB listener :443 에 listener rule 2개 (priority 순서 중요):
  1. **priority 100**: host `n8n.<도메인>` AND path `/webhook/*` → action: forward to n8n TG (인증 skip, HMAC 검증만)
  2. **priority 200**: host `n8n.<도메인>` (path any) → action: **authenticate-cognito** (User Pool / App Client / scope `openid email` / session timeout 7일) → forward to n8n TG
- Cognito 호스팅 UI = `<pool-domain>.auth.ap-northeast-2.amazoncognito.com` (default). 본인이 로그인하면 ALB 가 세션 쿠키 발급 → 이후 모든 `n8n.<도메인>` 요청 통과.
- 검증: 본인 이메일/비밀번호로 Cognito 로그인 → ALB callback → n8n UI 진입 OK. 비로그인 / 다른 사용자 시도 → Cognito 로그인 페이지로 redirect. `curl https://n8n.<도메인>/webhook/test` 는 인증 없이 200 응답 (HMAC 없으면 워크플로우 첫 노드가 reject 하지만 ALB 까지는 통과).

### 8. GitHub Actions OIDC + ECS deploy 워크플로우
- AWS IAM OIDC provider (`token.actions.githubusercontent.com`) + IAM role `cp-github-deploy` (trust = repo `hec8897/content-pipeline` + branch `main`/`develop`).
- IAM role 권한: ECR push, ECS update-service, ssm get-parameters (deploy 시점 readiness 확인용).
- `.github/workflows/deploy-backend.yml` 신규. trigger = push to `develop` (staging) + `main` (production).
- 단계: checkout → setup-pnpm → docker build → aws-actions/configure-aws-credentials@v4 (OIDC) → ECR login → push → `aws ecs update-service --cluster cp-cluster --service cp-backend-svc --force-new-deployment`.
- 검증: PR 머지 → workflow 통과 → ECS service 의 새 deployment 가 healthy 까지 완료.

### 9. Vercel 도메인 + env 설정
- Vercel project setting → custom domain `app.<도메인>` 추가. Route53 에 Vercel 안내 CNAME 추가 (`cname.vercel-dns.com`).
- Environment variables: `NEXT_PUBLIC_API_BASE_URL=https://api.<도메인>` (Production / Preview / Development 각각).
- Supabase 의 redirect URL 화이트리스트에 `https://app.<도메인>` 추가 (auth callback).
- 검증: `https://app.<도메인>` 접속 → 로그인 → 인터뷰 / 양산 / 카드 편집 / 블로그 편집 / PNG 다운로드 1회 사이클 동작.

### 10. 통합 수동 검증
- 시나리오 A — frontend → backend → Supabase 전체 흐름 1회 완주
- 시나리오 B — 이미지 재생성 `gpt-image-1` 정상 동작 (Vercel ↔ ECS ↔ OpenAI)
- 시나리오 C — n8n UI 진입 (Cognito 로그인 → ALB callback) + sample webhook curl (HMAC 미설정이라 ALB 통과 → 워크플로우 reject 까지 확인)
- 시나리오 D — `aws ecs update-service --desired-count 0` 으로 backend 끄기 → frontend 의 mutation 이 의도된 에러로 떨어짐 → desired-count 1 로 복귀 → 재시도 정상
- 시나리오 E — Phase 2~7 회귀 (모든 핵심 흐름)
- 시나리오 F — 비용 — 24h 운영 후 AWS Cost Explorer / Vercel 합계 확인 ($1~2/일 수준이면 OK)

### 11. 문서 갱신
- `CLAUDE.md` 의 "**배포**" 라인 갱신 — Vercel + ECS + n8n schema + Cognito + Route53 명시.
- design doc §8 Plans 표 Phase 1b 완료 마킹 + §9 결정 이력 한 줄 추가 ("**2026-MM-DD**: Phase 1b 마감. Vercel + ECS Fargate + n8n + AWS Cognito 셋업, dogfooding 클라우드 진입").
- (선택) `docs/runbooks/infra.md` 신규 — 도메인(가비아) / AWS(Route53/ACM/ECS/Cognito) / Vercel 어디서 무엇 관리하는지 한 페이지 cheat-sheet.

---

## 완료 기준

- frontend `https://app.<도메인>` 에서 인터뷰 → 양산 → 카드 편집 → AI 이미지 재생성 → PNG zip 다운로드 1회 사이클 동작
- backend `https://api.<도메인>/api/health` 가 외부에서 200
- n8n `https://n8n.<도메인>` Cognito 로그인 → ALB callback 통과 후 UI 진입 + sample webhook curl 200
- GitHub Actions OIDC deploy workflow 가 develop push 에 자동 트리거 → ECS update-service 까지 끝남
- AWS Console 의 ECS service 2개 모두 ACTIVE / Tasks: 1/1
- Phase 2~7 핵심 흐름 회귀 없음
- `apps/backend/Dockerfile` + `.github/workflows/deploy-backend.yml` + `supabase/migrations/00X_n8n_schema_role.sql` 머지
- design doc + CLAUDE.md 갱신 머지
- 비용 운영 1주일 측정 (월 환산 $30~40 예상치 내)

---

## 잠재 위험 / 미해결

- **Supabase pooler 호환**: n8n 의 default Postgres driver 가 pooler (PgBouncer transaction mode) 와 호환되는지 사전 확인 필요. 안 되면 direct connection 으로.
- **HMAC 시크릿 회전**: webhook signature 검증용 secret 의 회전 정책 (Phase 8 에서 구체화).
- **ALB Idle Timeout**: 양산 호출이 30s~ 걸릴 수 있어 ALB idle timeout (default 60s) 충분한지 확인. 부족하면 120s 로.
- **가비아 → Route53 NS 위임 propagation**: 24~48h 가능. 실제는 보통 1~3h. 가비아 측 캐시 안 풀리면 사전 작업 단계에서 시간 손실.
- **Cognito callback URL 일관**: ALB authenticate-cognito 의 default callback path `/oauth2/idpresponse` 와 Cognito App Client 의 Callback URLs 가 정확히 일치해야 함. 한 글자 mismatch 시 무한 redirect 루프.
- **ACM cert 자동 갱신**: 검증 DNS 레코드 (Route53) 가 hosted zone 안에 남아있어야 자동 갱신. 레코드 실수 삭제 주의.
- **n8n WebSocket**: n8n UI 의 editor 가 WebSocket 사용. ALB :443 은 WebSocket 자동 처리 (Connection: Upgrade), 별도 셋업 불필요. sanity 검증만.
- **dogfooding 비용 통제**: backend / n8n 둘 다 fargate 라 시간 단위 과금. 야간 정지 자동화는 후속 backlog 항목으로.

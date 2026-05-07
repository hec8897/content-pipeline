# content-pipeline

> 주제 한 줄 던지면, AI가 인터뷰로 당신의 경험을 끌어내 한국 채널 콘텐츠로 양산해주는 SaaS

한국 채널(네이버 블로그 / 인스타그램) 특화 콘텐츠 자동화 파이프라인.
사용자가 주제 한 줄을 던지면 AI 멀티턴 인터뷰로 본인 경험을 끌어내고, 인스타 카드뉴스 + 블로그 글 묶음을 양산해 자동 발행한다.

자세한 컨셉 / 아키텍처 / Phase 분배는 [`2026-04-28-content-pipeline-saas-design.md`](./2026-04-28-content-pipeline-saas-design.md) 참고.

---

## 기술 스택

| 영역      | 사용 기술                                                 |
| --------- | --------------------------------------------------------- |
| 모노레포  | pnpm workspaces + Turborepo                               |
| 백엔드    | NestJS 11 (TypeScript)                                    |
| 프론트    | Next.js 16 (App Router) + Tailwind v4                     |
| DB / 인증 | Supabase (Postgres + Auth) — *Phase 1 도입 예정*          |
| 자동화    | n8n self-host (internal) — *Phase 5+ 도입 예정*           |
| AI        | Google Gemini (`@google/generative-ai`, `2.5-flash` 메인) |
| 배포      | ECS Fargate + ECR + Cloudflare — *후속 단계*              |

---

## 디렉토리 구조

```
content-pipeline/
├── apps/
│   ├── backend/         # NestJS API
│   └── frontend/        # Next.js 웹앱
├── packages/            # 공용 타입 / zod 스키마 (필요해지면)
├── 2026-04-28-content-pipeline-saas-design.md   # 컨셉 + 아키텍처 결정 문서
├── CLAUDE.md            # Claude Code 작업 가이드
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 시작하기

### 사전 요구

- Node.js 20+
- pnpm 10+

### 설치

```bash
pnpm install
```

### 개발 서버 실행

```bash
pnpm dev              # frontend + backend 동시
pnpm dev:frontend     # http://localhost:3000 (next dev)
pnpm dev:backend      # http://localhost:3000 (nest start --watch)
```

> ⚠️ frontend / backend 둘 다 기본 포트가 3000. 동시에 띄울 때는 `apps/backend/src/main.ts` 의 `PORT` 환경변수로 백엔드 포트를 분리할 것.

---

## 자주 쓰는 명령어

```bash
pnpm build            # 전체 빌드
pnpm lint             # 전체 lint
pnpm type-check       # 전체 타입 체크
pnpm test             # 전체 테스트
pnpm format           # prettier 전체 포맷

# 특정 패키지만
pnpm build:frontend / pnpm build:backend
pnpm --filter backend test -- <pattern>
pnpm --filter backend test:e2e
```

---

## 진행 상태

- 🟢 **Brainstorming 완료** — 컨셉/아키텍처 핵심 결정 확정
- 🟡 **Phase 0** — 모노레포 + 프론트/백 스켈레톤 구성 (현재)
- ⚪ Phase 1~8 — design doc § 6.5 참고

---

## 문서

- [컨셉 / 아키텍처 / Phase 결정](./2026-04-28-content-pipeline-saas-design.md)
- [Claude Code 작업 가이드](./CLAUDE.md)

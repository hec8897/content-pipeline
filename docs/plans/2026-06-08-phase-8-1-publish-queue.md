# Phase 8-1 — 발행 큐 + 워커 + n8n 라운드트립 (backend)

**목표**: 우리 앱이 **발행 큐의 Source of Truth** 가 되는 도메인 토대를 깐다. draft 를 채널별로 발행 작업(`publish_jobs`)으로 큐잉하고, node-cron 워커가 `pending` job 을 집어 **n8n 으로 HMAC 서명 webhook 트리거**, n8n 이 작업 결과를 **콜백 webhook 으로 우리 DB 에 되먹임**해 job 상태를 `published`/`failed` 로 확정하는 **전체 라운드트립**을 실제 채널 없이 **stub n8n 워크플로우**로 증명한다. 실제 채널 발행(네이버/인스타)은 stub 노드만 교체하면 되도록 어댑터 뒤에 둔다.

**아키텍처 한 줄**:
- 앱이 SoT — 발행은 `publish_jobs` 에 `pending → processing → published/failed` 로 영속. n8n 다운/앱 재시작에도 job 보존 → 워커가 재처리.
- **채널당 1 job**(`draft × channel`) — 채널별 독립 상태·재시도. 부분 성공(네이버 ok / 인스타 fail) 표현 가능.
- **크론 워커 폴링** — `@nestjs/schedule @Interval` 워커가 `pending AND scheduled_at<=now()` 를 집어 트리거. 즉시발행=`scheduled_at=now()`, 예약발행=미래 시각 → 동일 경로. (API 인라인 트리거 아님 → n8n 다운 시에도 큐에 남아 복원.)
- **n8n 은 `PublishTrigger` 인터페이스 뒤** — design doc 의 "벤더 락인 방지, n8n 자리만 교체" 원칙. Phase 9/10 는 stub 워크플로우를 진짜 채널 노드로 바꾸는 것만.
- **HMAC 양방향** — 앱→n8n(`x-cp-signature`) 트리거 서명 + n8n→앱 콜백 서명. 시크릿은 Phase 1b 에서 자리 잡은 SSM `/cp/HMAC_WEBHOOK_SECRET` 재사용.

**Out-of-scope**:
- **실제 채널 발행** — 네이버 메일 트릭(Phase 9), 인스타 Meta Graph API(Phase 10). 8-1 의 n8n 워크플로우는 echo→콜백만 하는 **stub**.
- **프론트엔드 UI** — 발행 버튼 / job 상태 뱃지 / 재시도 버튼은 **Phase 8-2**. 8-1 은 REST API + curl 검증.
- **per-user 자격증명 vault** — 사용자별 OAuth 토큰 암호화 저장은 멀티유저 단계. stub 은 자격증명 불필요, 실채널은 Phase 9/10 에서 본인 credential(SSM)로 시작.
- **분산 락 / n8n Queue Mode** — 프로토타입은 ECS desired=1 단일 인스턴스. 조건부 UPDATE 로 중복 픽업만 방어.
- **HMAC 시크릿 회전 정책** — design doc 미결 항목, 추후.
- **예약 발행 UX**(달력 등) — 8-1 은 `scheduled_at` 필드·워커 처리만. 입력 UI 는 8-2/이후.

---

## 도메인 결정 (lock-in)

### 1. 큐 단위 = 채널당 1 job (`draft × channel`)
- `publish_jobs` 한 row = (draft, channel) 한 쌍. draft 를 네이버+인스타에 발행 = 2 row.
- 사유: ① 채널별 독립 상태머신 → 부분 성공/실패 자연 표현. ② 채널별 재시도(인스타만 다시). ③ Phase 9/10 채널 추가 = enum 값 + n8n 분기 추가, 스키마 불변. ④ draft 당 1 row + channels 배열은 부분 상태가 애매하고 재시도가 어려움.

### 2. 트리거 = 크론 워커 폴링 (SoT + 복원력)
- `@Interval(10_000)` 워커가 `status='pending' AND scheduled_at<=now()` 조회 → 조건부 UPDATE 로 `processing` 선점 → `PublishTrigger.trigger(job)`.
- 사유: ① 앱이 SoT 라는 design doc 원칙 — 트리거 책임을 API 요청에서 분리, n8n 다운/앱 재시작에도 큐가 진실. ② 즉시·예약 발행을 `scheduled_at` 하나로 통일. ③ 재시도를 같은 폴링 루프에 흡수.
- 단일 인스턴스 가정(ECS desired=1) → 분산 락 불필요. 중복 픽업은 `UPDATE ... WHERE id=? AND status='pending'` 의 영향 행 수로 방어.

### 3. 상태머신 + 재시도 = 자동(backoff) + 수동 둘 다
```
pending ──(worker 선점)──> processing ──(콜백 published)──> published
   ▲                            │
   └──(자동 재시도)──────────── failed ◀──(콜백 failed / 타임아웃)
```
- 워커가 `processing` 선점 시 `attempts++`, `triggered_at` 기록.
- **자동 재시도**: 콜백 `failed` 또는 트리거 자체 실패 시 `attempts < max_attempts(기본 3)` 이면 `pending` 으로 되돌리되 `scheduled_at = now() + attempts * BACKOFF(예: 1분)` 로 backoff. `attempts >= max` 면 `failed` 확정.
- **수동 재시도**: `POST /publish-jobs/:id/retry` — `failed` job 의 `attempts=0` 리셋 + `status='pending'` + `scheduled_at=now()`. (Phase 8-2 재시도 버튼이 호출.)
- 사유: 자동은 일시 장애(n8n 순간 다운) 흡수, 수동은 영구 실패 후 사용자 의지 재시도. design doc "retry 로직 + 모니터링" 충족.

### 4. Webhook 계약 = HMAC-SHA256 양방향
- **앱 → n8n (트리거)**: `POST {N8N_WEBHOOK_URL}` (= `https://n8n.dawoon.dev/webhook/publish`).
  - body: `{ jobId, draftId, channel, payload }` — `payload` 는 채널별 발행 데이터(stub 단계는 draft 의 caption/blog 일부 echo, 실제 구성은 Phase 9/10).
  - header: `x-cp-signature: sha256=<HMAC(rawBody, HMAC_WEBHOOK_SECRET)>`. n8n 워크플로우 첫 노드가 검증.
- **n8n → 앱 (콜백)**: `POST /api/webhook/publish-result` (Phase 1b ALB rule 로 public, 단 백엔드가 HMAC 검증).
  - body: `{ jobId, status: 'published'|'failed', externalRef?, error? }`.
  - 같은 `x-cp-signature` 검증 → 실패 시 401, draft/job 변경 없음. 성공 시 job 상태 확정 + `published_at`(성공) / `last_error`(실패).
- **멱등성**: 콜백이 이미 종결된 job(`published`/`failed` with max attempts) 에 오면 no-op(중복 콜백 방어).
- 사유: Phase 1b 가 `/webhook/*` public + HMAC 자리를 이미 깔아둠. 양방향 같은 시크릿(`HMAC_WEBHOOK_SECRET`) 재사용 — 8-1 범위에서 키 분리는 YAGNI.

### 5. n8n stub 워크플로우 = echo → 콜백
- n8n 에 워크플로우 1개: **Webhook 노드**(HMAC 검증) → **Set/Code 노드**(echo, 가짜 성공) → **HTTP Request 노드**(앱 콜백 `status='published'`, 같은 HMAC 서명).
- 실제 채널 노드 없음. Phase 9 = 이 stub 의 Set 노드 자리에 네이버 Email 노드, Phase 10 = 인스타 Graph API HTTP 노드 삽입.
- 워크플로우 자체는 코드 산출물 아님(n8n UI 에서 구성) — spec 은 노드 구성 의도만 기술. ([[feedback_infra_cli_guide_only]] — n8n 설정은 가이드/수동.)

### 6. 어댑터 추상화 = `PublishTrigger` 인터페이스
- `interface PublishTrigger { trigger(job): Promise<void> }` + `N8nPublishTrigger`(HMAC 서명 + fetch POST) 구현. DI 토큰으로 주입.
- 사유: design doc 의 "발행 어댑터 인터페이스 추상화 → n8n 교체 시 도메인 코드 안 건드림". 워커·서비스는 인터페이스에만 의존.

### 7. 저장 = 신규 `publish_jobs` 테이블 (drafts RLS 패턴)
- 채널/상태는 text + CHECK(enum 흉내). owner `user_id` + RLS owner-only(서비스 롤 우회). 워커 폴링용 `(status, scheduled_at)` 인덱스.

---

## 변경 대상 파일

### DB
- **신규 마이그레이션** `supabase/migrations/20260608000001_phase8_publish_jobs.sql`
  ```sql
  create table publish_jobs (
    id            uuid primary key default gen_random_uuid(),
    draft_id      uuid not null references drafts(id) on delete cascade,
    user_id       uuid not null,                       -- RLS owner (drafts 패턴)
    channel       text not null check (channel in ('naver','instagram')),
    status        text not null default 'pending'
                    check (status in ('pending','processing','published','failed')),
    scheduled_at  timestamptz not null default now(),
    attempts      int  not null default 0,
    max_attempts  int  not null default 3,
    last_error    text,
    external_ref  text,                                 -- 발행 결과 식별자 (Phase 9/10)
    triggered_at  timestamptz,
    published_at  timestamptz,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
  );
  create index publish_jobs_poll_idx on publish_jobs (status, scheduled_at);
  create index publish_jobs_draft_idx on publish_jobs (draft_id);
  -- RLS: owner-only select/insert (service-role 우회). drafts 정책 참고.
  ```
  - Dashboard SQL Editor 또는 MCP `apply_migration` 으로 적용. ([[feedback_infra_cli_guide_only]])

### 의존성
- `apps/backend/package.json` — `@nestjs/schedule` 추가(워커 `@Interval`). HTTP 는 global `fetch`(node 22) — axios 미추가.

### 백엔드 (`apps/backend/src/publish/` 신규 모듈)
- `publish.module.ts` — `ScheduleModule.forRoot()` 등록 + providers(service, worker, `PublishTrigger` 토큰→`N8nPublishTrigger`). `app.module.ts` imports 에 추가.
- `publish.schema.ts` — zod: `PublishChannel` enum, `PublishJob` row, 트리거 payload, 콜백 payload(`publish-result`).
- `publish.service.ts`
  - `createJobs(draftId, userId, channels[], scheduledAt?)` — 채널별 row insert(`pending`). 소유 draft 검증.
  - `listJobs(draftId, userId)` — 상태 조회.
  - `claimDueJobs()` — `pending AND scheduled_at<=now()` 선점(조건부 UPDATE → `processing`, `attempts++`, `triggered_at`).
  - `markResult(jobId, status, externalRef?, error?)` — 콜백 처리. 멱등(종결 job no-op). 자동 재시도 분기(`failed && attempts<max` → backoff 재큐).
  - `retry(jobId, userId)` — 수동 재시도(`attempts=0`, `pending`, `scheduled_at=now()`).
- `publish.worker.ts` — `@Interval(10_000)` → `claimDueJobs()` → 각 job `PublishTrigger.trigger(job)`. 트리거 실패는 catch → `markResult(failed)`(자동 재시도 분기 탐).
- `triggers/publish-trigger.ts` — `interface PublishTrigger` + DI 토큰.
- `triggers/n8n-publish.trigger.ts` — HMAC 서명(`crypto`) + `fetch(N8N_WEBHOOK_URL, …)`.
- `publish.controller.ts` — `POST /drafts/:id/publish`(채널 목록 받아 `createJobs`), `GET /drafts/:id/jobs`(`listJobs`), `POST /publish-jobs/:id/retry`(`retry`). `SupabaseAuthGuard` 적용(기존 패턴).
- `webhook.controller.ts` — `POST /api/webhook/publish-result`. **인증 가드 없음**(n8n 콜백) 대신 HMAC raw-body 검증 가드/미들웨어. 검증 통과 시 `markResult`.
- `supabase/database.types.ts` — `publish_jobs` 타입 반영(MCP `generate_typescript_types` 또는 수기).

### 설정 / 인프라 (가이드만, 직접 실행 X — [[feedback_infra_cli_guide_only]])
- `apps/backend/.env.example` — `N8N_WEBHOOK_URL=` 추가(`HMAC_WEBHOOK_SECRET` 은 Phase 1b 에서 이미 자리). 로컬은 `.env` 에 실제값.
- SSM `/cp/N8N_WEBHOOK_URL` 추가 + ECS task def `secrets`/`environment` 에 주입(가이드).
- n8n stub 워크플로우 구성(가이드) — Webhook(HMAC 검증) → Set(echo) → HTTP(콜백).

---

## 검증

[[feedback_no_tests_in_prototype]] — jest spec 안 씀. 검증은 type-check + 수동 시나리오(curl).

- `pnpm --filter backend type-check` / `pnpm lint` 통과.
- 마이그레이션 적용 후 `publish_jobs` 테이블·RLS 확인.
- 수동 시나리오:
  1. **즉시 발행 라운드트립**: `POST /drafts/:id/publish {channels:['naver']}` → DB job `pending` → ≤10초 워커 트리거 → `processing` → n8n stub 콜백 → `published`. `GET /drafts/:id/jobs` 로 전이 확인.
  2. **채널당 1 job**: `channels:['naver','instagram']` → 2 row 독립 생성·전이.
  3. **HMAC 방어**: 변조 서명으로 콜백 `POST /api/webhook/publish-result` → 401, job 불변. 변조 트리거 서명 → n8n stub 첫 노드 reject(job 은 워커 자동 재시도 후 max 도달 시 `failed`).
  4. **예약 발행**: `scheduledAt` 미래 → 그 전엔 워커 skip, 시각 도달 후 트리거.
  5. **자동 재시도**: n8n 다운(또는 콜백 `failed`) → `attempts` 증가 + backoff 재큐 → max_attempts 도달 시 `failed` 확정.
  6. **수동 재시도**: `failed` job `POST /publish-jobs/:id/retry` → `pending` 재진입 → 라운드트립 재실행.
  7. **멱등 콜백**: 종결 job 에 중복 콜백 → no-op(상태 불변).

---

## 분기 / 리스크

- **워커 중복 픽업**: 단일 인스턴스라 거의 없지만, 조건부 UPDATE(`WHERE status='pending'`) 영향 행 0 이면 skip 으로 방어. 멀티 인스턴스 전환 시 `FOR UPDATE SKIP LOCKED` 또는 Queue Mode 재검토(현 범위 밖).
- **콜백 유실**: n8n 이 콜백 못 보내면 job 이 `processing` 에 영구 정체. 8-1 범위에선 타임아웃 스윕(예: `processing` 이 N분 초과면 `failed`/재큐)을 워커에 둘지 — 구현 단계에서 확정(YAGNI 후보지만 stub 검증엔 유용).
- **HMAC raw body**: NestJS 가 JSON 파싱 전 raw body 를 HMAC 에 써야 함 → `webhook` 라우트만 raw body 보존 설정 필요(global JSON 파서와 충돌 주의). 구현 시 `rawBody` 옵션/미들웨어로 처리.
- **시크릿 단일 공유**: 트리거·콜백이 같은 `HMAC_WEBHOOK_SECRET`. 유출 시 양방향 위조 가능 — 키 분리/회전은 추후. 단일 사용자 프로토타입 수용.
- **stub→실채널 전환 격차**: stub 은 항상 성공 echo → 실제 채널의 실패 모드(인스타 rate limit, 네이버 메일 지연)는 Phase 9/10 에서 드러남. 상태머신·재시도는 미리 그 형태로 설계해 충격 흡수.
- **마이그레이션 순서**: 코드(select `publish_jobs`)가 마이그레이션보다 먼저면 에러. 로컬은 마이그레이션 먼저 적용.
- **Phase 8-2 인터페이스**: 8-1 의 `GET /drafts/:id/jobs` 응답 shape 가 8-2 상태 뱃지의 계약. job 필드(status/attempts/last_error) 를 8-2 가 쓸 수 있게 노출.

---

## 구현 청크 (큰 단위 = 커밋 경계)

> 각 청크는 **독립적으로 검증 가능한 단위**. 코드 본체는 실행 단계에서([[feedback_plan_no_code]]), 검증은 type-check + curl 수동 시나리오([[feedback_no_tests_in_prototype]]). 청크 끝마다 커밋(승인 후, [[feedback_commit_requires_approval]]).
>
> 의존 순서: C1(스키마) → C2(큐 서비스/API) → C3(워커+트리거) → C4(콜백) → C5(n8n stub+라운드트립). C2 까지는 워커/n8n 없이 **수동으로 상태 전이를 흉내**내 검증 가능 → 점진적.

### ☐ C1 — DB 스키마 + 모듈 스캐폴드
**무엇**: 장부 테이블과 빈 모듈 골격. 아직 로직 없음.
- Create: `supabase/migrations/20260608000001_phase8_publish_jobs.sql` (spec §변경대상 DB 블록 그대로 — 테이블 + 인덱스 2개 + RLS owner-only).
- Create: `apps/backend/src/publish/publish.module.ts` (`ScheduleModule.forRoot()` 등록, providers 비움), `publish.schema.ts` (zod: `PublishChannel` enum `'naver'|'instagram'`, `PublishStatus`, `PublishJob` row, 트리거 payload, 콜백 payload).
- Modify: `apps/backend/src/app/app.module.ts` (imports 에 `PublishModule` 한 줄).
- Modify: `apps/backend/package.json` (`@nestjs/schedule` 추가) → `pnpm install`.
- Modify: `apps/backend/src/supabase/database.types.ts` (`publish_jobs` Row/Insert/Update).

**검증**:
- `pnpm --filter backend type-check` 통과.
- 마이그레이션 적용(가이드 → 수동, [[feedback_infra_cli_guide_only]]) 후 MCP `list_tables`/`execute_sql` 로 `publish_jobs` 컬럼·인덱스·RLS 존재 확인.
- 앱 부팅(`pnpm dev:backend`) 시 모듈 로드 에러 없음.

**커밋**: `feat(publish): publish_jobs 스키마 + 모듈 스캐폴드 (Phase 8-1 C1)`

### ☐ C2 — 큐 서비스 + REST API (워커/n8n 없이)
**무엇**: 장부 CRUD + 상태 전이 로직 + API 3개. n8n 없이 **수동으로** 라이프사이클 검증.
- Create: `apps/backend/src/publish/publish.service.ts`
  - `createJobs(draftId, userId, channels[], scheduledAt?)` — 소유 draft 검증 후 채널별 `pending` insert.
  - `listJobs(draftId, userId)` — 소유 검증 + 상태 조회.
  - `claimDueJobs()` — `pending AND scheduled_at<=now()` 조건부 UPDATE → `processing`(`attempts++`, `triggered_at`). 선점된 row 반환. (C3 워커가 호출, C2 에선 함수만.)
  - `markResult(jobId, status, externalRef?, error?)` — 멱등(종결 job no-op) + 자동 재시도 분기(`failed && attempts<max` → backoff 재큐). (C4 콜백/C3 트리거 실패가 호출.)
  - `retry(jobId, userId)` — `failed` 만, `attempts=0`+`pending`+`scheduled_at=now()`.
- Create: `apps/backend/src/publish/publish.controller.ts` — `POST /drafts/:id/publish` / `GET /drafts/:id/jobs` / `POST /publish-jobs/:id/retry`. `SupabaseAuthGuard` 적용(기존 drafts 패턴).

**검증** (curl, 로컬):
- `POST /drafts/:id/publish {channels:['naver','instagram']}` → `GET /drafts/:id/jobs` 에 `pending` 2 row.
- `execute_sql` 로 한 job 을 수동 `processing`→`published` 흉내 → `listJobs` 반영.
- `retry` 호출 시 `failed`→`pending` 전이(없으면 4xx). 다른 사용자 draft 접근 403.

**커밋**: `feat(publish): 큐 서비스 + 발행/조회/재시도 API (Phase 8-1 C2)`

### ☐ C3 — 워커 + n8n 트리거 (어댑터)
**무엇**: 장부 보고 n8n 쏘는 일꾼 + 어댑터 추상화 + HMAC 서명.
- Create: `apps/backend/src/publish/triggers/publish-trigger.ts` — `interface PublishTrigger { trigger(job): Promise<void> }` + DI 토큰.
- Create: `apps/backend/src/publish/triggers/n8n-publish.trigger.ts` — `crypto` HMAC-SHA256 서명(`x-cp-signature`) + `fetch(N8N_WEBHOOK_URL, …)`.
- Create: `apps/backend/src/publish/publish.worker.ts` — `@Interval(10_000)` → `claimDueJobs()` → 각 job `PublishTrigger.trigger`. 트리거 throw 시 catch → `markResult(jobId,'failed',…)`.
- Modify: `publish.module.ts` providers 에 worker + `{ provide: PublishTrigger, useClass: N8nPublishTrigger }`.
- Modify: `apps/backend/.env.example` (`N8N_WEBHOOK_URL=`) + 로컬 `.env`.

**검증**:
- `type-check` 통과.
- N8N_WEBHOOK_URL 을 로컬 더미(예: `webhook.site`)로 설정 → `POST publish` → ≤10초 후 더미가 **HMAC 헤더 포함 요청 수신** 확인 + job `processing` 전이.
- 더미가 5xx/무응답 → 워커 catch → `failed` + `attempts` 증가 확인(자동 재시도 backoff).

**커밋**: `feat(publish): 크론 워커 + n8n HMAC 트리거 어댑터 (Phase 8-1 C3)`

### ☐ C4 — 콜백 webhook + HMAC 검증
**무엇**: n8n 이 "보냈음" 알려주면 장부에 도장. 위조 차단.
- Create: `apps/backend/src/publish/webhook.controller.ts` — `POST /api/webhook/publish-result`. **인증 가드 없음**(n8n 콜백), 대신 HMAC raw-body 검증.
- Modify: backend bootstrap(`main.ts`) 또는 모듈 — `webhook` 라우트만 **raw body 보존**(global JSON 파서 전에 원본 확보; `rawBody:true` 옵션 또는 전용 미들웨어). 검증 통과 시 `markResult(payload)`.

**검증**:
- 올바른 서명 콜백 `{jobId, status:'published'}` → job `published` + `published_at`.
- **변조 서명/바디** → `401`, job 불변.
- 종결 job 에 중복 콜백 → no-op(멱등).

**커밋**: `feat(publish): 발행 결과 콜백 webhook + HMAC 검증 (Phase 8-1 C4)`

### ☐ C5 — n8n stub 워크플로우 + 전체 라운드트립 (가이드 → 수동)
**무엇**: 빈 박스 배송 테스트. 코드 0줄, n8n UI 구성 + SSM + 통합 검증. ([[feedback_infra_cli_guide_only]] — 가이드 제공, dawoon 직접 실행. read-only/curl 은 같이.)
- 가이드: n8n UI 에 워크플로우 1개 — Webhook(`/webhook/publish`, HMAC 검증 노드) → Set/Code(echo) → HTTP Request(앱 콜백 `published`, 같은 HMAC 서명).
- 가이드: SSM `/cp/N8N_WEBHOOK_URL` 추가 + ECS task def 주입(클라우드 검증 시).

**검증** (전체 라운드트립, spec §검증 시나리오):
1. 즉시 발행 → `pending`→(워커)→`processing`→(n8n stub 콜백)→`published`.
2. 채널당 1 job 독립 전이.
3. HMAC 변조 401/reject.
4. 예약 발행(`scheduledAt` 미래) 시각 도달 후 트리거.
5. 자동 재시도(n8n 다운) → backoff → max 도달 `failed`.
6. 수동 재시도 → 재진입.

**커밋**: `docs(publish): n8n stub 워크플로우 구성 가이드 + 라운드트립 검증 (Phase 8-1 C5)` (+ 마감 시 design doc §8 Phase 8-1 완료 마킹).

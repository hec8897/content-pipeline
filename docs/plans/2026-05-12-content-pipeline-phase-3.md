# Phase 3 — AI 양산

**목표**: Phase 2 인터뷰 도메인 위에 양산(generation) 도메인을 얹는다. 완료된(또는 스킵된) 인터뷰 세션을 입력으로 Gemini 가 (a) 인스타 카드뉴스 8장 JSON + (b) 네이버 블로그 마크다운 1편을 한 번에 만들어 `drafts` 1행에 저장한다. `/new/generate` 의 mock 애니메이션을 실 호출 + 진행 표시로 교체하고, `/new/edit` 가 mock(`CARD_NEWS`, `NAVER_BLOG_BODY`) 대신 draft API 를 읽어 렌더한다. 발행/n8n/카드 이미지 업로드는 본 plan 스코프 외.

**아키텍처 한 줄**: 도메인 테이블 1개(`drafts`, 1 topic : 1 draft) → NestJS `DraftsModule` 이 카드뉴스 / 블로그 두 prompt 로 Gemini 를 호출(카드는 `responseMimeType=application/json` 강제, 블로그는 plain markdown) → frontend `/new/{generate, edit}` 가 TanStack Query mutation/query 로 동기화.

**스택**: Phase 2 와 동일 (NestJS 11 + Next.js 16 + `@google/generative-ai` + Supabase Postgres). 새 SDK·서버 추가 없음. zod 만 backend dep 으로 추가(카드뉴스 JSON 런타임 검증용).

**Out-of-scope**:
- **카드 HTML → Image 렌더링 + Supabase Storage 업로드** — Phase 7(인스타) 로 이관. 본 phase 는 카드 데이터(JSON, 색/텍스트) 만 저장. `/new/edit` 의 `CardNewsEditor` 는 JSON 으로 렌더 가능 → 이미지 자산은 발행 시점에만 필요.
- 발행 큐 / 스케줄러 / n8n webhook (Phase 5).
- 네이버·인스타 채널 어댑터 (Phase 6/7).
- 임베딩 / 유사 콘텐츠 추천 (보류, 7.5 결정 사항).
- 양산 비동기 큐화 — 본 phase 는 **sync POST + 프론트 polling 없이 await** (로컬/dogfooding 사이클 단순화). 30~60s 지연은 frontend 측 진행 표시로 가린다.

---

## 사전 작업

- `apps/backend/.env` 의 `GEMINI_API_KEY` 그대로 사용 (Phase 2 에서 발급).
- 호스티드 Supabase 의 `interview_sessions.status` 값으로 `completed | skipped` 둘 다 양산 진입 가능해야 함 — Phase 2 마이그레이션 그대로 호환.

---

## 도메인 결정 (lock-in)

### 카드 이미지 렌더는 Phase 7 로 미룬다

- `/new/edit` 는 JSON 으로 렌더하면 충분(`CardNewsCard` 타입 그대로). 이미지는 Graph API 가 공개 URL 을 요구할 때 필요 → 발행 시점 책임.
- 양산을 가볍게 유지하고(텍스트만), 사용자가 편집 후 발행 단계에서 최종 이미지 렌더링 → 편집 변경분이 자동 반영되는 자연스러운 흐름.
- 다만 카드 데이터 스키마는 인스타용 디자인 의도(단색 배경, 큰 타이포, 표지/본문/아웃트로 3종)를 그대로 담아 둠 — Phase 7 에서 그대로 렌더링 가능.

### `drafts` 테이블 — 1 topic : 1 draft (regenerate replaces)

- `id` uuid pk
- `topic_id` uuid FK → `topics.id`, **unique** (한 주제당 draft 1행)
- `user_id` uuid FK → `auth.users.id`
- `status` text check `(pending | generating | ready | failed)` — 본 phase 는 sync 라 사실상 `ready / failed` 만 유효하지만 Phase 5 비동기화 대비 필드는 두기
- `card_news` jsonb null — `CardNewsCard[]` 모양 (cover 1 + body 6 + outro 1 = 8장)
- `blog_title` text null
- `blog_body` text null (마크다운)
- `error_reason` text null — 실패 시 사람이 읽을 사유
- `model_used` text null — 폴백 체인 어느 모델이 응답했는지 (디버깅용)
- `generated_at` timestamptz null
- `created_at`, `updated_at` timestamptz default `now()`

RLS 켜고 `auth.uid() = user_id` policy. 백엔드는 Phase 2 와 동일하게 admin(service-role) + controller 단 ownership 직접 확인.

**Regenerate 정책**: 동일 topic 에 다시 generate 호출하면 row update(in-place). 이전 결과는 보존 안 함(스코프 작게 유지, dogfooding 사이클은 직전 결과만 있으면 충분).

### 입력(transcript) 결정

- 양산 입력 = 해당 topic 의 **최신 completed 또는 skipped session 의 메시지 리스트** + topic.title.
- session 상태 = `active` 면 BadRequest("아직 인터뷰 진행 중") — 인터뷰 종료 전 양산 차단.
- skipped 세션(메시지 0개)도 입력 허용 → topic.title 만으로 양산 (인터뷰 스킵 사용자 시나리오 보장).

### 카드뉴스 JSON 스키마(lock-in, 8장 고정)

```
[
  { type: 'cover', title, subtitle, tag, bg, fg },
  { type: 'body', num: '01'..'06', title, body, bg, fg } x 6,
  { type: 'outro', title, body, cta, bg, fg },
]
```

- 색상 팔레트는 prompt 에 화이트리스트로 제공 (디자인 컨트롤). LLM 이 임의 hex 못 만들게.
- 본 phase 는 8장 고정. 가변 길이는 Phase 3+ 고도화 시 재평가.

---

## API 표면

모두 `SupabaseAuthGuard` 보호.

| Method | Path | 의미 |
|---|---|---|
| POST | `/api/topics/:id/draft/generate` | 최신 completed/skipped session 기준 양산 실행. 기존 draft 가 있으면 in-place update. 응답 = draft row (sync). |
| GET | `/api/topics/:id/draft` | draft + topic + session(state 확인용) 반환. 없으면 404. |
| PATCH | `/api/drafts/:id` | 편집(카드 텍스트/배경, 블로그 title/body). status `ready` 일 때만 허용. |

> /new/edit 의 카드 색·텍스트·블로그 본문 편집이 모두 PATCH 한 군데로 모임 → 프론트의 편집 UX 변동에도 backend 표면 추가 없이 끝남.

`POST .../generate` 응답 형태: 성공이면 `{ draft, model_used }`, 실패는 NestJS 표준 예외(`ServiceUnavailableException` 등) — frontend 가 캐치해서 사용자 메시지 표시.

---

## 양산 흐름 (DraftsService 책임)

```
generate(topicId, userId)
  ├─ topic ownership 확인
  ├─ latest session 로딩 → status 가 active 면 BadRequest
  ├─ messages 로딩 (skipped 면 빈 배열)
  ├─ DB: draft upsert → status='generating', 이전 컬럼들 null 로 리셋
  ├─ Gemini 호출 1: 카드뉴스 (responseMimeType=application/json, schema 강제)
  │     → zod 로 8장 + 타입(cover/body/outro) 검증
  ├─ Gemini 호출 2: 블로그 (plain text markdown, 제목/본문 구분은 첫 줄 = # 헤딩 규칙)
  ├─ DB: draft update → card_news + blog_title + blog_body + status='ready' + generated_at + model_used
  └─ return draft
```

분기:
- 카드 JSON 파싱 실패 → 폴백 체인 다음 모델로 재시도 (GeminiService 내부 자동) → 모든 모델 실패 시 draft.status='failed' + error_reason 저장 + 503 throw.
- 두 LLM 호출은 **순차** (병렬 X) — 토큰/속도 문제보다 한쪽 실패 시 다른 쪽 결과를 굳이 살릴 이유 없음, 트랜잭션 단순화.
- 두 호출 중 어느 한 쪽이라도 실패 → draft.status='failed' 로 마킹하고 throw. 둘 다 성공해야 'ready'.

`patch(draftId, userId, payload)`:
- ownership 확인 + status='ready' 강제.
- payload = `{ card_news?, blog_title?, blog_body? }`. zod 로 카드 배열 모양 보존(8장 유지, 각 카드의 `type` 일관성). 부분 카드만 보낼 수 있게(편집 UX 가 카드 단위 저장 선호하면) 카드 1장 단위 PATCH 도 가능하게 — **본 phase 는 전체 payload 교체로 단순화**, 부분 편집은 frontend 가 클라이언트 측 머지 후 한 번에 PATCH.

---

## Prompt 결정 (drafts.prompts.ts 책임)

- 시스템 프롬프트 톤: Phase 2 인터뷰 페르소나와 일관(평어, 한국어 일상체, 광고 톤 금지). 단 본 phase 는 user 대화가 아니라 "콘텐츠 작가" 페르소나.
- 카드뉴스 prompt:
  - 입력: topic.title, transcript(Q/A 쌍 텍스트화 — skipped 면 "사용자가 인터뷰를 스킵했어요. topic.title 만 보고 일반론적 경험 한 편 구성").
  - 출력 강제: JSON only, 8장 고정, 위 스키마. 배경/전경 색은 화이트리스트(`#1a1a2e/white`, `#0a3d2c/white`, `#5b5bd6/white`, `#c87f0a/white`, `#222/white`, `#f6f5f1/#222`, `#fef3c7/#3a2e0c` 7쌍) 안에서만 선택. cover 1, body 6 (num='01'..'06'), outro 1 순서 유지.
- 블로그 prompt:
  - 입력 동일.
  - 출력: 마크다운 plain text. 첫 줄 = `# 제목`. 본문 1200~1800자, `##` 소제목 2~4개, 마지막 줄에 `#태그1 #태그2 #태그3` 형태 한 줄(네이버 검색 노출 의도).
- 파서:
  - 카드: `JSON.parse` → zod schema. 실패 시 throw → GeminiService 폴백 트리거.
  - 블로그: 첫 줄 `# ` 매칭 → title 추출, 나머지 = body. 첫 줄이 `#` 아니면 title = topic.title 폴백.

---

## 파일 구조

**신규 (backend)**

- `supabase/migrations/20260512000001_phase3_drafts.sql`
- `apps/backend/src/drafts/drafts.module.ts`
- `apps/backend/src/drafts/drafts.controller.ts` — POST `/topics/:id/draft/generate`, GET `/topics/:id/draft`, PATCH `/drafts/:id` (라우트 prefix 는 통상 `api/` — main.ts global prefix 확인)
- `apps/backend/src/drafts/drafts.service.ts`
- `apps/backend/src/drafts/drafts.prompts.ts`
- `apps/backend/src/drafts/drafts.schema.ts` — zod 스키마 (`cardNewsSchema`, `patchDraftSchema`)
- `apps/backend/src/drafts/dto/patch-draft.dto.ts`

**수정 (backend)**

- `apps/backend/src/app/app.module.ts` — `DraftsModule` 등록
- `apps/backend/src/gemini/gemini.service.ts` — `generateText` 의 `GenerateContentRequest` 에 `generationConfig.responseMimeType` 전달 가능한지 점검, 필요 시 옵션 추가(현재 시그니처 `generateText(request)` 인자가 `GenerateContentRequest` 라 호출 측에서 `generationConfig` 만 넣으면 끝일 가능성 높음 — 구현 시 확인). 폴백 루프 안에서 JSON 파싱 실패 시 throw → 다음 모델 시도 흐름은 호출 측 책임으로 둘지(GeminiService 가 raw 만 반환) plan 단계에선 호출 측이 try/catch 로 GeminiService 재호출 방식 채택 — GeminiService 시그니처 변경 최소화.
- `apps/backend/src/supabase/database.types.ts` — `drafts` 테이블 추가 후 재생성
- `apps/backend/package.json` — `zod` 추가
- `apps/backend/.env.example` — 변경 없음 (Phase 2 와 동일)

**신규 (frontend)**

- `apps/frontend/src/lib/api/drafts.ts` — `generate / detail / patch` (TanStack Query mutation/query factory)
- `apps/frontend/src/features/new-content/hooks/use-draft.ts` — query/mutation 훅 한 줄 래퍼 (선택, 안 만들고 페이지에서 직접 써도 무방)
- `apps/frontend/src/features/new-content/components/GenerateProgress.tsx` — 진행 표시 UI (기존 `/new/generate/page.tsx` 의 마크업을 컴포넌트로 분리)

**수정 (frontend)**

- `apps/frontend/src/lib/api/types.ts` — `Draft / CardNewsCardDraft / DraftStatus` 타입 추가 (백엔드 `database.types.ts` 와 모양 맞춤, 단 frontend 는 stripped 버전으로 손수 작성 — Phase 2 에서 잡은 패턴 그대로)
- `apps/frontend/src/lib/api/queryKeys.ts` — `draft(topicId)` key 추가
- `apps/frontend/src/app/new/generate/page.tsx` — mock setTimeout 폐기. mount 시 `generateDraft.mutate(topicId)` 1회 호출. mutation pending 동안 4 step 진행 표시 + 로그 라인은 단계별 lifecycle (`onMutate` → '인터뷰 분석 중', mutation resolves → '완료'). 성공 시 `router.push(routes.newEdit)`. 실패 시 인라인 에러 + 재시도 버튼.
- `apps/frontend/src/app/new/edit/page.tsx` — `CARD_NEWS / NAVER_BLOG_TITLE / NAVER_BLOG_BODY` mock import 제거. `useNewContent()` 의 `topicId` 로 `useDraftQuery(topicId)` 로딩 → loading/empty/ready/failed 분기. ready 면 카드 탭 = `CardNewsEditor initial={draft.card_news}` (Phase 1 CardNewsEditor 가 받아주는 모양 그대로), 블로그 탭 = 새 `BlogEditor` (또는 임시 textarea 두 개 — title/body). PATCH 는 debounce 후 mutation.
- `apps/frontend/src/features/detail/components/CardNewsEditor.tsx` — 외부에서 카드 변경을 PATCH 로 끌어올릴 수 있게 `onChange?: (cards: CardNewsCard[]) => void` prop 추가 (현재는 내부 state 만 들고 있는 것으로 보임 — 구현 시 확인 후 최소 변경). 기존 CARD_NEWS mock 소비처(`/blog`, `/detail` 등)에 영향 가지 않도록 default behavior 유지.
- `apps/frontend/src/features/new-content/components/BlogEditor.tsx` — 신규. title input + body textarea. 마크다운 프리뷰는 본 phase 스코프 외(plain textarea).
- `apps/frontend/src/lib/routes.ts` — 변경 없음 (newEdit 는 Phase 1 부터 존재).

---

## Tasks

### 1. drafts 테이블 마이그레이션
- 위 컬럼 정의대로 `drafts` 생성. `topic_id` unique, `user_id` FK to `auth.users`. `status` check. RLS on + `auth.uid() = user_id` policy(select/insert/update/delete 4종).
- `updated_at` 자동 갱신 트리거 (Phase 2 와 동일 패턴 — 마이그레이션 파일에서 trigger function 재사용 가능한지 확인, 없으면 인라인).
- Dashboard SQL Editor 또는 MCP `apply_migration` 적용.
- 검증: Table Editor 에서 `drafts` + RLS 활성화 + policy 4종 확인.

### 2. database.types.ts 재생성
- MCP `generate_typescript_types` 또는 supabase CLI.
- 검증: `pnpm --filter backend type-check` 통과.

### 3. backend zod dep 추가
- `pnpm --filter backend add zod`.
- 검증: install 성공 + lockfile diff 만 변경.

### 4. drafts.schema.ts — 카드/패치 zod 스키마
- `cardNewsSchema`: 길이 정확히 8, 인덱스 0 = cover, 1..6 = body(num 01..06), 7 = outro. 각 카드의 fg/bg 는 화이트리스트 enum.
- `patchDraftSchema`: `card_news?`, `blog_title?`, `blog_body?`. 카드가 들어오면 `cardNewsSchema` 재사용.
- 검증: type-check.

### 5. drafts.prompts.ts (순수 함수)
- 위 "Prompt 결정" 섹션이 사양.
- 빌더 2개: `buildCardNewsPrompt(topic, transcript)`, `buildBlogPrompt(topic, transcript)`.
- 파서 1개: `parseBlogMarkdown(raw)` → `{ title, body }`.
- 카드 JSON 파싱은 호출 측에서 zod 로 직접. 헬퍼 별도 X.
- transcript serializer: messages 배열 → "Q: ...\nA: ...\n\n" 평면화. role=user/assistant pair 가 깨진 turn 은 건너뜀(방어 코드).
- 검증: type-check.

### 6. DraftsService — 양산 흐름
- 위 "양산 흐름" 섹션이 사양. public 메서드: `generate / getForTopic / patch`. private: `loadOwnedTopic / loadOwnedDraft / loadLatestNonActiveSession / loadMessages / upsertGenerating / markReady / markFailed`.
- ownership 확인은 Phase 2 `InterviewService` 의 `loadOwnedTopic` 패턴 1:1 재활용 (`NotFound` vs `Forbidden` 분리).
- generate 안에서 try/catch 로 두 LLM 호출 묶고, 실패 시 markFailed → throw `ServiceUnavailableException`(원본 메시지 노출 X, 사용자용 한국어 메시지로 변환 + logger.error 에 원본).
- 검증: type-check. 분기별 동작은 Task 12 시나리오에서.

### 7. DraftsController
- POST `/topics/:id/draft/generate`, GET `/topics/:id/draft`, PATCH `/drafts/:id`. 모두 `SupabaseAuthGuard`. user 추출은 Phase 2 컨트롤러 패턴 그대로.
- PATCH 는 `PatchDraftDto` 로 받되 service 가 zod schema 로 추가 검증(class-validator + zod 이중 — class-validator 는 표면 거름망, zod 는 카드 배열 deep 검증).
- AppModule 에 `DraftsModule` 등록.
- 검증 (수동): Phase 2 로 만든 completed session 의 topic.id 에 대해 access_token 으로 `curl -X POST /api/topics/:id/draft/generate` → 200 + draft row 응답. GET 으로 동일 row 확인.

### 8. Frontend API 클라이언트 — drafts
- `lib/api/drafts.ts` — `generateDraft(supabase, topicId)`, `getDraft(supabase, topicId)`, `patchDraft(supabase, draftId, payload)`. Phase 2 의 `topics.ts` 시그니처 패턴 그대로.
- `lib/api/types.ts` 에 `Draft`, `DraftStatus`, `CardNewsCardDraft` 추가 (카드 타입은 기존 `@/types` 의 `CardNewsCard` 와 동일 모양 → re-export 또는 별칭).
- `lib/api/queryKeys.ts` 에 `draft: (topicId: string) => ['draft', topicId]` 추가.
- 검증: `pnpm --filter frontend type-check`.

### 9. /new/generate — mock 폐기, 실 호출 + 진행 UI
- 진입 가드: `topicId` + (session.status in `completed/skipped`) 아니면 `/new` replace. (Phase 2 가 이미 session 을 context 에 담아두므로 거기서 확인.)
- mount 1회 `useMutation(generateDraft)` 트리거. `useEffect` + `useRef` 가드로 React strict mode 중복 fire 막기.
- 진행 표시: 기존 4 STEP UI 재활용하되 setTimeout 대신 mutation lifecycle 에 연결 — pending 동안은 `STEPS[0..3]` 를 일정 간격(예: 8s 마다) 진행시키는 fake progress(단순 setInterval), mutation resolve 시 `STEPS[3]` 도달 보장 후 navigate.
- 성공 → `router.push(routes.newEdit)`. 실패 → 인라인 에러 + "다시 시도" 버튼 (mutation.reset() + mutate 재호출).
- mock 의 `LOG_LINES` 는 그대로 사용해도 되지만 마지막 줄은 실제 latency 와 무관하게 mutation 성공 후 표시.
- 검증: type-check, 화면 동작은 Task 12 에서.

### 10. /new/edit — mock 폐기, draft 로딩 + PATCH
- `useDraftQuery(topicId)` (TanStack Query) 로 draft 로딩. loading 상태: 카드/블로그 자리에 skeleton.
- empty (draft 없음 — 직접 URL 진입 케이스): `/new/generate` 로 redirect or "양산 먼저" 안내. dogfooding 단순화 위해 redirect 선택.
- status='failed': 에러 카드 + "다시 양산" 버튼(=`/new/generate` 이동).
- status='ready': 카드 탭 = `CardNewsEditor` 에 `draft.card_news` 주입 + onChange → 로컬 state. 블로그 탭 = `BlogEditor` (title input + body textarea, plain).
- 저장: 카드/블로그 모두 dirty 시 "변경 사항 저장" 버튼 노출 → `patchDraft.mutate({ card_news?, blog_title?, blog_body? })`. mutation 성공 시 query invalidate.
- "다음 — 발행" 링크는 그대로 유지 (Phase 5 가 받음).
- mock import (`CARD_NEWS / NAVER_BLOG_BODY / NAVER_BLOG_TITLE`) 제거.
- 검증: type-check.

### 11. CardNewsEditor onChange prop
- 현재 `CardNewsEditor` 의 인터페이스 확인 후 (`initial` 만 받고 내부 state) → `onChange?: (cards: CardNewsCard[]) => void` 추가. 내부 setter 호출 시 prop 도 함께 fire. 기존 호출처(`/(blog)` 류) 는 prop 미지정으로 영향 없음.
- 검증: type-check + 기존 라우트 (`/library`, `/(blog)/...` 등) 한 번 둘러봐서 카드 편집기 의도가 깨지지 않았는지.

### 12. 통합 검증 (수동, `pnpm dev`)
- 시나리오 A — 인터뷰 풀 코스 → 양산 → 편집:
  1. Phase 2 시나리오 A 그대로 완주 (`/new` → 인터뷰 3+ 답변 → completed).
  2. `/new/review` 에서 "양산하기" → `/new/generate` 진입 → 진행 UI 약 30~60s → `/new/edit` 자동 이동.
  3. `/new/edit` 의 카드 탭 = 8장(cover 1 + body 6 + outro 1) 렌더 + 한국어 콘텐츠 출력 확인.
  4. 블로그 탭 = title + 마크다운 본문 + 마지막 `#태그` 줄 확인.
  5. 카드 1장의 텍스트 편집 → "저장" → reload 후에도 유지 (PATCH 성공).
  6. Supabase Dashboard `drafts` 테이블에 `status='ready'`, `model_used`, `generated_at` 채워진 행 1개.
- 시나리오 B — 스킵 사용자: Phase 2 시나리오 C 그대로 완주 (`/new` → 스킵 → `/new/generate`). messages 가 비어 있어도 양산이 topic.title 만으로 진행되는지 확인.
- 시나리오 C — 재양산: A 완료 후 한번 더 `/new/generate` 진입(예: URL 직접) → 새 카드/블로그로 덮어쓰기(in-place update). 이전 편집은 사라짐 — 의도 동작.
- 시나리오 D — Gemini 실패 시뮬레이션(선택): `GEMINI_API_KEY` 를 임시로 잘못된 값으로 두고 양산 → `/new/generate` 에 에러 카드 + "다시 시도", DB `status='failed' + error_reason` 확인. 검증 후 키 원복.
- 시나리오 E — RLS 격리: 타인 계정으로 다른 사용자 topic 의 draft GET → NotFound/403.
- 시나리오 F — active 인터뷰 중 양산 차단: Phase 2 `active` session 가진 topic 에 `POST /draft/generate` curl → 400.

### 13. 마무리
- `CLAUDE.md` "로컬 개발" 줄에 변동 없으면 그대로. zod 추가만 backend dep 메모.
- design 문서 `## 8. Plans` 표에 Phase 3 한 줄 추가 (상태: 완료).
- design 문서 `## 9. 결정 이력` 에 본 plan 핵심 결정 한 줄: "**2026-05-12**: Phase 3 plan 확정. 양산 = sync 단일 POST + Gemini 2회 호출(카드 JSON / 블로그 마크다운), `drafts` 1 topic : 1 row(regenerate replaces). 카드 HTML→Image 렌더는 Phase 7(인스타 발행) 로 이관 — `/new/edit` 가 JSON 으로 직접 렌더, 이미지 자산은 발행 시점에만 필요. 색상 팔레트 7쌍 화이트리스트로 LLM 출력 컨트롤."
- `superpowers:finishing-a-development-branch` 호출.

---

## 완료 기준

- `pnpm --filter backend type-check`, `pnpm --filter frontend type-check` PASS
- 시나리오 A/B/E/F 수동 검증 통과 (C/D 는 선택)
- Supabase Dashboard 의 `drafts` 테이블 + RLS + policy 4종 + `topic_id` unique 확인
- Phase 1a Health 200 + Phase 2 인터뷰 회귀 없음 (`/new` 부터 끝까지)
- (테스트 코드 작성 / 카드 이미지 렌더링 / 발행 큐는 본 phase 스코프 외)

다음 plan: **Phase 4** (미리보기 + 편집 — `/new/edit` 의 블로그 마크다운 프리뷰, 카드 드래그 재배열, 채널별 미리보기 화면, 작성 중 상태 영속) 또는 **Phase 1b** (인프라) 로 분기 — Phase 3 dogfooding 결과를 보고 결정.

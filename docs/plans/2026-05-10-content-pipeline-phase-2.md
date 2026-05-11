# Phase 2 — AI 인터뷰

**목표**: Phase 1a 인증 토대 위에 AI 인터뷰 도메인을 얹는다. 사용자가 주제 한 줄을 던지면 Gemini 가 매 턴 동적으로 질문을 만들어내고, 최소 3 ~ 최대 8 턴 안에서 인터뷰를 마치고 답변 리뷰까지 끝낸다. 양산(Phase 3)은 본 plan 스코프 외 — `/new/generate` 의 mock 그대로 둔다.

**아키텍처 한 줄**: 도메인 테이블 3개(`topics`, `interview_sessions`, `interview_messages`) → NestJS `InterviewModule` 이 Gemini 멀티턴 prompt 를 매 턴 새로 호출 → frontend `/new/{topic, interview, review}` 가 server-driven 으로 동기화.

**스택**: NestJS 11, Next.js 16 App Router, `@google/generative-ai` SDK (`gemini-2.5-flash` 메인 + 폴백 체인 — devjournal `agent.service.ts` 패턴 1:1 재활용), Supabase Postgres + 호스티드 RLS, Phase 1a `SupabaseAuthGuard` / `SupabaseService.admin` 그대로 재활용.

**Out-of-scope**: AI 양산(Phase 3), 발행/큐/n8n(Phase 5~7), 답변 임베딩(Phase 3 에서 재평가), AWS/Docker/Cloudflare(Phase 1b), Tistory/결제/일반 사용자 onboarding.

---

## 사전 작업

- `apps/backend/.env` 에 `GEMINI_API_KEY` 추가 (Google AI Studio 발급), `.env.example` 동기화.
- 호스티드 Supabase Auth 설정은 Phase 1a 에서 끝남 — 본 phase 는 변경 X.

---

## 도메인 결정 (lock-in)

테이블 3개로 충분. drafts 는 Phase 3, publish_queue 는 Phase 5.

- `topics` — 사용자가 입력한 주제 한 줄. 1 user : N topics. 컬럼: `id`, `user_id (FK auth.users)`, `title`, `created_at`, `updated_at`.
- `interview_sessions` — 한 topic 당 active 1개 제약. 컬럼: `id`, `topic_id`, `user_id`, `status (active|completed|skipped)`, `end_reason (user_stop|ai_judged_enough|max_reached|null)`, `started_at`, `ended_at`. partial unique index 로 `(topic_id) where status='active'` 단일성 강제.
- `interview_messages` — turn 별 Q/A. 컬럼: `id`, `session_id`, `turn (int)`, `role (assistant|user)`, `content`, `created_at`. unique `(session_id, turn, role)`.

RLS: 세 테이블 다 켬. `auth.uid() = user_id` 정책. 백엔드는 admin(service-role) 클라이언트로 우회하며 controller 단에서 ownership 직접 확인 — Phase 후반 직접 클라이언트 read 가능성 대비.

## API 표면

모두 `SupabaseAuthGuard` 보호. user 추출은 Phase 1a 가드와 동일 패턴.

| Method | Path | 의미 |
|---|---|---|
| POST | `/api/topics` | 주제 생성 |
| GET | `/api/topics/:id` | topic + 최신 session + messages |
| POST | `/api/topics/:id/interview/start` | active session 생성 + 첫 질문 LLM 호출 |
| POST | `/api/topics/:id/skip-interview` | status=skipped 빈 session 박음 |
| POST | `/api/interview/:sessionId/answer` | 답변 저장 → next 질문 또는 done(reason) |
| POST | `/api/interview/:sessionId/stop` | 사용자 "그만" (user 답변 ≥ MIN 이어야 허용) |
| PATCH | `/api/interview/:sessionId/messages/:messageId` | 리뷰 화면에서 user role 답변만 편집 |

## 상태 머신 (InterviewService 책임)

- start: active session 이미 있으면 그대로 + 첫 질문 반환, 없으면 새로 만들고 `buildFirstQuestionPrompt` 호출.
- answer: 직전 assistant turn 에 매칭된 user 메시지 저장 → user 답변 수 평가:
  - `< MIN(3)` → judge 호출 없이 다음 질문 생성·저장
  - `MIN ≤ N < MAX(8)` → enough judge LLM 호출 → enough → completed/`ai_judged_enough` / more → 다음 질문
  - `== MAX(8)` → judge 호출 없이 즉시 completed/`max_reached`
- stop: user 답변 < MIN 이면 BadRequest. 그 외 completed/`user_stop`.
- skipForTopic: 빈 skipped session insert (이미 있으면 그대로 반환).
- patchUserMessage: session.status === 'active' 면 거부. role='user' 만 편집.

상수: `MIN_USER_TURNS = 3`, `MAX_USER_TURNS = 8`.

`completed` 이후로는 PATCH user message 만 허용.

---

## 파일 구조

**신규 (backend)**

- `supabase/migrations/20260510000001_phase2_domain.sql`
- `apps/backend/src/gemini/{gemini.module,gemini.service}.ts`
- `apps/backend/src/interview/{interview.module,interview.controller,interview.service,interview.prompts}.ts`
- `apps/backend/src/interview/dto/{answer,patch-message}.dto.ts`
- `apps/backend/src/topics/{topics.module,topics.controller,topics.service}.ts`
- `apps/backend/src/topics/dto/create-topic.dto.ts`

**수정 (backend)**

- `apps/backend/src/app/app.module.ts` — Topics/Interview/Gemini 모듈 등록
- `apps/backend/src/supabase/database.types.ts` — 자동 재생성
- `apps/backend/.env.example`, `apps/backend/package.json`

**신규 (frontend)**

- `apps/frontend/src/lib/api/{client,types,topics,interview}.ts`
- `apps/frontend/src/app/new/review/page.tsx`

**수정 (frontend)**

- `apps/frontend/src/features/new-content/context.tsx` — `topicId / session / messages` 모델로 확장
- `apps/frontend/src/app/new/page.tsx` — POST /topics + skip 분기
- `apps/frontend/src/app/new/interview/page.tsx` — server-driven, 단방향(이전 버튼 제거), 충분해요 ≥ MIN 일 때만 노출
- `apps/frontend/src/app/new/generate/page.tsx` — `topicId` 진입 가드만 추가
- `apps/frontend/src/lib/routes.ts` — `newReview` 추가
- `apps/frontend/.env.example`, `apps/frontend/.env.local` — `NEXT_PUBLIC_API_URL`

---

## Tasks

### 1. 도메인 테이블 마이그레이션
- 위 컬럼 정의대로 `topics / interview_sessions / interview_messages` 생성 + RLS + 정책.
- Dashboard SQL Editor 또는 MCP `apply_migration` 적용.
- 검증: Table Editor 에서 3개 테이블 + RLS 토글 ON 확인.

### 2. database.types.ts 재생성
- Supabase CLI 또는 MCP `generate_typescript_types`.
- 검증: `pnpm --filter backend type-check` 통과.

### 3. GeminiService
- `pnpm --filter backend add @google/generative-ai`.
- devjournal `agent.service.ts` 의 `MODEL_FALLBACKS` 배열 + 순차 try/catch 패턴 재활용 (function calling 없이 plain text generate 만).
- `.env.example` 에 `GEMINI_API_KEY` 추가.
- AppModule 에 등록.

### 4. interview.prompts.ts (순수 함수)
- 시스템 프롬프트 1개. 한국어 인터뷰어 페르소나, 한 번에 한 가지, 직전 답변을 받아 깊게 파고들기, 30자 내외 평어, 메타 발언 금지.
- 빌더 3개:
  - `buildFirstQuestionPrompt(topic)` — topic 만 보고 첫 질문
  - `buildNextQuestionPrompt(topic, history)` — 누적 transcript 기반 다음 질문
  - `buildEnoughJudgePrompt(topic, history)` — YES/NO 만 출력 강제
- 파서 1개: `parseEnoughJudgement(raw)` → 'enough' | 'more'. 모호하면 'more' 안전 default.

### 5. InterviewService
- 위 "상태 머신" 섹션이 사양. 외부 의존(Supabase / Gemini) 은 생성자 주입.
- 구현은 public 메서드(`start / answer / stop / skipForTopic / patchUserMessage / getStateForTopic`) + private DB 헬퍼들로 분해.
- 핵심 분기 (시나리오 검증으로 잡힘):
  1. `stop`: user 답변 < MIN → BadRequest
  2. `answer`: userTurns < MIN → judge 호출 없이 next 질문 (gemini 1회)
  3. `answer`: userTurns == MIN & judge=YES → completed/`ai_judged_enough` (gemini 1회)
  4. `answer`: userTurns == MIN & judge=NO → next 질문 (gemini 2회)
  5. `answer`: userTurns == MAX 도달 → judge 호출 없이 completed/`max_reached` (gemini 0회)
- 검증: type-check 통과. 분기별 동작은 Task 13 시나리오에서 함께.

### 6. TopicsService + Controllers
- `TopicsService.create` (admin insert), `getDetail` 은 `InterviewService.getStateForTopic` 위임.
- `TopicsController`: POST `/`, GET `/:id`, POST `/:id/interview/start`, POST `/:id/skip-interview`. 모두 `SupabaseAuthGuard`.
- `InterviewController`: POST `/:sessionId/answer`, POST `/:sessionId/stop`, PATCH `/:sessionId/messages/:messageId`.
- DTO 3개 (`CreateTopicDto`, `AnswerDto`, `PatchMessageDto`) — `class-validator` 로 길이 제한.
- AppModule 에 모듈 등록.
- 검증(수동): Phase 1a 로 받은 access_token 으로 `curl` 으로 create → start → answer 1회까지 200/JSON 흐름 확인.

### 7. Frontend API 클라이언트
- `.env.local / .env.example` 에 `NEXT_PUBLIC_API_URL=http://localhost:3001`.
- `lib/api/client.ts` — `apiFetch(supabase, path, init)` 래퍼. `supabase.auth.getSession()` → `Authorization: Bearer ...` 자동 부착, non-2xx 시 throw.
- `lib/api/types.ts` — backend 응답 타입(`Topic / InterviewSession / InterviewMessage / AnswerResponse(next|done)`).
- `lib/api/topics.ts` — `create / detail / startInterview / skipInterview`.
- `lib/api/interview.ts` — `answer / stop / patchMessage`.
- `lib/routes.ts` 에 `newReview: '/new/review'` 추가.
- 검증: `pnpm --filter frontend type-check` 통과.

### 8. NewContentContext 확장
- `topicTitle / topicId / session / messages` + setters + `appendMessage / reset`.
- 기존 `answers[idx]` mock 모델 폐기. `INTERVIEW_QUESTIONS` import 제거.
- 검증: type-check 가 다음 task 들이 화면 갈아끼우기 전까진 fail 하는 게 정상.

### 9. /new 주제 페이지
- 기존 마크업(STEP 01, 헤딩, 설명, textarea, hint) 유지. 내부 동작만 갱신:
  - `Link` → `button`, `topic / setTopic` → `topicTitle / setTopicTitle`
  - "다음" → POST /topics → startInterview → context 채우고 `/new/interview` push
  - "스킵하고 바로 만들기" → POST /topics → skipInterview → `/new/generate` push
  - 진행 중 Loader, 에러 인라인 표시
- 검증: type-check.

### 10. /new/interview server-driven 단방향
- 진입 가드: `topicId / active session` 없으면 `/new` replace.
- 직전 질문 = `messages` 의 마지막 assistant. user 답변 수 = `messages.filter(role='user').length`.
- 답변 제출: 낙관적으로 user 메시지 append → POST /answer → `next` 면 question append, `done` 이면 session 갱신 후 `/new/review`.
- "이전" 버튼 제거. "충분해요" 는 user 답변 ≥ MIN 일 때만 노출 → POST /stop → `/new/review`.
- 진행률 = `(userTurns + 1) / MAX`.
- mock `INTERVIEW_QUESTIONS` import 제거.
- 검증: type-check.

### 11. /new/review 답변 리뷰·편집
- 진입 가드: session 없거나 status='active' 면 `/new` replace.
- messages 를 turn 별 Q/A pair 로 묶어 카드 렌더. textarea 는 user 답변만, dirty 일 때만 "저장" 버튼 노출 → PATCH.
- "양산하기" → `/new/generate` (Phase 3 에서 본격 구현).
- skipped 사용자는 `/new` 에서 직접 `/new/generate` 로 가므로 본 화면에 도달할 일 없음 — 별도 분기 X.
- 검증: type-check.

### 12. /new/generate 진입 가드
- 기존 mock 애니메이션 그대로. `topicId` 없으면 `/new` replace 만 추가.

### 13. 통합 검증 (수동, `pnpm dev`)
- 시나리오 A — 인터뷰 풀 코스: `/new` → 주제 입력 → 인터뷰 첫 질문 → 답변 3개 → AI 종료 → 리뷰 편집 1개 → 양산하기 → mock `/new/edit` 도달.
- 시나리오 B — 사용자 그만: 답변 1~2 시점엔 "충분해요" 안 보임, 3 이상에서 노출 → 클릭 → review 도달, Dashboard 에서 `end_reason='user_stop'` 확인.
- 시나리오 C — 스킵: `/new` → 스킵 클릭 → `/new/generate` 직행, `interview_sessions` 에 status='skipped' 행 1개.
- 시나리오 D — 새로고침: 인터뷰 중 새로고침 시 in-memory context 손실 → 가드가 `/new` 로 보냄. 본 phase 는 회복 X(Phase 3 에서 server-state hydrate 와 함께 재평가).
- 시나리오 E — RLS 격리: 다른 계정으로 타인의 topic id `curl` → NotFound/401.

### 14. 마무리
- `CLAUDE.md` "로컬 개발" 줄에 `GEMINI_API_KEY` 필요 한 줄 추가.
- design 문서 `## 8. Plans` 표에 Phase 2 한 줄 추가, `## 9. 결정 이력` 에 본 plan 핵심 결정 한 줄 메모.
- `superpowers:finishing-a-development-branch` 호출.

---

## 완료 기준

- `pnpm --filter backend type-check`, `pnpm --filter frontend type-check` PASS
- 시나리오 A/B/C/E 수동 검증 통과
- Supabase Dashboard 에 3개 테이블 + RLS 활성화
- Phase 1a Health 200 회귀 없음
- (테스트 코드 작성은 본 phase 스코프 외 — 프로토타입 사이클 정책)

다음 plan: Phase 3 (AI 양산) — drafts 테이블, 카드뉴스 HTML→Image, 블로그 마크다운, `/new/generate` mock 을 실 호출로 교체.

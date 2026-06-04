# 양산 시 인스타 캡션 자동 생성 + 실패 재시도 (B-04, read-only)

**목표**: 양산(`generate()`) 흐름에서 **인스타 캡션을 자동 생성**해 draft 에 저장하고, 상세 인스타 탭(`DetailInsta`)이 mock(`CAPTION_MOCK`) 대신 실제 캡션을 표시하게 한다. 추가로, 캡션 생성이 실패(또는 누락)했을 때 **사용자가 캡션만 다시 생성**할 수 있는 수동 재시도 경로를 둔다. 직접 타이핑 편집은 out-of-scope — 표시는 read-only, 재생성만 가능.

**아키텍처 한 줄 (하이브리드)**:
- **정상 양산 경로** = 캡션을 위한 별도 LLM 호출 없이, 기존 카드뉴스 생성 호출(jsonMode)의 출력 JSON 에 `caption` 필드를 하나 더 받는다(추가 호출 0개). 추출은 optional — 누락/오형식이면 `caption=null`, 카드 양산은 살림.
- **재시도 경로** = 캡션만 만드는 **독립 생성 코어 + 전용 엔드포인트**. 사용자가 인스타 탭의 "캡션 생성/다시 생성" 버튼을 누르면 호출. `regenerateCardImage`(카드별 수동 재생성)와 동일한 수동 재생성 패턴.
- 두 경로의 "좋은 캡션이란" 포맷 지시는 **공유 상수**로 빼서 카드 프롬프트(끼워넣기)와 독립 캡션 프롬프트가 같은 정의를 쓰게 한다(format drift 방지).

**Out-of-scope**:
- 캡션 **직접 편집**(타이핑) UI / PATCH 지원 — 표시는 read-only, AI 재생성만 (추후 별도 작업)
- 정상 양산에 **캡션 전용 호출 추가** (정상 경로는 끼워넣기로 추가 호출 0개 유지; 전용 호출은 재시도에서만)
- 카드뉴스 편집 후 캡션 자동 재생성 (편집과 desync 허용 — 사용자가 필요 시 수동 재생성)
- 양산 진행 UX 변경 (기존 `useGenerateProgressSteps` 가짜 스텝 그대로 — 정상 경로 추가 지연 없음)
- 발행(Meta Graph API) 연동 — 캡션 데이터만 준비, 실제 발행은 Phase 10

---

## 도메인 결정 (lock-in)

### 1. 정상 양산 생성 방식 = 카드 호출에 끼워넣기 (추가 호출 0개)
- 카드 LLM 응답을 `{ cards: [...8장...] }` → `{ cards: [...8장...], caption: string }` 로 한 필드만 확장.
- 사유: ① 양산 지연·비용 증가 0. ② 캡션이 카드와 같은 호출·같은 컨텍스트에서 생성 → 표지·본문과 톤/메시지 일관. 인스타 캡션은 본질적으로 그 카드 묶음의 설명글.

### 2. 재시도 = 독립 캡션 생성 코어 + 수동 버튼 (하이브리드)
- 캡션만 생성하는 독립 코어(가칭 `generateCaption(topic, history, cards?)`) + 엔드포인트(가칭 `POST /drafts/:id/caption/regenerate`). 결과를 `drafts.caption` 에 저장 후 반환.
- 프론트는 인스타 탭에 버튼: `caption` 이 null/빈값이면 "캡션 생성"(빈 상태 안), 있으면 "다시 생성"(작은 보조 버튼). 둘 다 같은 엔드포인트.
- 사유: "캡션만 다시"는 통째 다시 양산(카드까지 바뀜)으로 풀 수 없음. 기존 `regenerateCardImage` 수동 재생성 패턴과 동일 결.
- 재시도 시 DB 의 기존 `cards` 를 코어에 넘겨(`cards?`) 캡션이 현재 카드와 정합하도록(선택적 컨텍스트).

### 3. 포맷 지시 = 공유 상수로 DRY (format drift 방지)
- "캡션 포맷"(훅 라인 → 핵심 인사이트 2~3줄 → "자세한 후기는 프로필 링크 → 네이버 블로그" CTA → 해시태그 5~6개)을 **단일 상수**(가칭 `CAPTION_FORMAT`)로 정의.
- 카드 프롬프트(끼워넣기)와 독립 캡션 프롬프트가 둘 다 이 상수를 참조 → 두 경로 출력 톤/형식 일치.

### 4. 가드레일 = 기존 SYSTEM_INSTRUCTION 그대로 상속
- 카드 프롬프트가 쓰는 `SYSTEM_INSTRUCTION` 에 이미 콘텐츠 가드레일(transcript 외 사실·통계·인용 지어내기 금지 / 정치·종교·시사·특정 인물 비판 회피)이 있음. 끼워넣기는 자동 상속. **독립 캡션 프롬프트도 같은 `SYSTEM_INSTRUCTION` 사용**. [[feedback_llm_content_guardrails]]

### 5. 파싱 실패 → 격리 (caption 만 비우고 양산은 살림)
- 끼워넣기 경로에서 `caption` optional 추출: 누락/오형식이면 cards tuple 검증은 그대로 진행, `caption=null`. cover 이미지 격리(`2026-06-01-generate-cover-image.md`)와 동일 철학.
- 단, cards tuple 검증 실패는 기존대로 양산 실패(불변). 재시도 엔드포인트에서 캡션 생성 실패는 4xx/5xx 로 반환 → 프론트 toast 에러, 사용자가 다시 시도.

### 6. 저장 = drafts 신규 `caption` 컬럼 (nullable)
- `blog_body`(nullable text)와 동일 결. 기존 draft 는 `caption=null` → 빈 상태 + "캡션 생성" 버튼으로 graceful.

---

## 변경 대상 파일

### DB
- **신규 마이그레이션** `supabase/migrations/20260604000001_phase7_5_caption.sql`
  - `alter table drafts add column caption text;` (nullable, `blog_body`/`blog_tags` 패턴 참고).
  - Dashboard SQL Editor 또는 MCP `apply_migration` 으로 적용.

### 백엔드 (`apps/backend/src`)
- `drafts/drafts.prompts.ts`
  - **신규 공유 상수** `CAPTION_FORMAT` — 캡션 포맷 지시(결정 3).
  - `buildCardNewsPrompt`: user 프롬프트에 캡션 출력 지시 추가 — 출력 JSON 에 `"caption"` 키 1개 더, 포맷은 `CAPTION_FORMAT` 참조. SYSTEM_INSTRUCTION 가드레일 상속.
  - **신규** `buildCaptionPrompt(topic, history, cards?)` — 독립 캡션 LLM 요청. 같은 `SYSTEM_INSTRUCTION` + `CAPTION_FORMAT`. `cards` 주어지면 정합용 컨텍스트로 포함.
- `drafts/drafts.service.ts`
  - `generate()`: 카드 파서 콜백(현 ~128–133행)에서 `parsed.caption` optional 추출(`typeof === 'string'` 가드, 아니면 null). cards tuple 은 기존대로 검증.
  - `markReady(...)`: `caption: string | null` 파라미터 추가, `.update({ ... caption })` 포함. `generate()` 호출부에 추출 caption 전달.
  - **신규** `regenerateCaption(draftId, userId)`: 소유 draft 로드 → topic/history(+기존 cards) 로 `buildCaptionPrompt` 호출(`llm.generateValidated`, non-empty string 검증) → `caption` 컬럼 update → 갱신 draft 반환. (ready 검증은 cover 재생성처럼 필요 시 적용 — 캡션은 ready draft 대상이라 `requireOwnedReadyDraftForCard` 류 일부 재사용 가능.)
  - GET select 문자열(현 ~100행)에 `caption` 추가.
- `drafts/drafts.controller.ts`
  - **신규** `POST /drafts/:id/caption/regenerate` → `regenerateCaption(id, req.user.id)`. (`regenerate-image` 라우트 패턴 참고.)
- `supabase/database.types.ts` — `drafts` Row/Insert/Update 에 `caption: string | null` 반영(수기 또는 MCP `generate_typescript_types`).

### 프론트엔드 (`apps/frontend/src`)
- `lib/api/types` — draft 타입에 `caption: string | null`.
- `lib/api/drafts.ts` — **신규** `regenerateCaption(draftId)` (POST, `regenerateCardImage` 패턴).
- `features/detail/components/DetailContent.tsx` — `DetailInsta` 에 `caption={draft.caption}` + `draftId`/`topicId` 등 재생성에 필요한 식별자 전달.
- `features/detail/components/DetailInsta.tsx`
  - `CAPTION_MOCK` 제거. `caption` 표시.
  - `useMutation(regenerateCaption)` + 성공 시 `qc.invalidateQueries({ queryKey: qk.drafts() })` + toast(`RegenerateProgressModal`/`CardImageBox` 패턴 참고). 로딩 중 버튼 비활성/스피너.
  - `caption` null/빈값 → "캡션이 아직 없어요" + **"캡션 생성"** 버튼. 값 있음 → 캡션 + 작은 **"다시 생성"** 버튼.

---

## 검증

[[feedback_no_tests_in_prototype]] — jest spec 안 씀. 검증은 type-check + 수동 시나리오.

- `pnpm --filter backend type-check` / `pnpm --filter frontend type-check` 통과 (markReady·`regenerateCaption` 시그니처, draft 타입, caption optional 흐름).
- `pnpm lint` 통과.
- 수동 시나리오 (로컬 dogfooding 환경):
  1. **정상 양산**: 인터뷰 완료 → 양산 → 인스타 탭에서 mock 아닌 실제 캡션 표시(주제/인터뷰 디테일·해시태그 반영). DB `drafts.caption` 채워짐.
  2. **실패 격리**: (캡션 키 누락 유도) `caption=null`, 카드/블로그 양산은 `ready` 정상. 인스타 탭에 빈 상태 + "캡션 생성" 버튼.
  3. **수동 재시도**: 빈 상태에서 "캡션 생성" → 캡션 채워지고 리스트 갱신·toast. 값 있을 때 "다시 생성" → 새 캡션 교체.
  4. **재시도 에러**: 캡션 생성 엔드포인트 실패 시 toast 에러, draft 캡션은 기존값 유지(파괴 없음).
  5. **빈 상태(레거시)**: 마이그레이션 이전 draft(`caption=null`) 진입 시 빈 상태 + 버튼, 에러 없음.
  6. **다시 양산**: 같은 `generate()` 경로라 캡션도 새로 생성·갱신.

---

## 분기/리스크

- **두 프롬프트 format drift**: 끼워넣기 vs 독립 캡션이 다른 톤/형식으로 갈릴 위험 → `CAPTION_FORMAT` 공유 상수로 한 정의 강제(결정 3).
- **출력 길이/형식 흔들림**: 카드 프롬프트가 이미 무거움 + `caption` 추가로 jsonMode 출력 형식 risk 소폭 ↑. caption optional 격리로 카드 양산 보호. 누락 잦으면 끼워넣기 대신 항상 독립 호출(통일안)로 승격 검토 — 지연 trade-off.
- **캡션 ↔ 카드 desync**: 카드 편집 후 캡션은 옛 값 유지(read-only). 사용자가 "다시 생성"으로 수동 보정(재시도 코어가 기존 cards 컨텍스트 사용). 발행 phase 에서 자동 동기화 재검토.
- **마이그레이션 적용 순서**: 코드(select 에 `caption` 포함)가 마이그레이션보다 먼저면 select 에러. 로컬은 마이그레이션 먼저 적용 후 코드 검증. ([[feedback_infra_cli_guide_only]] — 적용은 가이드/수동.)
- **재시도 라우트 ready 전제**: 캡션 재생성은 `ready` draft 대상. `generating`/`failed` draft 에 대한 호출은 4xx 로 막을지 결정(cover 재생성의 ready 검증 재사용 여부)은 구현 단계에서 확정.

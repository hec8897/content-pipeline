# LLM 마이그레이션 — Gemini → OpenAI (GPT-5 + gpt-image-1)

**목표**: 백엔드의 LLM 호출처를 Google Gemini 에서 OpenAI 로 통일한다. 텍스트는 `gpt-5` (standard), 이미지는 `gpt-image-1` (medium, 1024×1024). 결과적으로 SDK 1개 / API 키 1개 / 결제처 1곳으로 운영을 단순화하고, 현재 `IMAGE_GEN_MODE` 3-mode 분기와 Pollinations 의 한국어→영어 prompt 변환 단계까지 제거한다. 결과물 품질은 동등 이상을 목표(특히 한국어 카피·블로그 톤은 실측 비교 후 회귀 없음 확인).

**아키텍처 한 줄**: backend `gemini/` 디렉토리 → `llm/` 으로 이름 변경, `LlmService` (OpenAI Chat Completions + Images) 단일 클래스. prompt 빌더는 Gemini 의 `GenerateContentRequest` 대신 자체 정의 중립 타입 `LlmRequest` 반환. `IMAGE_GEN_MODE` 는 `stub | openai` 두 값으로 축소. DB / 라우트 / 프론트엔드 코드 무변경.

**스택 변동**:
- 제거: `@google/generative-ai` (^0.24), `@google/genai` (^2.3)
- 추가: `openai` (latest, ^5 line)
- env: `GEMINI_API_KEY` 제거, `OPENAI_API_KEY` 추가. `IMAGE_GEN_MODE` 값 도메인 축소.

**Out-of-scope**:
- 프론트엔드 코드/타입 변경 (응답 shape `{ imageBase64 }` / 텍스트 응답 / 라우트 동일하게 유지)
- DB 마이그레이션 / Supabase 스키마 변경
- 라우트 추가/삭제. 기존 `/api/drafts/generate`, `/api/drafts/:id/cards/:index/regenerate-image`, `/api/interview/...` 시그니처 보존
- 이미지 톤·스타일 재설계 (현재 `IMAGE_GEN_SYSTEM` 가드레일 그대로 이식)
- prompt caching 명시적 결선 (OpenAI 는 input prefix 자동 캐싱 — 코드 변경 불필요, 단 system instruction 을 messages 앞단에 안정적으로 배치되어 있는지 확인만)
- 비용 모니터링 / 사용량 dashboard (별도 phase)

---

## 사전 작업

- OpenAI Platform 계정 + billing 등록 + API 키 발급. 키는 본인 `.env` 에만, 키 commit 금지.
- 본인 dogfooding 환경에서 실측 비교 완료 (= 본 plan 시작 직전 step): 동일 인터뷰 transcript 1개를 (a) 현재 Gemini 파이프라인 (b) OpenAI 신규 파이프라인 양쪽으로 양산해 카드뉴스 8장 + 블로그 1편 결과를 본인 눈으로 비교. 한국어 톤 / 카피 자연스러움 / 사실 가드레일 준수 셋 중 회귀 없음 확인.
- Phase 6 머지 + Phase 7 의 첫 task 1~2개 완료된 상태에서 본 plan 실행 시작 (= 본인 dogfooding 사이클 한 바퀴 돌아본 직후, 발행 결선 들어가기 전 — 도메인 안정된 시점에 LLM 교체).

---

## 도메인 결정 (lock-in)

### 1. 텍스트 모델 = `gpt-5` (standard) 단일
- 현재 Gemini 폴백 체인(`gemini-2.5-flash` → `2.5-flash-lite` → `2.0-flash` → `2.0-flash-lite`) 패턴 유지, 단 OpenAI 측은 `gpt-5` 메인 + `gpt-5-mini` 1단계 폴백만. nano 는 한국어 창작 품질 검증 안 된 상태라 본 phase 진입 X (추후 비용 압박 생기면 재검토).
- 인터뷰 Q 생성·enough-judge 도 동일하게 `gpt-5` 사용 — 본인 스케일에서 비용 차이 무의미 ([gpt5 표준 + 이미지 = 월 ~$4.5](../../CLAUDE.md) 본인 합의).
- 사유: 비용 차이 무의미 + 모델 분기 늘리면 회귀 추적이 어려워짐.

### 2. 이미지 모델 = `gpt-image-1`, medium quality, 1024×1024
- 사이즈 1024×1024 — 현재 Pollinations 와 동일. 이후 캡처/zip 단계는 frontend `InstaPreviewCard` 가 1080×1080 으로 fit 하므로 변경 없음.
- quality = `medium` (= $0.042/장). `low` 는 품질 부족 우려, `high` 는 본인 스케일에선 비용 4배 부담. 추후 발행물 톤 보고 결정 변경 가능.
- 응답은 base64 (`b64_json`) 로 받음 — 기존 service contract `{ imageBase64, modelUsed }` 그대로.

### 3. 디렉토리/모듈명 = `gemini/` → `llm/` 으로 변경
- import path 전반 (`drafts.service.ts`, `interview.service.ts`, `app.module.ts`) 업데이트. 클래스명 `GeminiService` → `LlmService`. 모듈명 `GeminiModule` → `LlmModule`.
- 사유: 디렉토리명이 provider 를 노출하면 추후 provider 교체 비용이 다시 발생. 본 마이그레이션을 마지막 rename 으로 끝냄.

### 4. prompt 빌더 반환 타입 = 자체 정의 `LlmRequest`
- 현재 `interview/interview.prompts.ts`, `drafts/drafts.prompts.ts` 가 `@google/generative-ai` 의 `GenerateContentRequest` 를 직접 반환 중. 두 파일을 자체 인터페이스로 재작성:

```
interface LlmRequest {
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  jsonMode?: boolean;  // 카드뉴스용 — response_format: { type: 'json_object' } 매핑
}
```

- 사유: Gemini 타입을 그대로 유지하면 SDK 를 못 지움. 또 향후 provider 교체 비용을 미리 청산.
- helper: `interview.prompts.ts` 의 `toContents()` (assistant/user → model/user 변환) 는 제거, OpenAI 가 그대로 `assistant`/`user` role 을 받기 때문에 매핑 단순화.

### 5. `IMAGE_GEN_MODE` 도메인 = `stub | openai`
- `pollinations`, `gemini` 두 값 제거. 기본값 = `openai`. 로컬 dev cost-free 검증용 `stub` 만 유지 (기존 `stub-image.ts` 그대로).
- `.env.example` 의 디폴트는 `openai`, 본인 로컬 `.env` 는 본인 판단 (`stub` 으로 두면 키 없이 frontend 결선 검증 가능).

### 6. JSON 강제 = `response_format: { type: 'json_object' }`
- 현재 카드뉴스 생성에서 Gemini 의 `generationConfig.responseMimeType: 'application/json'` 으로 강제하고 있는 흐름을 OpenAI 의 `response_format: { type: 'json_object' }` 로 1:1 매핑.
- `LlmRequest.jsonMode === true` 일 때 service 가 자동 결선.
- 기존 `generateValidated()` 의 parse 실패 → 모델 폴백 루프는 유지 — `gpt-5` JSON 모드도 가끔 들쭉날쭉할 수 있어 zod 검증 실패 시 `gpt-5-mini` 로 폴백.

### 7. 폴백 체인 = `gpt-5` → `gpt-5-mini`
- 텍스트 모델 리스트: `['gpt-5', 'gpt-5-mini']` 2단계. 첫 모델 실패(timeout / 429 rate limit / parse 실패) 시 두 번째로.
- 이미지 모델 리스트: `['gpt-image-1']` 단일. `gpt-image-1` 1순위 + (추후 옵션 생기면 mini 추가) — 현재로선 폴백 없음, 실패 시 `503 ServiceUnavailableException` 그대로 throw.

### 8. system instruction 위치 = OpenAI Chat Completions 의 `messages[0]` role:'system'
- Gemini 의 `systemInstruction` (별도 필드) → OpenAI 는 messages 배열의 첫 원소에 `{ role: 'system', content }` 로 박는 관용. 이 형태가 input prefix 캐싱에도 가장 유리.
- 자동 prompt caching (OpenAI 측) 활용을 위해 prompt 의 stable prefix(=`SYSTEM_INSTRUCTION` + 팔레트 힌트 같은 고정 텍스트)는 항상 messages 앞에 배치 — 현재 빌더 구조가 이미 이 모양이므로 추가 작업 없음, 확인만.

### 9. 이미지 prompt 통합 방식
- `gpt-image-1` 은 `system` 분리 없이 단일 `prompt` 필드만 받음. 따라서 현재 `IMAGE_GEN_SYSTEM` + `buildCardImagePrompt()` 결과를 service 단에서 단순 concat (`SYSTEM\n\n---\n\nUSER_PROMPT`) 하여 한 string 으로 전달.
- 기존 `geminiSystemInstruction` 인자는 service signature 에서 제거 (또는 무시) — caller (`drafts.service.regenerateCardImage`) 도 함께 정리.
- Pollinations 한국어→영어 prompt 변환 로직(`generateImagePollinations` 안의 사전 translation step) 전체 폐기. `gpt-image-1` 은 한국어 prompt 를 직접 잘 받음.

### 10. 에러/timeout 매핑
- 기존 `ServiceUnavailableException` throw 패턴 동일 유지.
- OpenAI SDK 의 `APIError` (status 4xx/5xx) → 그대로 catch → 모델 폴백 루프 → 최종 실패 시 503. parse 실패도 동일하게 폴백 트리거 (기존 `generateValidated` 패턴).
- 카드 이미지 timeout 가드는 OpenAI SDK 기본값에 위임 (현재 Pollinations 의 `POLLINATIONS_TIMEOUT_MS=60_000` 같은 별도 abort controller 불필요).

---

## 파일 구조

**rename**
- `apps/backend/src/gemini/` → `apps/backend/src/llm/`
  - `gemini.module.ts` → `llm.module.ts`
  - `gemini.service.ts` → `llm.service.ts`
  - `stub-image.ts` 그대로 (이름 보존, import path 만 갱신)

**수정 (backend)**
- `apps/backend/src/llm/llm.service.ts` (재작성):
  - `GoogleGenerativeAI`/`GoogleGenAI` import 제거 → `import OpenAI from 'openai'`
  - 메서드 시그니처 보존: `generateText(req: LlmRequest): Promise<string>`, `generateValidated<T>(req, parse)`, `generateImage(args: { prompt: string }): Promise<{ imageBase64: string; modelUsed: string }>`
  - 폴백 모델 리스트 도메인 결정 7 그대로
  - `IMAGE_GEN_MODE` 가 `stub` 이면 STUB_IMAGE_BASE64 반환, `openai` 면 `client.images.generate({ model: 'gpt-image-1', prompt, size: '1024x1024', quality: 'medium' })` 결과의 `data[0].b64_json` 반환
- `apps/backend/src/llm/types.ts` (신규): 위 도메인 결정 4 의 `LlmRequest` 인터페이스 정의.
- `apps/backend/src/interview/interview.prompts.ts`:
  - `import type { Content, GenerateContentRequest } from '@google/generative-ai'` 제거
  - 반환 타입 `LlmRequest` 로 교체, body 단순화 (`toContents` 헬퍼 제거 — assistant/user role 그대로 박음)
  - `SYSTEM_INSTRUCTION` 상수 / parse 로직 / interface `InterviewHistoryItem` 무변경
- `apps/backend/src/drafts/drafts.prompts.ts`:
  - 동일 — `GenerateContentRequest` import 제거, 반환을 `LlmRequest` 로
  - `buildCardNewsPrompt` 의 `responseMimeType: 'application/json'` → `jsonMode: true`
  - `IMAGE_GEN_SYSTEM` + `buildCardImagePrompt` 그대로. `buildCardImagePromptForFlux` 폐기 (Pollinations 제거).
  - body 카드용 image prompt 도메인은 현재대로 (cover/outro 만 — Phase 6 결정 2 가 body 도 허용으로 바뀌었지만 그 변경은 본 plan 과 독립).
- `apps/backend/src/drafts/drafts.service.ts`:
  - `gemini` 필드명 → `llm` 으로 rename, `GeminiService` import → `LlmService`
  - `regenerateCardImage` 안 `generateImage` 호출의 인자 단순화 (`fluxPrompt` 제거, `geminiSystemInstruction` 제거, `geminiPrompt` 1개로 통합 → `prompt`)
- `apps/backend/src/interview/interview.service.ts`:
  - 동일 — `gemini` → `llm` rename, import 갱신
- `apps/backend/src/app/app.module.ts`:
  - `GeminiModule` import → `LlmModule`
- `apps/backend/package.json`:
  - dependencies 에서 `@google/generative-ai`, `@google/genai` 제거, `openai` 추가
- `apps/backend/.env.example`:
  - `GEMINI_API_KEY=` 라인 제거, `OPENAI_API_KEY=` 추가
  - `IMAGE_GEN_MODE=stub` 주석에 가능 값 `stub | openai` 명시
- `apps/backend/.env` (본인 환경, commit X):
  - 동일하게 갱신
- `CLAUDE.md`:
  - "**AI**: `@google/generative-ai` SDK, `gemini-2.5-flash` 메인 + 폴백 체인 ..." 줄 → "**AI**: `openai` SDK, `gpt-5` 메인 + `gpt-5-mini` 폴백, 이미지 `gpt-image-1` (medium, 1024×1024)" 로 교체
  - 환경변수 안내의 `GEMINI_API_KEY` → `OPENAI_API_KEY` 로 갱신

**제거 (backend)**
- `apps/backend/src/llm/llm.service.ts` 내 `generateImagePollinations` private 메서드 + `POLLINATIONS_TIMEOUT_MS` 상수 (Pollinations 전체 폐기)
- `apps/backend/src/drafts/drafts.prompts.ts` 의 `buildCardImagePromptForFlux` 함수

**무변경 (확인만)**
- 프론트엔드 코드 전부 — 응답 shape `{ imageBase64 }` 동일
- `apps/backend/src/drafts/drafts.controller.ts`, `interview.controller.ts` 라우트 시그니처
- `apps/backend/src/auth/`, `apps/backend/src/supabase/`
- `supabase/migrations/` — 신규 파일 없음

---

## Tasks

### 1. dep / env / 디렉토리 rename
- `pnpm --filter backend remove @google/generative-ai @google/genai`
- `pnpm --filter backend add openai`
- `mv apps/backend/src/gemini apps/backend/src/llm`, 파일명 `gemini.* → llm.*`
- `.env.example` / `.env` / `CLAUDE.md` 텍스트 교체
- 검증: `pnpm --filter backend type-check` 가 import 실패로 폭발하는지 확인 (이 시점엔 폭발이 정상 — 다음 task 가 fix). 폭발 메시지가 예상 위치(`drafts.service.ts`, `interview.service.ts`, `app.module.ts`) 와 정확히 일치하는지 확인.

### 2. `LlmRequest` 타입 + prompt 빌더 마이그레이션
- `apps/backend/src/llm/types.ts` 신규 — `LlmRequest` 인터페이스 정의 (도메인 결정 4).
- `interview/interview.prompts.ts` 의 3개 함수 반환을 `LlmRequest` 로 교체. `Content`, `GenerateContentRequest` import 제거. `toContents` 헬퍼 삭제 — history mapping 을 inline 으로 `{ role, content }` 박음.
- `drafts/drafts.prompts.ts` 의 카드뉴스/블로그 빌더 반환 `LlmRequest` 로 교체. 카드뉴스 빌더는 `jsonMode: true` 명시. `buildCardImagePromptForFlux` 함수 + 관련 export 제거.
- 검증: `pnpm --filter backend type-check` PASS (`llm.service.ts` 미작성 상태라 prompt 파일은 통과해야 함 — 의존 방향 확인).

### 3. `LlmService` 재작성
- OpenAI SDK 초기화 (`new OpenAI({ apiKey: this.config.getOrThrow('OPENAI_API_KEY') })`)
- `IMAGE_GEN_MODE` 도메인 축소 (`stub | openai`, default `openai` — 도메인 결정 5).
- `generateText(req)`, `generateValidated<T>(req, parse)` — 폴백 모델 리스트 `['gpt-5', 'gpt-5-mini']` 순회. `LlmRequest` → `{ model, messages, temperature, response_format }` 매핑. `client.chat.completions.create()` 호출 후 `choices[0].message.content` 추출. 빈 응답 / parse 실패 → 다음 모델 시도. 최종 실패 → `ServiceUnavailableException`.
- `generateImage({ prompt })` — `IMAGE_GEN_MODE=stub` 분기 / `openai` 분기. `openai` 일 때 `client.images.generate({ model: 'gpt-image-1', prompt, size: '1024x1024', quality: 'medium', n: 1 })` 결과의 `data[0].b64_json` 반환. 빈/실패 시 503.
- 검증: `pnpm --filter backend type-check` PASS + `pnpm --filter backend lint` PASS.

### 4. 호출처 wiring 마무리
- `drafts.service.ts`: `gemini` 필드 → `llm`, `GeminiService` import → `LlmService`. `regenerateCardImage` 안 `generateImage` 호출 인자를 `{ prompt: buildCardImagePrompt(card, topic.title) /* IMAGE_GEN_SYSTEM 을 헤더로 prepend */ }` 형태로 단순화. 헤더 prepend 는 service 가 아니라 caller 가 책임 — `${IMAGE_GEN_SYSTEM}\n\n---\n\n${buildCardImagePrompt(...)}` 로 합성.
- `interview.service.ts`: 동일 rename.
- `app.module.ts`: module import 갱신.
- 검증: `pnpm --filter backend type-check`, `pnpm --filter backend lint`, `pnpm --filter backend build` 모두 PASS.

### 5. 수동 검증 (`pnpm dev`)
- 시나리오 A — 인터뷰 첫 질문: `/new` 에서 토픽 입력 → 인터뷰 시작 → 한국어 질문 한 줄 (30자 내외) 도착 + 톤 회귀 없음.
- 시나리오 B — 인터뷰 다음 질문: 답변 → 다음 질문 흐름이 직전 답변의 키워드를 받아 한 단계 깊게 파고드는지 확인.
- 시나리오 C — enough-judge: 답변 5~7개 후 "충분" 판정 도달 흐름이 기존과 동일하게 작동.
- 시나리오 D — 양산 (`POST /drafts/generate`): 카드뉴스 JSON 8장 (cover + body 6 + outro) + 블로그 마크다운 (1200~1800자 + TAGS) 모두 정상 파싱. `card_news`/`blog_*` 컬럼 정상 저장. `model_used` 컬럼이 `card=gpt-5,blog=gpt-5` 식으로 기록.
- 시나리오 E — 카드 이미지 재생성: cover/body/outro 각각 "AI 재생성" 클릭 → base64 응답 → 카드 배경에 반영. 새로고침 시 사라짐(기존 in-memory 동작 유지).
- 시나리오 F — JSON 모드 회귀: 카드뉴스 응답이 가끔 schema 미스로 파싱 실패 → `gpt-5-mini` 로 폴백되어 최종 성공하는지 1회 이상 확인 (의도적 stress: 토픽을 매우 추상적으로 던져 모델 응답 흔들기).
- 시나리오 G — `IMAGE_GEN_MODE=stub` 분기: `.env` 임시 변경 → 카드 재생성 시 STUB_IMAGE_BASE64 가 반환되어 카드에 고정 PNG 표시. 검증 후 원복.
- 시나리오 H — Phase 2~6 회귀: 인터뷰 / 양산 / 카드 편집 / 블로그 편집 / 미리보기 / PNG zip 모두 변함없음.
- 시나리오 I — 비용 / 응답시간 sanity: OpenAI dashboard 에서 본 phase 작업 중 발생 비용 < $1 / 양산 1회 평균 latency 가 현재 Gemini 와 비교해 ±3s 이내인지 확인.

### 6. 문서 갱신
- `CLAUDE.md` 의 AI 관련 한 줄 (도메인 결정 3 참고) 갱신. 환경변수 안내도 함께.
- `docs/plans/2026-04-28-content-pipeline-saas-design.md` 의 `## 9. 결정 이력` 에 한 줄:
  - "**2026-05-16**: LLM provider 를 Google Gemini → OpenAI 로 통일. 텍스트 `gpt-5` (폴백 `gpt-5-mini`), 이미지 `gpt-image-1` (medium, 1024×1024). SDK·키·결제 1곳으로 단순화. 모듈 `gemini/` → `llm/` rename. Pollinations·나노바나나 모드 폐기. 본인 dogfooding 비교 후 한국어 톤 회귀 없음 확인."

---

## 완료 기준

- `pnpm --filter backend type-check`, `pnpm --filter backend lint`, `pnpm --filter backend build` PASS
- `apps/backend/package.json` 에 `@google/generative-ai`, `@google/genai` 사라짐 / `openai` 존재
- `apps/backend/src/gemini/` 디렉토리 사라짐 / `apps/backend/src/llm/` 존재
- 프론트엔드 코드 / DB 스키마 / 라우트 시그니처 변경 없음
- 시나리오 A~I 수동 검증 통과
- `CLAUDE.md`, design doc 갱신 완료
- OpenAI dashboard 에 첫 호출 기록 + 본 phase 누적 비용 가시화
- 별도 commit 1개 또는 2개로 머지 (① rename + dep + 타입 + service / ② 호출처 wiring + 문서 + 환경변수 — 분리 시 중간 type-check 실패가 허용됨을 PR 설명에 명시)

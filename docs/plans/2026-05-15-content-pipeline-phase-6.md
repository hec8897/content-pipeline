# Phase 6 — 카드뉴스 편집 마감 + 인스타 미리보기 + AI 이미지 + PNG export

**목표**: Phase 4 에서 골격까지 만든 `CardNewsEditor` 의 텍스트 편집 갭을 채우고, 본인이 양산한 카드뉴스를 인스타 피드처럼 swipe 미리보기로 확인하고, cover/outro 카드는 Gemini image-gen (나노바나나) 으로 배경 이미지를 즉석 생성하며, 8장을 1080×1080 PNG zip 으로 내려받을 수 있게 한다. dogfooding 시점에 "내가 만든 카드가 실제로 어떻게 보이는지" 와 "이 결과물을 내가 그대로 발행해도 되는지" 를 본인 눈으로 검증할 수 있게 만든다. 실제 인스타 발행(Graph API / n8n / Storage) 은 Phase 7 책임 — 본 phase 는 발행 직전 단계까지.

**아키텍처 한 줄**: backend = `POST /api/drafts/:id/cards/:index/regenerate-image` 신설(Gemini image-gen, base64 응답). frontend = `CardNewsEditor` 텍스트 갭 채움 + 신규 `features/insta-preview/` (모달 캐러셀 + html-to-image + jszip) + 클라 in-memory 카드 `bg_image` data URL. DB 스키마 / Storage 변경 없음.

**스택**: 기존 동일. 신규 dep —
- backend: 없음 (`@google/generative-ai ^0.24` 의 image 출력 지원 활용 — 모델 ID 는 구현 시점 Gemini docs 확인. 후보: `gemini-2.5-flash-image-preview` 계열. 출력 안정성 이슈 시 `@google/genai` 신규 SDK 교체 검토)
- frontend: `html-to-image`, `jszip`

**디자인 레퍼런스**: 카드뉴스 편집 화면은 `claude_design/design_handoff_content_pipeline/README.md` 의 "화면 4 — 새 콘텐츠 / 편집" 그대로. 인스타 미리보기 모달은 시안 없음 → 본 plan 의 ASCII mock 을 단일 진실로 채택:

```
┌────────────────────────────────────┐
│       인스타 미리보기              ✕ │
├────────────────────────────────────┤
│   ◀       ┌──────────────┐      ▶   │
│           │              │          │
│           │   카드 03    │          │
│           │              │          │
│           │  1080×1080   │          │
│           │              │          │
│           │  '제목'      │          │
│           │  본문…       │          │
│           └──────────────┘          │
│            ○ ○ ● ○ ○ ○ ○ ○          │
│                                      │
│      [⬇ 전체 PNG 다운로드]            │
└────────────────────────────────────┘
```

**Out-of-scope**:
- Storage 셋업 (S3 / Supabase Storage) — 추후 별도 phase 에서 S3 vs Supabase 선택 + bucket / signed URL / RLS 정책 결정
- body 카드의 배경 이미지 (단색 유지 — Phase 3 의 "단색 배경 + 큰 타이포" 원칙)
- 이미지 업로드 (사용자 PC → 카드 배경) — Storage 결정 후 별도 phase
- 캡션 자동 생성 / 편집 — 발행 phase 묶음 (현재 `DetailInsta` mock 그대로)
- 인스타 발행 자체 (Graph API / n8n 워크플로우 / 실 채널 송출) — Phase 7
- DB 스키마 변경 / 마이그레이션 — drafts 테이블 그대로
- AI 이미지의 영속성 — 의도된 in-memory only. 새로고침 시 사라짐 → 다시 생성 비용 발생 (사용자 안내 필요)

---

## 사전 작업

- Phase 5 까지 머지된 상태. drafts / topics 스키마 그대로 사용.
- backend `DraftsModule` 에 라우트 추가만 — 새 모듈 / 새 entity / 새 마이그레이션 없음.
- frontend 신규 dep 2개 (`html-to-image`, `jszip`) `pnpm --filter frontend add` 로 추가.
- env / 인프라 변경 없음. `GEMINI_API_KEY` 그대로 재활용.

---

## 도메인 결정 (lock-in)

### 1. AI 이미지 영속화 = in-memory only
- Gemini 응답 base64 → frontend React state 에만 보관 → `<img src="data:image/png;base64,...">` 또는 카드 컨테이너 `background-image` 로 렌더.
- DB 저장 X. drafts 테이블 / `card_news` JSON 컬럼 변경 없음.
- 새로고침 → AI 이미지 사라짐 → 단색 배경으로 복귀. UI 상 "AI 이미지는 새로고침 시 사라져요" 안내 한 줄 표시.
- 사유 — Storage 결정을 Phase 7 까지 미룬 메모리 룰 [project_infra_defer](project_infra_defer) 준수. 임시 base64-in-DB 는 row 부피 부담 + 추후 Storage 이관 시 마이그레이션 추가 → in-memory 가 가장 깔끔.

### 2. AI 이미지 생성 대상 = cover / outro 카드만
- body 카드는 단색 유지. 사유 — Phase 3 디자인 원칙 + 비용 (8장 × 이미지 호출 vs 2장) + 일관성(스토리텔링 톤의 카드는 단색 미니멀이 가독성에 유리).
- 백엔드 endpoint 가 카드 type 검증 — cover/outro 가 아니면 `400 Bad Request`.

### 3. 카드 타입 전환 UX
- "카드 추가" 버튼이 type select (cover/body/outro) 와 함께 노출. 기본값 = `body`.
- 기존 카드의 type 전환은 본 phase 스코프 외 (사용자 양산 결과를 그대로 다듬는 흐름이 자연스러움 — type 강제 변경은 데이터 손실 위험).
- cover 는 보통 1장, outro 는 1장만 의미 있으므로 추가 시점 UI 에서 "이미 있어요" 안내 정도만.

### 4. 카드 텍스트 편집 보강 범위
- cover 카드 선택 시: 우측 패널에 `subtitle` 외에 `tag` 입력 필드 추가 (e.g. "Beta · 12.4").
- outro 카드 선택 시: 우측 패널에 `body` 외에 `cta` 입력 필드 추가 (e.g. "→ Link in bio").
- body 카드 선택 시: 기존 `title` + `body` 그대로.
- "이미지 업로드" placeholder 버튼 → 제거. "AI 재생성" placeholder 버튼 → 동작 결선 + cover/outro 선택 시에만 노출.

### 5. 인스타 미리보기 모달 — 트리거 위치와 동작
- 트리거 2곳:
  - `DetailInsta` (라이브러리에서 카드 진입 후 인스타 탭) 의 상단 "미리보기" CTA
  - `EditWorkspace` 의 인스타 탭 헤더 영역 (기존 "다음 — 발행" 옆)
- 모달 레이아웃: 1080×1080 카드 1장 크게 (뷰포트에 fit-contain), 좌/우 화살표 버튼, 키보드 ← → 지원, 하단 dot indicator, 상단 우측 ✕ close.
- 모달 하단 "전체 PNG 다운로드" 버튼 — zip 생성 + 다운로드.
- 미리보기 = 편집 결과 그대로 (AI 이미지 포함). 별도 다시 fetch / refresh 없음.

### 6. PNG 다운로드 — 파일 명 / 압축 방식
- zip 안 파일명: `card-01.png` ~ `card-08.png` (1-padded 2자리).
- zip 파일명: `<topic-title slug>.zip` — 한글/특수문자 → `slugify` 단순 변환 (공백 → -, 특수문자 제거). slug 빈 결과면 `cardnews-<draft-id-앞 8자>.zip` 폴백.
- 카드 8장 가정이지만 실제 `cards.length` 따름 (양산 결과가 더 적/많으면 그만큼).

### 7. HTML→PNG 렌더 방식 = html-to-image
- 비교 대안: satori (JSX→SVG, render layer 재작성 부담), native Canvas 2D (그리기 코드 직접 작성), html2canvas (font/css quirks 알려짐).
- 채택 사유 — 기존 `CardNewsView` 컴포넌트가 inline `style={{ background: card.bg }}` 로 색을 박고 있어 Tailwind CSS var 의존이 없음 → snapshot 안정성 좋음. dep ~16KB. 코드 재사용 100%.
- 캡처 대상 = `InstaPreviewCard` 신규 컴포넌트 (1080×1080 고정, `CardNewsView` wrap, 폰트/사이즈만 실제 1080 기준으로 조정). 모달 안 렌더되는 카드와 캡처용 카드를 같은 컴포넌트로 묶음 — render path 단일화.

### 8. Gemini image-gen prompt 가드레일
- 메모리 [llm_content_guardrails](llm_content_guardrails) 적용. SYSTEM 에:
  - "주어진 topic / 카드 텍스트 외에 사실/디테일 추가 금지. 보지 못한 인물·장소·날짜 묘사 X."
  - "정치·종교·시사·특정 인물 비판/풍자 회피. 사람 얼굴이나 식별 가능한 인물 묘사 회피 — 분위기/일러스트 톤만."
  - "카드뉴스 스타일: 미니멀, 부드러운 색조, 한국 인스타 피드 톤. 텍스트 렌더링 시도 X (텍스트는 카드 본문이 책임)."
- 사용자 프롬프트 = `topic.title` + `card.title` + `card.body|subtitle` 요약. 인터뷰 transcript 전체는 보내지 않음 (privacy + 토큰 절약).

### 9. 에러 처리
- AI 이미지 생성 실패(Gemini timeout / quota / safety filter) → 카드 편집 패널 안 한 줄 에러 + "다시 시도" 버튼. 카드 자체는 단색 배경 유지.
- PNG zip 생성 중 일부 카드 캡처 실패 → 모달 안 토스트("카드 N장 캡처 실패 — 다시 시도해주세요"), 부분 zip 다운로드 안 함 (전체 성공 시에만 다운로드).
- 모달 닫는 도중 zip 생성 미완료 → 모달은 닫혀도 다운로드는 그대로 진행.

---

## API 표면

신규 1개:

```
POST /api/drafts/:id/cards/:index/regenerate-image
  params:
    id        — draft UUID
    index     — 카드 index (0-based, draft.card_news 배열 기준)
  auth: Bearer (SupabaseAuthGuard)
  body: 없음 (서버가 draft + card 읽어 prompt 구성)
  response 200: { imageBase64: string }  // raw base64 (data: prefix 없음, 프론트가 붙임)
  response 400: 카드가 cover/outro 아님 / index 범위 초과
  response 404: draft 없음 / 소유자 아님
  response 503: Gemini 호출 실패 (모델 폴백 모두 실패 / safety filter)
```

기존 `GET /api/drafts`, `GET /api/drafts/:id`, `PATCH /api/drafts/:id`, `POST /api/drafts/generate` 회귀 없음.

---

## 파일 구조

**수정 (backend)**
- `apps/backend/src/gemini/gemini.service.ts` — `generateImage(prompt: string, systemInstruction?: string): Promise<{ imageBase64: string; modelUsed: string }>` 추가. 기존 텍스트 메서드와 같은 폴백 패턴(모델 리스트 순회). 응답 parts 중 `inlineData.mimeType === 'image/png'` 추출.
- `apps/backend/src/drafts/drafts.controller.ts` — `@Post(':id/cards/:index/regenerate-image')` 추가. `@CurrentUser()` 의 id 와 draft 소유 검증.
- `apps/backend/src/drafts/drafts.service.ts` — `regenerateCardImage(userId, draftId, cardIndex): Promise<{ imageBase64: string }>` 추가. draft 조회 → 카드 type 검증 → prompts 빌더 호출 → gemini.service 호출 → 결과 반환.
- `apps/backend/src/drafts/drafts.prompts.ts` — `IMAGE_GEN_SYSTEM` 상수 + `buildCardImagePrompt(card, topic): string` 추가. 위 도메인 결정 8 의 가드레일 그대로.

**신규 (backend dto)**
- `apps/backend/src/drafts/dto/regenerate-image-response.dto.ts` — `{ imageBase64: string }` 형 정의(컨트롤러 응답 타입 명시용).

**수정 (frontend)**
- `apps/frontend/src/features/detail/components/CardNewsEditor.tsx` — 우측 패널: cover 의 tag 필드 / outro 의 cta 필드 입력 추가. "카드 추가" 버튼 옆 type select(cover/body/outro). "이미지 업로드" 버튼 제거, "AI 재생성" 버튼 → handler 결선 + cover/outro 한정 노출. AI 이미지 결과(`bg_image` data URL) 를 카드에 반영 + 단색 fallback 유지.
- `apps/frontend/src/features/detail/components/CardNewsView.tsx` — `bg_image` 가 있으면 `background-image: url(...)` 로 렌더, 없으면 기존 단색. text 렌더는 그대로.
- `apps/frontend/src/features/detail/components/DetailInsta.tsx` — "미리보기" 버튼 추가(`InstaPreviewModal` 트리거).
- `apps/frontend/src/features/new-content/components/EditWorkspace.tsx` — 인스타 탭 헤더(현재 `<CardNewsEditor>` 위쪽 actions 영역)에 "미리보기" 버튼 추가. AI 이미지 state 는 `useDraftAutosave` 가 아닌 별도 `useState<Record<number, string>>` 으로 관리(autosave 대상 아님).
- `apps/frontend/src/lib/api/drafts.ts` — `regenerateCardImage(draftId, cardIndex): Promise<{ imageBase64: string }>` 추가.
- `apps/frontend/src/lib/api/queryKeys.ts` — 본 phase 에선 query key 추가 없음 (image gen 은 mutation only).
- `apps/frontend/src/types/index.ts` — `CardNewsCard` 에 `bg_image?: string` (data URL) 추가. **DB 직렬화에선 제외** — 즉, draft PATCH 시 `card_news` 페이로드에 `bg_image` 가 포함되면 backend 가 무시하거나 frontend `fromEditorCards` adapter 가 strip. 안전을 위해 frontend adapter 에서 strip.
- `apps/frontend/src/features/new-content/hooks/useDraftAutosave.ts` — `fromEditorCards` 가 `bg_image` 필드도 strip 하도록 보강 (현재 `id` 만 strip 중).

**신규 (frontend)**
- `apps/frontend/src/features/insta-preview/components/InstaPreviewModal.tsx` — 모달 셸 + 키보드 hook + dot indicator + close. props: `cards: CardNewsCard[]`, `topicTitle: string`, `open: boolean`, `onClose: () => void`.
- `apps/frontend/src/features/insta-preview/components/InstaPreviewCard.tsx` — 캡처 가능한 1080×1080 카드 1장. `CardNewsView` 를 그대로 사용하되 root 크기/폰트 스케일을 1080 기준으로 조정. `bg_image` 우선, 없으면 단색.
- `apps/frontend/src/features/insta-preview/lib/cardsToZip.ts` — `cardsToZip(cards, topicTitle): Promise<void>` — html-to-image + jszip + slugify + 다운로드 트리거 (browser `URL.createObjectURL` + `<a download>`).
- `apps/frontend/src/features/insta-preview/lib/slug.ts` — `slugify(title): string` 한국어 보존(공백 → `-`, 특수문자 제거). 빈 결과 시 fallback 처리.

**제거**
- `CardNewsEditor` 우측 패널의 "이미지 업로드" 버튼 (Storage 결정 후 별도 phase).

---

## Tasks

### 1. backend Gemini image-gen 메서드
- `gemini.service.ts` 에 `generateImage` 추가. 기존 폴백 패턴 재활용, 모델 리스트는 image-gen 가능한 모델만 (구현 시점 docs 확인하여 결정 — 후보 `gemini-2.5-flash-image-preview`). 응답에서 `inlineData` part 추출.
- 검증: backend `pnpm test` 없음 (메모리 [no_tests_in_prototype](no_tests_in_prototype)). 다음 task 의 수동 호출로 검증.

### 2. backend 라우트 + prompts
- `drafts.controller.ts` `@Post(':id/cards/:index/regenerate-image')` 추가. 401 / 403 / 404 / 400 분기 controller 단에서 명시.
- `drafts.service.regenerateCardImage` — draft 조회 → 카드 type 가드 → prompts.buildCardImagePrompt → gemini.generateImage → 결과 그대로 반환. 응답 base64 가 비정상(예: 빈 문자열)이면 503 throw.
- `drafts.prompts.ts` 에 IMAGE_GEN_SYSTEM + buildCardImagePrompt 추가. 가드레일 텍스트 도메인 결정 8 그대로.
- 검증: type-check + 수동 curl — `curl -X POST -H "Authorization: Bearer $TOKEN" .../drafts/$ID/cards/0/regenerate-image` (카드 0번이 cover 이어야 함). 응답이 `{ imageBase64: "..." }`, base64 디코드 후 image viewer 로 PNG 열리는지 확인.

### 3. frontend AI 재생성 결선
- `lib/api/drafts.ts` 에 `regenerateCardImage` 함수 추가.
- `CardNewsEditor.tsx` 우측 패널 — cover/outro 일 때만 "AI 재생성" 버튼 노출. 클릭 → 로딩 spinner → mutation 호출 → 성공 시 `cards[i].bg_image = "data:image/png;base64," + res.imageBase64` 로 patch. 에러 시 한 줄 에러 + "다시 시도".
- `CardNewsView.tsx` — `card.bg_image` 가 있으면 root `style.backgroundImage = url(bg_image)` + `backgroundSize: 'cover'`. 텍스트 가독성을 위해 절대 위치 overlay div(`background: rgba(0,0,0,0.35)`) 한 단을 텍스트 layer 바로 아래에 추가 — 기본 채택. 결과가 부족하면 카드별 dark/light 모드 분기 검토(본 phase 외).
- `types/index.ts` 에 `bg_image?: string` 필드 추가. `fromEditorCards` (useDraftAutosave.ts) 에서 strip.
- 검증: type-check + 수동 — `/new/edit` → 인스타 탭 → cover 카드 선택 → "AI 재생성" → 5~15s 대기 → 배경에 이미지 반영. 새로고침 → 단색으로 복귀.

### 4. frontend 텍스트 편집 갭 메우기
- `CardNewsEditor.tsx` — cover 선택 시 `tag` 입력(기존 `subtitle` 아래), outro 선택 시 `cta` 입력(기존 `body` 아래). "카드 추가" 버튼을 split → "카드 추가" 본문 + 작은 dropdown 으로 type 선택(cover/body/outro). 기본값 body.
- 검증: type-check + 수동 — cover/outro 입력 후 미리보기/PNG 에 반영, body 추가 시 새 카드 생성.

### 5. frontend `features/insta-preview/` 신규
- `InstaPreviewModal.tsx`, `InstaPreviewCard.tsx`, `cardsToZip.ts`, `slug.ts` 신규 작성. 모달은 Portal 사용(`createPortal`), focus trap 은 본 phase 에선 단순화(esc 키만 처리, tab cycling 생략).
- `DetailInsta.tsx` 와 `EditWorkspace.tsx` 두 곳에 "미리보기" 버튼 추가 + 모달 마운트.
- 검증: type-check + 수동 — 두 진입점 모두에서 모달이 열리고, 키보드 좌/우 / 클릭 / dot 으로 카드 전환. ESC 닫기.

### 6. frontend PNG zip 다운로드 결선
- `cardsToZip` 구현 — 보이지 않는 1080×1080 컨테이너에 `InstaPreviewCard` 를 한 장씩 렌더(React Portal 또는 same modal 의 hidden offscreen div), `html-to-image.toPng(node)` 호출, blob 8개를 jszip 으로 묶고 다운로드 트리거.
- 모달 하단 "전체 PNG 다운로드" 버튼 → `cardsToZip(cards, topicTitle)` 호출 + 로딩 indicator + 에러 토스트(부분 실패 시 zip 다운로드 X).
- 검증: type-check + 수동 — 모달 안 "다운로드" 클릭 → 8장 zip 받아짐. 압축 풀어 1080×1080 확인. AI 이미지 있는 cover/outro 도 정상 포함.

### 7. 통합 수동 검증 (`pnpm dev`)
- 시나리오 A — 텍스트 편집: `/new/edit` 인스타 탭 → cover 의 tag / outro 의 cta 입력 → 미리보기 모달에서 정상 표시.
- 시나리오 B — 카드 추가 type: "카드 추가 + body" 클릭 → body 카드 추가됨. type 을 cover 로 바꿔 추가 → cover 카드 추가됨.
- 시나리오 C — AI 재생성 (cover): cover 선택 → "AI 재생성" → 이미지 반영 → 미리보기 모달에서 배경 이미지로 표시 → PNG 다운로드 결과에도 포함.
- 시나리오 D — AI 재생성 (body): body 선택 시 "AI 재생성" 버튼 비활성 또는 숨김.
- 시나리오 E — 새로고침 후 AI 이미지 사라짐: cover 에 AI 이미지 반영 후 F5 → 단색 복귀. 안내 한 줄 표시.
- 시나리오 F — Gemini 실패 시: (테스트 위해 일시적으로 `GEMINI_API_KEY` 무효 값으로 바꿔) "AI 재생성" → 에러 메시지 + "다시 시도" 버튼.
- 시나리오 G — 라이브러리에서 진입: `/library/[id]` 인스타 탭 → "미리보기" → 모달 동일 동작, "전체 PNG 다운로드" 동작.
- 시나리오 H — PNG 파일 검증: 다운받은 zip 풀어 PNG 8장 모두 1080×1080, 텍스트 가독성 OK, AI 이미지 카드의 텍스트 overlay 가 충분히 보임.
- 시나리오 I — Phase 4/5 회귀: 블로그 편집 / autosave / drafts 리스트 / 상세 페이지 모두 변함없음.

### 8. design doc 갱신
- `docs/plans/2026-04-28-content-pipeline-saas-design.md` 의 `## 8. Plans` 표(또는 Phase 분배 섹션):
  - Phase 6 행을 본 plan 으로 갱신 (`카드뉴스 편집 + 인스타 미리보기 + AI 이미지 + PNG export`).
  - 표 아래 분배 재정렬 노트에 2026-05-15 한 줄 추가.
- `## 9. 결정 이력` 에 한 줄:
  - "**2026-05-15**: Phase 6 plan 확정. CardNewsEditor 텍스트 갭 메움 + 신규 features/insta-preview (모달 캐러셀 + html-to-image + jszip) + Gemini image-gen (나노바나나) 으로 cover/outro 카드 배경 즉석 생성. AI 이미지 영속화 = 클라 in-memory only — Storage(S3 vs Supabase) 결정과 body 카드 이미지 / 이미지 업로드는 추후 phase. DB 스키마 변경 없음."

---

## 완료 기준

- `pnpm --filter backend type-check`, `pnpm --filter frontend type-check` PASS
- `pnpm --filter frontend lint` PASS
- 시나리오 A~I 수동 검증 통과 (F 는 환경변수 임시 변경 — 검증 후 원복)
- 신규 dep `html-to-image`, `jszip` 만 추가됨 (다른 의도치 않은 dep 변화 없음)
- DB 스키마 변경 없음 — `supabase/migrations/` 신규 파일 없음
- Phase 1a 인증 / Phase 2 인터뷰 / Phase 3 양산 / Phase 4 블로그 편집 / Phase 5 대시보드/라이브러리 회귀 없음

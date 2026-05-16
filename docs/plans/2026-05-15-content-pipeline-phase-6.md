# Phase 6 — 카드뉴스 편집 마감 + AI 이미지 + PNG export

**목표**: Phase 4 에서 골격까지 만든 `CardNewsEditor` 의 텍스트 편집 갭을 채우고, 본인이 양산한 카드뉴스의 배경 이미지를 Gemini image-gen (또는 Pollinations / 로컬 업로드) 으로 즉석 생성하며, 8장을 1080×1080 PNG zip 으로 내려받을 수 있게 한다. dogfooding 시점에 "내가 만든 카드가 실제로 어떻게 보이는지" 와 "이 결과물을 내가 그대로 발행해도 되는지" 를 본인 눈으로 검증할 수 있게 만든다. 실제 인스타 발행(Graph API / n8n / Storage) 은 Phase 7 책임 — 본 phase 는 발행 직전 단계까지.

**아키텍처 한 줄**: backend = `POST /api/drafts/:id/cards/:index/regenerate-image` 신설(Gemini image-gen, base64 응답). frontend = `CardNewsEditor` 텍스트 갭 채움 + 신규 캡처 전용 `InstaPreviewCard` (off-screen 1080×1080 렌더) + `cardsToZip` (html-to-image + jszip) + 클라 in-memory 카드 `bg_image` data URL. DB 스키마 / Storage 변경 없음.

**스택**: 기존 동일. 신규 dep —
- backend: 없음 (`@google/generative-ai ^0.24` 의 image 출력 지원 활용 — 모델 ID 는 구현 시점 Gemini docs 확인. 후보: `gemini-2.5-flash-image-preview` 계열. 출력 안정성 이슈 시 `@google/genai` 신규 SDK 교체 검토)
- frontend: `html-to-image`, `jszip`

**디자인 레퍼런스**: 카드뉴스 편집 화면은 `claude_design/design_handoff_content_pipeline/README.md` 의 "화면 4 — 새 콘텐츠 / 편집" 그대로. PNG 다운로드 버튼은 헤더 actions 영역(현재 "다음 — 발행" 옆 / DetailInsta 상단 actions) 에 배치.

**Out-of-scope**:
- Storage 셋업 (S3 / Supabase Storage) — 추후 별도 phase 에서 S3 vs Supabase 선택 + bucket / signed URL / RLS 정책 결정
- 캡션 자동 생성 / 편집 — 발행 phase 묶음 (현재 `DetailInsta` mock 그대로)
- 인스타 발행 자체 (Graph API / n8n 워크플로우 / 실 채널 송출) — Phase 7
- DB 스키마 변경 / 마이그레이션 — drafts 테이블 그대로
- 배경 이미지의 영속성 — 의도된 in-memory only (AI 재생성 / 로컬 업로드 둘 다). 새로고침 시 사라짐 → 다시 생성/업로드 (사용자 안내 필요). Storage 연동은 추후 phase
- **인스타 미리보기 모달 / 캐러셀** — 그리드 8장 동시 표시로 충분히 검증 가능하다는 판단(2026-05-16 결정). 단일 카드 확대 뷰 / swipe 시뮬레이션 없음. PNG 다운로드는 헤더 actions 버튼이 직접 트리거.

**도메인 결정 뒤집기 (2026-05-16 기록):**
- 원래 plan 에선 (1) "AI 이미지 생성 대상 = cover/outro 카드만" (2) "이미지 업로드 = Storage 결정 후 별도 phase" (3) "인스타 미리보기 모달 + swipe 캐러셀" 이었으나 — dogfooding 진입 직전 본인 판단으로 (1) body 카드도 AI 재생성 허용 (2) 로컬 파일 업로드 부활 (FileReader → data URL, AI 와 동일 in-memory) (3) 캐러셀 제거, 그리드 8장으로 충분, PNG zip 다운로드만 헤더 actions 로 유지. Storage 연동은 동일하게 추후 phase.

---

## 사전 작업

- Phase 5 까지 머지된 상태. drafts / topics 스키마 그대로 사용.
- backend `DraftsModule` 에 라우트 추가만 — 새 모듈 / 새 entity / 새 마이그레이션 없음.
- frontend 신규 dep 2개 (`html-to-image`, `jszip`) `pnpm --filter frontend add` 로 추가.
- env / 인프라 변경 없음. `GEMINI_API_KEY` 그대로 재활용.

---

## 도메인 결정 (lock-in)

### 1. 배경 이미지 영속화 = in-memory only
- Gemini/Flux 응답 base64 → frontend React state 에만 보관 → 카드 컨테이너 `background-image` 로 렌더. 로컬 파일 업로드도 동일하게 `FileReader.readAsDataURL` 결과를 같은 자리에 박음.
- DB 저장 X. drafts 테이블 / `card_news` JSON 컬럼 변경 없음. `fromEditorCards` 가 `bg_image` 필드를 strip 해 autosave payload 에서 제외.
- 새로고침 → 배경 이미지 사라짐 → 단색 배경으로 복귀. UI 상 "새로고침 시 사라져요" 안내 한 줄 표시.
- 사유 — Storage 결정을 Phase 7 까지 미룬 메모리 룰 [project_infra_defer](project_infra_defer) 준수. 임시 base64-in-DB 는 row 부피 부담 + 추후 Storage 이관 시 마이그레이션 추가 → in-memory 가 가장 깔끔.

### 2. AI 이미지 생성 대상 = 모든 카드 (2026-05-16 변경)
- cover / body / outro 전부 AI 재생성 가능. 본인 dogfooding 직전 옵션을 좁히지 않는 게 더 가치 있다는 판단.
- 백엔드 endpoint 에서 type 가드 없음 — index 범위만 검증.
- 비용 — 카드별 사용자 명시적 클릭 단위 호출이라 8장 × image 호출 같은 일괄 비용 우려는 약함.
- prompt 빌더는 cover/body/outro 세 type 분기. body 는 title + body 기반 요지로 일러스트 톤 생성.

### 3. 카드 타입 전환 UX
- "카드 추가" 버튼이 type select (cover/body/outro) 와 함께 노출. 기본값 = `body`.
- 기존 카드의 type 전환은 본 phase 스코프 외 (사용자 양산 결과를 그대로 다듬는 흐름이 자연스러움 — type 강제 변경은 데이터 손실 위험).
- cover 는 보통 1장, outro 는 1장만 의미 있으므로 추가 시점 UI 에서 "이미 있어요" 안내 정도만.

### 4. 카드 텍스트 편집 보강 범위
- cover 카드 선택 시: 우측 패널에 `subtitle` 외에 `tag` 입력 필드 추가 (e.g. "Beta · 12.4").
- outro 카드 선택 시: 우측 패널에 `body` 외에 `cta` 입력 필드 추가 (e.g. "→ Link in bio").
- body 카드 선택 시: 기존 `title` + `body` 그대로.
- "이미지 업로드" placeholder 버튼 → 제거. "AI 재생성" placeholder 버튼 → 동작 결선 + cover/outro 선택 시에만 노출.

### 5. PNG 다운로드 — 트리거 위치 (2026-05-16 캐러셀 폐기 후)
- 트리거 2곳:
  - `DetailInsta` (라이브러리에서 카드 진입 후 인스타 탭) 의 상단 actions
  - `EditWorkspace` 의 인스타 탭 헤더 영역 ("다음 — 발행" 옆)
- 동작: 버튼 클릭 → off-screen 1080×1080 컨테이너에 카드 8장 순차 렌더 → 각각 html-to-image 캡처 → jszip 으로 묶고 다운로드 트리거.
- 인스타 swipe 미리보기 모달은 폐기 — 그리드(`CardNewsEditor` 의 카드 그리드)가 8장을 동시 표시해 사실상 미리보기 역할을 함.

### 6. PNG 다운로드 — 파일 명 / 압축 방식
- zip 안 파일명: `card-01.png` ~ `card-08.png` (1-padded 2자리).
- zip 파일명: `<topic-title slug>.zip` — 한글/특수문자 → `slugify` 단순 변환 (공백 → -, 특수문자 제거). slug 빈 결과면 `cardnews-<draft-id-앞 8자>.zip` 폴백.
- 카드 8장 가정이지만 실제 `cards.length` 따름 (양산 결과가 더 적/많으면 그만큼).

### 7. HTML→PNG 렌더 방식 = html-to-image
- 비교 대안: satori (JSX→SVG, render layer 재작성 부담), native Canvas 2D (그리기 코드 직접 작성), html2canvas (font/css quirks 알려짐).
- 채택 사유 — 기존 `CardNewsView` 컴포넌트가 inline `style={{ background: card.bg }}` 로 색을 박고 있어 Tailwind CSS var 의존이 없음 → snapshot 안정성 좋음. dep ~16KB. 코드 재사용 100%.
- 캡처 대상 = `InstaPreviewCard` 신규 컴포넌트 (1080×1080 고정, `CardNewsView` 와 동일 레이아웃이되 폰트/사이즈만 1080 기준으로 스케일). 화면에는 렌더되지 않고 캡처 직전에만 off-screen 컨테이너(`position: fixed; left: -99999px`)에 잠깐 마운트 후 캡처 → 언마운트.

### 8. Gemini image-gen prompt 가드레일
- 메모리 [llm_content_guardrails](llm_content_guardrails) 적용. SYSTEM 에:
  - "주어진 topic / 카드 텍스트 외에 사실/디테일 추가 금지. 보지 못한 인물·장소·날짜 묘사 X."
  - "정치·종교·시사·특정 인물 비판/풍자 회피. 사람 얼굴이나 식별 가능한 인물 묘사 회피 — 분위기/일러스트 톤만."
  - "카드뉴스 스타일: 미니멀, 부드러운 색조, 한국 인스타 피드 톤. 텍스트 렌더링 시도 X (텍스트는 카드 본문이 책임)."
- 사용자 프롬프트 = `topic.title` + `card.title` + `card.body|subtitle` 요약. 인터뷰 transcript 전체는 보내지 않음 (privacy + 토큰 절약).

### 9. 에러 처리
- AI 이미지 생성 실패(Gemini timeout / quota / safety filter / Pollinations abort) → 카드 편집 패널 안 한 줄 에러 + "다시 시도" 버튼. 카드 자체는 단색 배경 유지.
- PNG zip 생성 중 일부 카드 캡처 실패 → 헤더 PNG 버튼 옆 토스트("카드 N장 캡처 실패 — 다시 시도해주세요"), 부분 zip 다운로드 안 함 (전체 성공 시에만 다운로드).
- zip 생성 도중 페이지 이동 시 — off-screen 컨테이너 unmount 로 캡처 중단 가능성. 사용자가 페이지 이동 전 zip 다운로드 끝나는지 명시적 라우팅 가드는 안 둠 (autosave 의 dirty 가드와 별개).

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
  response 400: index 범위 초과 / draft status != ready
  response 404: draft 없음 / 소유자 아님
  response 503: 이미지 생성 실패 (Gemini 모델 폴백 모두 실패 / Flux 응답 비정상)
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
- `apps/frontend/src/features/detail/components/CardNewsEditor.tsx` — 우측 패널: cover 의 tag 필드 / outro 의 cta 필드 입력 추가. "카드 추가" 버튼 옆 type select(cover/body/outro). 이미지 박스에 "업로드" 버튼(로컬 파일 → FileReader → data URL → `bg_image`) + "AI 재생성" 버튼(mutation 결선) + "이미지 제거 → 단색" 토글. 모든 카드(cover/body/outro)에 노출. 결과(`bg_image` data URL) 를 카드에 반영, 단색 fallback 유지.
- `apps/frontend/src/features/detail/components/CardNewsView.tsx` — `bg_image` 가 있으면 `background-image: url(...)` 로 렌더, 없으면 기존 단색. text 렌더는 그대로.
- `apps/frontend/src/features/detail/components/DetailInsta.tsx` — 상단 actions 영역에 "PNG 다운로드" 버튼 추가 (`cardsToZip` 호출).
- `apps/frontend/src/features/new-content/components/EditWorkspace.tsx` — 인스타 탭 헤더("다음 — 발행" 옆)에 "PNG 다운로드" 버튼 추가.
- `apps/frontend/src/lib/api/drafts.ts` — `regenerateCardImage(draftId, cardIndex): Promise<{ imageBase64: string }>` 추가.
- `apps/frontend/src/lib/api/queryKeys.ts` — 본 phase 에선 query key 추가 없음 (image gen 은 mutation only).
- `apps/frontend/src/types/index.ts` — `CardNewsCard` 에 `bg_image?: string` (data URL) 추가. **DB 직렬화에선 제외** — 즉, draft PATCH 시 `card_news` 페이로드에 `bg_image` 가 포함되면 backend 가 무시하거나 frontend `fromEditorCards` adapter 가 strip. 안전을 위해 frontend adapter 에서 strip.
- `apps/frontend/src/features/new-content/hooks/useDraftAutosave.ts` — `fromEditorCards` 가 `bg_image` 필드도 strip 하도록 보강 (현재 `id` 만 strip 중).

**신규 (frontend)** — `features/insta-export/`
- `apps/frontend/src/features/insta-export/components/InstaPreviewCard.tsx` — 캡처 가능한 1080×1080 카드 1장. `CardNewsView` 와 동일한 레이아웃이되 폰트/사이즈만 1080 기준으로 스케일. `bg_image` 우선, 없으면 단색. 화면에는 안 보이고 캡처 직전 off-screen 마운트.
- `apps/frontend/src/features/insta-export/components/PngExportButton.tsx` — 헤더 actions 용 버튼. props: `cards: CardNewsCard[]`, `topicTitle: string`. 클릭 → `cardsToZip` 호출 + 로딩 indicator + 에러 토스트.
- `apps/frontend/src/features/insta-export/lib/cardsToZip.ts` — `cardsToZip(cards, topicTitle): Promise<void>` — off-screen 컨테이너 마운트(`position: fixed; left: -99999px`) + html-to-image + jszip + slugify + 다운로드 트리거 (browser `URL.createObjectURL` + `<a download>`).
- `apps/frontend/src/features/insta-export/lib/slug.ts` — `slugify(title): string` 한국어 보존(공백 → `-`, 특수문자 제거). 빈 결과 시 fallback 처리.

**제거**
- (없음 — 2026-05-16 결정 뒤집기로 "이미지 업로드 버튼 제거" 항목 폐기. 업로드는 로컬 파일 → in-memory data URL 패턴으로 살림.)

---

## Tasks

### 1. backend Gemini image-gen 메서드
- `gemini.service.ts` 에 `generateImage` 추가. 기존 폴백 패턴 재활용, 모델 리스트는 image-gen 가능한 모델만 (구현 시점 docs 확인하여 결정 — 후보 `gemini-2.5-flash-image-preview`). 응답에서 `inlineData` part 추출.
- 검증: backend `pnpm test` 없음 (메모리 [no_tests_in_prototype](no_tests_in_prototype)). 다음 task 의 수동 호출로 검증.

### 2. backend 라우트 + prompts
- `drafts.controller.ts` `@Post(':id/cards/:index/regenerate-image')` 추가. 401 / 403 / 404 / 400 분기 controller 단에서 명시.
- `drafts.service.regenerateCardImage` — draft 조회 → index 범위 가드 → prompts.buildCardImagePrompt → gemini.generateImage → 결과 그대로 반환. 응답 base64 가 비정상(예: 빈 문자열)이면 503 throw. (카드 type 가드는 도메인 결정 2 변경으로 제거.)
- `drafts.prompts.ts` 에 IMAGE_GEN_SYSTEM + buildCardImagePrompt 추가. cover/body/outro 세 분기 모두 처리. 가드레일 텍스트 도메인 결정 8 그대로.
- 검증: type-check + 수동 curl — `curl -X POST -H "Authorization: Bearer $TOKEN" .../drafts/$ID/cards/0/regenerate-image`. 응답이 `{ imageBase64: "..." }`, base64 디코드 후 image viewer 로 PNG 열리는지 확인.

### 3. frontend AI 재생성 + 로컬 업로드 결선
- `lib/api/drafts.ts` 에 `regenerateCardImage` 함수 추가.
- `CardNewsEditor.tsx` 우측 패널 — 모든 카드(cover/body/outro)에 이미지 박스 노출. "업로드"(로컬 파일 → FileReader → data URL) + "AI 재생성"(mutation) + "이미지 제거" 토글. 클릭 → 로딩 spinner → mutation 성공 시 `cards[i].bg_image = "data:image/png;base64," + res.imageBase64` 로 patch. 에러 시 한 줄 에러 + "다시 시도".
- `CardNewsView.tsx` — `card.bg_image` 가 있으면 root `style.backgroundImage = url(bg_image)` + `backgroundSize: 'cover'`. 텍스트 가독성을 위해 절대 위치 overlay div(`background: rgba(0,0,0,0.35)`) 한 단을 텍스트 layer 바로 아래에 추가 — 기본 채택. 결과가 부족하면 카드별 dark/light 모드 분기 검토(본 phase 외).
- `types/index.ts` 에 `bg_image?: string` 필드 추가. `fromEditorCards` (useDraftAutosave.ts) 에서 strip.
- 검증: type-check + 수동 — `/new/edit` → 인스타 탭 → 임의 카드 선택 → "AI 재생성" → 5~15s 대기 → 배경에 이미지 반영. 동일 카드에서 "업로드" → 로컬 이미지 즉시 반영. 새로고침 → 단색으로 복귀.

### 4. frontend 텍스트 편집 갭 메우기
- `CardNewsEditor.tsx` — cover 선택 시 `tag` 입력(기존 `subtitle` 아래), outro 선택 시 `cta` 입력(기존 `body` 아래). "카드 추가" 버튼을 split → "카드 추가" 본문 + 작은 dropdown 으로 type 선택(cover/body/outro). 기본값 body.
- 검증: type-check + 수동 — cover/outro 입력 후 미리보기/PNG 에 반영, body 추가 시 새 카드 생성.

### 5. frontend `features/insta-export/` 캡처 컴포넌트
- `InstaPreviewCard.tsx`, `slug.ts` 신규 작성. `InstaPreviewCard` 는 `CardNewsView` 와 동일한 컴포넌트 트리이되 root 크기를 1080×1080 고정 + 폰트/패딩을 1080 기준으로 스케일.
- 검증: type-check.

### 6. frontend PNG zip 다운로드 결선
- `cardsToZip` 구현 — 보이지 않는 1080×1080 컨테이너(off-screen positioning, React Portal 사용)에 `InstaPreviewCard` 를 한 장씩 렌더, `html-to-image.toPng(node)` 호출, blob 8개를 jszip 으로 묶고 다운로드 트리거.
- `PngExportButton.tsx` — `cardsToZip(cards, topicTitle)` 호출 + 로딩 indicator + 에러 토스트(부분 실패 시 zip 다운로드 X).
- `DetailInsta.tsx` 상단 actions / `EditWorkspace.tsx` 인스타 탭 헤더 두 곳에 `PngExportButton` 마운트.
- 검증: type-check + 수동 — 두 진입점 모두에서 "PNG 다운로드" 클릭 → 카드 수만큼 zip 받아짐. 압축 풀어 1080×1080 확인. AI 이미지 / 로컬 업로드 이미지 카드도 정상 포함.

### 7. 통합 수동 검증 (`pnpm dev`)
- 시나리오 A — 텍스트 편집: `/new/edit` 인스타 탭 → cover 의 tag / outro 의 cta 입력 → 그리드 카드에서 정상 표시.
- 시나리오 B — 카드 추가 type: "카드 추가 + body" 클릭 → body 카드 추가됨. type 을 cover 로 바꿔 추가 → cover 카드 추가됨.
- 시나리오 C — AI 재생성 (cover): cover 선택 → "AI 재생성" → 그리드에 이미지 배경 반영 → PNG 다운로드 결과에도 포함.
- 시나리오 D — AI 재생성 (body / outro): body / outro 카드도 동일하게 "AI 재생성" 동작 + 단색 fallback 유지.
- 시나리오 D' — 로컬 업로드: 임의 카드 선택 → "업로드" → 로컬 PNG/JPG 선택 → 즉시 배경 반영. 새로고침 → 사라짐.
- 시나리오 E — 새로고침 후 이미지 사라짐: 임의 카드에 이미지(AI/업로드) 반영 후 F5 → 단색 복귀. 안내 한 줄 표시.
- 시나리오 F — AI 재생성 실패 시: Pollinations abort / Gemini quota 등 외부 실패 → 에러 메시지 + "다시 시도" 버튼 + 카드 단색 유지.
- 시나리오 G — 라이브러리에서 진입: `/library/[id]` 인스타 탭 → 상단 "PNG 다운로드" 버튼 클릭 → zip 다운로드.
- 시나리오 H — PNG 파일 검증: 다운받은 zip 풀어 PNG 모두 1080×1080, 텍스트 가독성 OK, AI 이미지 카드의 텍스트 overlay 가 충분히 보임.
- 시나리오 I — Phase 4/5 회귀: 블로그 편집 / autosave / drafts 리스트 / 상세 페이지 모두 변함없음.

### 8. design doc 갱신
- `docs/plans/2026-04-28-content-pipeline-saas-design.md` 의 `## 8. Plans` 표(또는 Phase 분배 섹션):
  - Phase 6 행을 본 plan 으로 갱신 (`카드뉴스 편집 + AI 이미지 + PNG export`).
  - 표 아래 분배 재정렬 노트에 2026-05-16 한 줄 추가.
- `## 9. 결정 이력` 에 한 줄:
  - "**2026-05-16**: Phase 6 마감. CardNewsEditor 텍스트 갭(cover tag / outro cta / 카드 추가 type select) 메움 + 모든 카드(cover/body/outro)에 AI 재생성 + 로컬 업로드(FileReader → data URL, in-memory) + features/insta-export 의 1080 캡처 컴포넌트 + html-to-image + jszip 로 PNG zip 헤더 actions 다운로드. backend image-gen 은 stub / pollinations / gemini 3-mode env switch (현 검증은 pollinations). 인스타 swipe 캐러셀은 제거 — 그리드 8장 동시 표시로 충분. AI 이미지 영속화 = 클라 in-memory only, Storage 연동은 추후 phase."

---

## 완료 기준

- `pnpm --filter backend type-check`, `pnpm --filter frontend type-check` PASS
- `pnpm --filter frontend lint` PASS
- 시나리오 A~I 수동 검증 통과 (F 는 환경변수 임시 변경 — 검증 후 원복)
- 신규 dep `html-to-image`, `jszip` 만 추가됨 (다른 의도치 않은 dep 변화 없음)
- DB 스키마 변경 없음 — `supabase/migrations/` 신규 파일 없음
- Phase 1a 인증 / Phase 2 인터뷰 / Phase 3 양산 / Phase 4 블로그 편집 / Phase 5 대시보드/라이브러리 회귀 없음

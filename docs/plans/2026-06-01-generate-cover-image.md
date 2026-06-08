# 양산 시 첫 카드 cover 자동 생성

**목표**: `POST /api/drafts/generate` 양산 흐름에 **첫 카드(`cards[0]`) cover 이미지 자동 생성**을 추가한다. 현재 양산은 카드/블로그 *텍스트*만 만들고 cover 이미지는 `regenerateCardImage`(사용자 수동 재생성) 경로에만 있어, "주제 한 줄 → 완성된 카드뉴스 묶음" 이라는 제품 핵심 흐름이 끊겨 있다. 이 갭을 메워 양산 직후 첫 카드에 AI cover 가 채워진 상태로 `ready` 되게 한다.

**아키텍처 한 줄**: `regenerateCardImage` 내부의 "프롬프트 빌드 → `llm.generateImage` → `storage.uploadCardImage` → URL" 코어 3스텝을 ready 검증 없는 private 헬퍼로 추출하고, `generate()` 가 카드 텍스트 확정 직후 `markReady` 전에 이 헬퍼로 `cards[0].bg_image` 를 채운다. 이미지 생성 실패는 내부에서 삼켜 텍스트 양산은 살린다.

**Out-of-scope**:
- 첫 카드 외 나머지 카드 cover (수동 재생성 그대로) — 비용/지연 트레이드오프상 첫 카드만
- 프론트엔드 코드/타입 변경 (`bg_image` 는 이미 카드 스키마 + 상세/편집 뷰 렌더링 존재)
- DB 마이그레이션 / 스키마 변경 (`card_news[*].bg_image` 이미 존재)
- 라우트 추가/삭제 (`generate` / `regenerate-image` 시그니처 보존)
- 캡션 자동생성(B-04), 양산 진행 UX 변경 (기존 `useGenerateProgressSteps` 가짜 스텝 그대로)

---

## 도메인 결정 (lock-in)

### 1. cover 범위 = 첫 카드(`cards[0]`)만
- 양산 1회당 이미지 생성 1장. 나머지 카드는 사용자가 필요 시 기존 `regenerateCardImage` 로 채움.
- 사유: 카드 8장 전부 생성하면 양산 지연 ~8배 + 비용 8배. 첫 카드(표지) cover 만으로 "완성된 묶음" 첫인상 충족.

### 2. 이미지 생성 실패 → 텍스트 우선 보존 (cover 만 비움)
- cover 생성 블록을 `try/catch` 로 감싸 실패 시 `logger.warn` 만 남기고 `bg_image` 없이 진행 → draft 는 정상 `ready`.
- 기존 텍스트 생성 실패 경로(`markFailed` → status `failed`)는 불변. **카드/블로그 텍스트 실패만 양산 실패로 간주**.
- 사유: gpt-image-1 은 텍스트보다 느리고 실패율이 높다. 이미지 1장 때문에 완주한 텍스트 양산물을 버리지 않는다. 사용자는 cover 없이 ready 된 뒤 수동 재생성으로 보완 가능.

### 3. 프롬프트/저장 재사용 = 기존 코어 헬퍼 공유
- cover 프롬프트는 `regenerateCardImage` 와 동일하게 `IMAGE_GEN_SYSTEM` + `buildCardImagePrompt(card, topicTitle)` 사용. 새 프롬프트 정의 없음.
- Storage 경로/contentType 도 `storage.uploadCardImage`(cardIndex=0, `image/png`) 그대로.
- 사유: 동일 도메인 동일 산출물. 분기/중복 없이 한 코어로.

---

## 변경 대상 파일

- `apps/backend/src/drafts/drafts.service.ts`
  - **신규 private 헬퍼** (가칭 `renderCardImage`): `(userId, draftId, cardIndex, card, topicTitle) → Promise<imageUrl>`. 현재 `regenerateCardImage` 191~204행의 프롬프트 빌드 + `generateImage` + `uploadCardImage` 로직을 그대로 이전.
  - `regenerateCardImage`: ready 검증(`requireOwnedReadyDraftForCard`) 후 위 헬퍼 호출하도록 리팩터. 동작 동일.
  - `generate()`: 카드 텍스트 확정(현 133행 `cardResult`) 직후, `markReady` 전에 `cards[0]` 으로 헬퍼 호출 → 성공 시 `cards[0] = { ...cards[0], bg_image: imageUrl }`. `try/catch` 로 격리. 갱신된 `cards` 를 `markReady` 에 전달.
- 그 외 파일 변경 없음 (프론트/스키마/라우트/DB).

---

## 검증

[[feedback_no_tests_in_prototype]] — jest spec 안 씀. 검증은 type-check + 수동 시나리오.

- `pnpm --filter backend type-check` 통과 (헬퍼 시그니처 / `cards[0]` 불변 갱신 타입).
- `pnpm lint` 통과.
- 수동 시나리오 (로컬 dogfooding 환경):
  1. **정상**: 인터뷰 완료 → 양산 → 상세/편집 진입 시 첫 카드에 AI cover 표시. DB `drafts.card_news[0].bg_image` 가 Storage public URL.
  2. **이미지 실패 격리**: (의도적 실패 유도 — 예: 잘못된 `OPENAI_API_KEY` 또는 image 호출만 일시 차단) 양산이 `failed` 가 아니라 `ready` 로 끝나고 첫 카드 `bg_image` 만 비어 있음. 이후 수동 재생성 정상.
  3. **회귀**: 기존 `regenerateCardImage`(카드별 수동 재생성) / `uploadCardImage`(업로드) 동작 불변.

---

## 분기/리스크

- **양산 지연 증가**: cover 생성만큼(~10–30s) `generate` 응답이 느려짐. 프론트는 기존 가짜 진행 스텝(`useGenerateProgressSteps`)이 흡수 — 별도 UX 작업 없음. (체감 과도하면 추후 비동기화 검토는 별도 backlog.)
- **헬퍼 시그니처**: `renderCardImage` 가 `card` 와 `topicTitle` 을 인자로 받게 해 generate(아직 ready 아님)와 regenerate(ready) 양쪽에서 호출 가능하게 함 — ready 검증을 헬퍼 밖으로 뺀 것이 핵심.

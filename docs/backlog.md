# Backlog — Out-of-scope / 후속 작업 모음

Phase 단위 plan 과 별개로 "지금은 안 하지만 잊으면 안 되는" 항목 모음. plan 폴더는 phase 단위 일자별 plan 만 두고, 본 문서는 phase 간 라이프사이클 무관한 follow-up 을 보관.

각 항목은 (1) 트리거 phase / 결정일 (2) 본질 / 의도 (3) 작업 단위 후보 (4) 미루는 사유 — 4 줄로 정리. 실제 phase 진입 시 별도 plan 으로 분리.

---

## 카드뉴스 편집 / 미리보기

### B-01. 배경 이미지 영속화 (Storage 도입)
- **결정일**: 2026-05-15 (Phase 6 plan 확정)
- **본질**: AI 재생성 / 로컬 업로드로 만든 `bg_image` 가 현재 클라 in-memory only. 새로고침 시 사라지고, 발행 시점에는 PNG export 로만 산출물 확보.
- **작업 단위 후보**: (1) Supabase Storage vs S3 결정, (2) bucket / signed URL / RLS 정책, (3) `drafts.card_news` JSON 의 `bg_image` 가 URL 참조로 바뀜, (4) 업로드/AI 재생성 endpoint 가 Storage 에 upload 후 URL 반환, (5) frontend `CardImageBox` 가 data URL → URL 로 전환.
- **미루는 사유**: 인프라(Phase 1b) 결정 직후에 통합으로 다뤄야 vendor lock-in / cost 비교가 정합. dogfooding 단계엔 in-memory 로 충분.

### B-02. 사진 위치 조절 (background-position / crop)
- **결정일**: 2026-05-16 (Phase 6 진행 중)
- **본질**: 현재 `backgroundSize: 'cover', backgroundPosition: 'center'` 고정. 사용자가 이미지의 어느 부분이 카드에 보일지 못 정함.
- **작업 단위 후보**: (1) 가벼운 — `CardImageBox` 안에 X/Y 슬라이더 두 개, `card.bg_image_pos: {x: %, y: %}` 추가, (2) 중간 — 카드 cell 의 이미지를 drag 로 위치 조절, (3) 큰 — `react-image-crop` 도입해 실제 1080×1080 crop UI.
- **미루는 사유**: Phase 6 dogfooding 진입을 우선 — 위치 조절 없이도 cover 패턴이 대부분 케이스 커버.

### B-03. 인스타 swipe 미리보기 모달 / 캐러셀
- **결정일**: 2026-05-16 (Phase 6 결정 뒤집기로 폐기)
- **본질**: 원 plan 에 있던 "1080 카드 1장씩 swipe 모달 + dot indicator + 키보드 ←/→/ESC". Phase 6 진행 중 "그리드 8장 동시 표시로 충분" 판단으로 폐기.
- **작업 단위 후보**: 후행 dogfooding 결과 "swipe 톤 확인이 진짜 필요" 라 판단되면 부활. `features/insta-export/` 의 `InstaPreviewCard` 를 재사용해 모달 셸만 추가하면 됨.
- **미루는 사유**: 사용자(=본인) dogfooding 단계엔 그리드만으로 톤 검증 가능하다 판단. 진짜 인스타 발행 후 사용자 피드백 받아 재검토.

### B-04. 캡션 자동 생성 / 편집
- **결정일**: 2026-04-28 (Phase 6 plan 도 동일 명시)
- **본질**: `DetailInsta` 의 캡션이 현재 mock(`CAPTION_MOCK`). 실제 인스타 발행 시 캡션은 카드뉴스 본문과 별도 LLM 호출로 생성하거나, 사용자가 직접 작성.
- **작업 단위 후보**: (1) backend prompt 신설 — title + body + transcript 기반 캡션 생성, (2) `drafts` 테이블에 `caption` 컬럼 또는 별도 caption 테이블, (3) `DetailInsta` 가 mock 대신 실데이터 + 편집 UI.
- **미루는 사유**: 발행 phase (Meta Graph API 통합) 시점에 captions API 와 함께 처리하는 게 정합.

---

## UX / 라우팅

### B-05. 탭별 URL 라우팅 (깊은 링크 / 뒤로가기)
- **결정일**: 2026-05-16 (Phase 6 진행 중 사용자 요청)
- **본질**: `/new/edit` 의 인스타/블로그 + `/library/[id]` 의 overview/insta/blog/activity 탭이 모두 `useState` 로만 관리. URL 미반영 → 깊은 링크 X, 새로고침 시 첫 탭 reset, 뒤로가기/공유 무용.
- **작업 단위 후보**: (1) dynamic segment 패턴 — `/library/[id]/[tab]` 폴더 트리 재배치 (`LibraryItemEditContent` 가 이미 `/edit/[mode]` 채택이라 일관), (2) 또는 가벼운 query param — `?tab=insta` + router.replace.
- **미루는 사유**: Phase 6 스코프 외. UX 개선이라 별도 single-day phase 로 묶을 수 있음.
- 메모리: [project-tab-routing-backlog](/Users/dawoon/.claude/projects/-Users-dawoon-Desktop-dev-content-pipeline/memory/project_tab_routing_backlog.md)

### B-06. CardNewsEditor 의 placeholder text 처리
- **결정일**: 2026-05-16 (review-fe 추가 제안)
- **본질**: `addCard('cover')` 시 `title='표지\n제목'`, `tag='@핸들'` 등 placeholder text 가 실제 value 로 들어감. 사용자가 안 바꾸면 PNG 에 그대로 박힘. 자동 편집 진입 / textarea placeholder 속성 활용 / zod min(1) 완화 등 조합 필요.
- **작업 단위 후보**: (1) backend cardNewsEditSchema 의 `title.min(1)` → `min(0)`, (2) addCard 가 빈 string 만 주고 사용자가 입력하도록, (3) UI 가 placeholder 속성으로 cue 제공.
- **미루는 사유**: 동작은 정상, UX 미세 조정 항목.

---

## 인프라 / Provider

### B-07. LLM provider 마이그레이션 (Gemini → OpenAI)
- **결정일**: 2026-05-16 (별도 plan 작성)
- **plan**: [docs/plans/2026-05-16-llm-migration-openai.md](./plans/2026-05-16-llm-migration-openai.md)
- **본질**: 인터뷰 / 양산 / 카드 이미지 생성 모두 OpenAI (gpt-5 + gpt-image-1) 로 통일.
- **상태**: Phase 7 로 schedule. design doc Plans 표의 새 Phase 7.

### B-08. Storage 결정 — Supabase Storage vs S3
- **연동 항목**: B-01 (배경 이미지 영속화)
- **본질**: 영속화 대상 — 카드 배경 이미지 (이번 phase) / 향후 사용자 업로드 다른 자산 / 발행 산출물 (PNG) 등.
- **작업 단위 후보**: (1) Supabase Storage — 인증과 RLS 동일 시스템, vendor lock-in ↑. (2) S3 — 표준화, 다양한 CDN/엣지 호환, 가격 유연. 
- **미루는 사유**: 인프라(Phase 1b) 결정과 묶어 발행 진입 직전에 결정.

---

## 코드 품질

### B-09. MIN/MAX_CARDS 상수 frontend/backend 공유
- **결정일**: 2026-05-16 (review-fe 결과)
- **본질**: `CardNewsEditor` 의 `MIN_CARDS=1 / MAX_CARDS=8` 와 backend `cardNewsEditSchema.min(1).max(8)` 가 각자 정의. 한쪽만 변경 시 다른 쪽 깨짐 (이전 incident 패턴).
- **작업 단위 후보**: `packages/shared` 또는 backend types 자동 생성으로 공유. 또는 도메인 상수 한 곳에서만 정의 후 export.
- **미루는 사유**: 본 phase 스코프 외, 후속 drift 발생 시 우선순위 ↑.

### B-10. cardsToZip 진행률 / cancellation
- **결정일**: 2026-05-16 (review-fe 추가 제안)
- **본질**: 카드 수 늘어나면 캡처 루프가 main thread 점유. 사용자가 "3/8 캡처 중" 같은 progress 없음 + 도중 취소 불가.
- **작업 단위 후보**: (1) onProgress(i, total) 콜백 추가, (2) AbortController 전달해 사용자가 취소 가능, (3) 카드 사이 requestAnimationFrame.
- **미루는 사유**: 현재 카드 수 ≤ 8 이라 체감 부담 적음. 자유 카드 수 확장 시 우선순위 ↑.

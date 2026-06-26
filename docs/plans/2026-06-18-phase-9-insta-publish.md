# Phase 9 — 인스타 자동 발행 (구현 계획)

> **For agentic workers:** 본 계획은 프로젝트 컨벤션을 따른다 — (1) 프로토타입 단계라 **jest spec 없음**([[feedback_no_tests_in_prototype]]), 검증 = `type-check` + 수동 라운드트립(n8n echo → 실연동). (2) plan 문서는 **의도·파일·검증·분기 수준까지만**, 코드 본체는 실행 단계에서([[feedback_plan_no_code]]). 작업 시작은 명시적 GO 신호 후([[feedback_work_requires_approval]]).

**목표**: Phase 8-1 의 발행 큐/워커/트리거/콜백(echo 스텁) 위에, **인스타 캐러셀 실발행**을 배선한다. 발행 클릭 → 최종 카드 8장을 클라이언트에서 렌더·업로드 → 공개 URL + 캡션을 `job.payload` 스냅샷 → 워커가 n8n 인스타 워크플로우로 트리거 → Graph API 캐러셀 게시 → media id 콜백으로 `published`.

**아키텍처 한 줄**:
- 최종 합성 카드 PNG 는 **클라이언트 렌더(`InstaPreviewCard`) → Storage 업로드**(서버 렌더링 인프라 0, 에디터와 WYSIWYG 동일).
- 발행 클릭 시점의 이미지·캡션을 **`job.payload` 에 스냅샷** → 이후 draft 수정해도 진행 중 발행 불변.
- IG 액세스 토큰/계정 ID 는 **n8n credential** — 백엔드/payload/로그에 토큰이 안 닿음.
- n8n 은 replaceable 실행 엔진. 트리거 인터페이스(`PublishTrigger`)·콜백(`/webhook/publish-result`)은 8-1 그대로 재사용, payload 만 구체화.
- 단일 진실 원천 spec: [`2026-06-18-phase-9-insta-publish-design.md`](./2026-06-18-phase-9-insta-publish-design.md).

**Out-of-scope** (의도적 제외):
- **예약발행** — 즉시발행만(Phase 8-2 정합). backlog.
- **멀티유저 토큰 관리**(우리 DB 암호화 저장) — dogfooding 단일 사용자엔 n8n credential 로 충분.
- **네이버 자동 발행** — Phase 10 으로 미룸.
- **단일 이미지 포스트** — 카드 1장 draft 는 캐러셀 불가, 발행 거부(400). 실 흐름은 항상 8장.

## Global Constraints
- 마이그레이션: `supabase/migrations/` raw SQL, 네이밍 `2026MMDD000001_*.sql`. 적용은 Dashboard SQL Editor 또는 MCP `apply_migration`.
- 채널 값: 백엔드 `'naver' | 'instagram'`, 프론트 `'naver' | 'insta'` — 매핑은 `lib/api/publish.ts` 한 곳(8-1/8-2 기존 규칙 답습).
- Storage 버킷 `card-images`, 공개 URL. 최종 합성 카드는 `<userId>/<draftId>/publish/<idx>-<ts>.png`(bg_image 와 폴더 분리).
- 인스타 캐러셀 요건: 이미지 **2~10장**.
- 콘텐츠 가드레일·LLM 무관(렌더만, 신규 생성 없음).

---

## 도메인/UX 결정 (lock-in)

### 1. 발행 데이터 스냅샷 = `job.payload`
- `publish_jobs.payload jsonb` 신설. 인스타 형태 `{ caption: string, images: string[] }`.
- caption 은 **백엔드가 `draft.caption` 에서 스냅샷**(프론트 미전송). images 는 프론트가 업로드 후 URL 배열로 전송.
- 사유: 발행 시점 콘텐츠 고정 → 이후 편집과 격리. 트리거가 더이상 `{}` 스텁 아님.

### 2. 이미지 업로드 → URL → 발행 (2-step, 원자성은 가드로)
- 프론트가 최종 PNG 를 **먼저 업로드**(기존 `POST /drafts/:id/images` 재사용, `publish/` 서브폴더)해 URL 확보 → `POST /drafts/:id/publish { channels:['instagram'], images:[url…] }`.
- 백엔드는 `images` 각 URL 이 **해당 버킷 public base 로 시작**하는지 검증(임의 URL 캐러셀 주입 차단). 아니면 400.
- 사유: 발행 엔드포인트를 JSON 유지(네이버와 균일), 업로드는 기존 경로 재사용. 고아 업로드는 timestamp 경로라 무해(YAGNI — 정리 작업 별도).

### 3. 발행 가드 (인스타)
- `draft.caption` 이 null/빈 문자열 → 400 "캡션이 필요합니다".
- `images` 가 2장 미만 또는 10장 초과 → 400.
- 프론트도 동일 가드로 버튼 disabled + 안내(서버 도달 전 차단).

### 4. n8n 인스타 워크플로우 (replaceable)
- webhook 수신 → HMAC 검증(8-1 가드와 동일 비밀) → `payload.images` 순회 `is_carousel_item` 미디어 컨테이너 생성 → 캐러셀 컨테이너 생성 → publish → IG media id.
- 성공 → 콜백 `{ jobId, status:'published', externalRef: <media id> }`. 실패 → `{ status:'failed', error }`.
- IG 토큰/계정 ID = n8n credential. 워크플로우는 우리 레포 밖(n8n UI) — 본 계획은 echo 검증까지 코드로 보장하고, 실 워크플로우는 별도 export JSON 으로 기록.

---

## 작업 단위

> 코드 본체는 실행 단계에서. 여기는 파일·의도·검증까지. 백엔드 → 프론트 → n8n 순.

### B1. 마이그레이션 — `payload` 컬럼
- Create: `supabase/migrations/20260618000001_phase9_publish_jobs_payload.sql` — `ALTER TABLE publish_jobs ADD COLUMN payload jsonb` (nullable, default 없음).
- 적용 후 `apps/backend/src/supabase/database.types.ts` 의 `publish_jobs` Row/Insert/Update 에 `payload` 반영(MCP `generate_typescript_types` 또는 수기).
- 검증: `pnpm --filter backend type-check`.

### B2. 스키마 — payload 형태 + 발행 입력 확장
- Modify: `apps/backend/src/publish/publish.schema.ts`
  - `instagramPayloadSchema = { caption: string(min1), images: string().url() 배열 min2 max10 }` 신설.
  - `triggerPayloadSchema.payload` 를 `z.record` 스텁 → 채널별 구체화(인스타 = `instagramPayloadSchema`).
  - `createPublishSchema` 확장: `images?: string[]` (인스타 채널일 때 필수, 2~10). 채널/이미지 동반 검증은 service 에서.
- 검증: type-check.

### B3. 서비스 — 스냅샷 + 가드
- Modify: `apps/backend/src/publish/publish.service.ts` `createJobs`
  - 인스타 채널 포함 시: `draft.caption` null/빈 → `BadRequestException`. `images` 누락/2미만/10초과 → 400. 각 URL 이 Storage public base(`card-images`) 로 시작 안 하면 → 400.
  - job insert row 에 `payload: { caption, images }`(인스타), 네이버는 payload 미설정(추후).
  - public base 판별용 헬퍼: `StorageService.getPublicUrl('')` prefix 또는 버킷 public URL prefix 재사용.
- 검증: type-check.

### B4. 트리거 — payload 실전송
- Modify: `apps/backend/src/publish/triggers/n8n-publish.trigger.ts`
  - `payload: {}` → `job.payload ?? {}` 를 `triggerPayloadSchema` 로 parse 해 전송.
- 검증: type-check + (B5 echo 라운드트립에서 payload 도달 확인).

### B5. (검증용) 로컬 echo 라운드트립
- 로컬 backend :3001 + 로컬 Docker n8n :5678 — [[project_phase8_1_state.md]] 워크플로우 재사용(echo).
- 발행 호출 → n8n echo 가 받은 body 에 `payload.caption` + `payload.images[8]` 포함 확인 → 콜백으로 `published` 전이.

### F1. 렌더 코어 추출
- Modify: `apps/frontend/src/features/insta-export/lib/cardsToZip.ts`
- Create: `apps/frontend/src/features/insta-export/lib/renderCards.ts` — `renderCardsToPngBlobs(cards): Promise<Blob[]>` 추출(off-screen `InstaPreviewCard` 1080×1080 → `toPng` → Blob). `cardsToZip` 는 이 코어 위에서 zip 으로 묶도록 리팩터(다운로드 동작 불변).
- 검증: frontend type-check + PNG 다운로드 회귀 확인(기존 버튼 동작 동일).

### F2. 발행 이미지 업로드 헬퍼
- Modify: `apps/frontend/src/lib/api/drafts.ts` — `uploadPublishImage(draftId, cardIndex, blob)` (기존 image 업로드 엔드포인트 재사용, `publish` 서브폴더 플래그). 순서 보장 위해 인덱스 동반.
- Create: `apps/frontend/src/features/new-content/lib/uploadCarouselImages.ts` — `renderCardsToPngBlobs` → 인덱스 순서대로 업로드 → URL 배열 반환(부분 실패 시 throw, 부분 발행 X).
- 검증: type-check.

### F3. PublishForm 인스타 배선 + 가드
- Modify: `apps/frontend/src/features/new-content/components/PublishForm.tsx` (+ `usePublishJobs` 훅)
  - 인스타 채널 제출 경로: 렌더+업로드 → `publishApi.create(draftId, ['insta'], { images })`. 진행/실패 inline(렌더·업로드 단계 표시).
  - 가드: 카드 2장 미만 또는 `caption` 없음 → 인스타 발행 버튼 disabled + 안내.
  - 제출 후 기존 현황 패널/폴링/재시도 UI(8-2) 그대로 재사용.
- 검증: type-check + 수동(아래 §검증 1~3).

### N1. n8n 인스타 워크플로우
- n8n UI 에서 작성(레포 밖): Webhook → HMAC 검증(Function/Code 노드, 8-1 비밀) → SplitInBatches(images) → HTTP Request(미디어 컨테이너 `is_carousel_item`) → HTTP Request(캐러셀 컨테이너) → HTTP Request(publish) → HTTP Request(우리 콜백, media id).
- IG 토큰/계정 ID = n8n credential.
- 완성 워크플로우 JSON 을 `docs/n8n/insta-publish.workflow.json`(신규) 으로 export 기록.
- 검증: §검증 4(실연동).

---

## 검증 (프로토타입 컨벤션 = jest spec 없음)
1. `pnpm type-check` 전체 통과 + `pnpm lint`.
2. **로컬 echo 라운드트립**(B5): 발행 클릭 → Storage `publish/` 에 8장 업로드 확인 → `job.payload` 스냅샷(caption + images) 확인 → n8n echo 에 payload 도달 → 콜백으로 `published` 전이 + 패널 폴링 반영.
3. **프론트 가드**: 캡션 없는 draft / 카드 1장 → 인스타 발행 버튼 disabled 확인.
4. **실연동**(외부 준비물 완료 후): n8n credential 등록 → 본인 IG 에 캐러셀 1건 실게시 → `external_ref`(media id) 기록 + 상태 `published`.

## 외부 준비물 (사용자 직접 — 코드 아님, [[feedback_infra_cli_guide_only]])
- 개인 IG → Business/Creator 전환 + Facebook 페이지 연결.
- Meta Developer App 생성 + Instagram Graph API 제품 추가.
- 장수명 액세스 토큰 + IG Business 계정 ID 발급 → n8n credential 저장.
- Development Mode(본인 계정) 범위.

## 브랜치 / PR
- 브랜치 `feat/phase-9-insta-publish` (base `develop`). [[feedback_branch_naming_feat]]
- backend(B) + frontend(F) 한 PR → `develop`. ([[reference_gh_active_account]] — gh active account = hec8897.)
- 머지 후 design doc 로드맵 Phase 9 완료 마킹.

## 관련
- spec: `docs/plans/2026-06-18-phase-9-insta-publish-design.md`
- 선행: `2026-06-08-phase-8-1-publish-queue.md`(큐/워커/n8n) · `2026-06-15-phase-8-2-publish-ui.md`(발행 UI)
- [[project_phase8_2_state.md]] · [[project_phase8_1_state.md]] · [[feedback_no_tests_in_prototype]] · [[feedback_plan_no_code]]

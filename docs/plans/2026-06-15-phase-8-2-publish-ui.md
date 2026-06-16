# Phase 8-2 — 프론트 발행 UI (즉시발행 배선)

**목표**: 8-1 에서 검증된 발행 큐 backend(REST 3종 + 워커 + n8n 라운드트립) 위에, **프론트엔드 발행 UI** 를 실제 API 에 배선한다. 사용자가 발행 스텝에서 채널을 골라 **즉시발행**하면 `POST /drafts/:id/publish` 로 job 을 큐잉하고, 같은 화면에서 **현황 패널이 `GET /drafts/:id/jobs` 를 폴링**해 `pending → processing → published/failed` 상태 전이를 뱃지로 따라가며, 실패한 job 은 **재시도 버튼**(`POST /publish-jobs/:id/retry`)으로 다시 큐잉한다. 실제 채널 발행은 아직 없고(n8n stub, `external_ref='n8n-stub'`), 본 단계는 **버튼→파이프라인→상태 UI** 의 풀 배선을 증명한다.

**아키텍처 한 줄**:
- 백엔드 **무수정**. 8-1 의 REST 3종을 프론트에서 호출만 한다. (`POST /drafts/:id/publish`, `GET /drafts/:id/jobs`, `POST /publish-jobs/:id/retry`)
- 기존 프론트 패턴 답습 — axios `api`(Supabase 토큰 인터셉터) + 도메인별 `lib/api/*.ts` 모듈 + TanStack Query 훅.
- 발행 후 상태는 **클라이언트가 들고 있지 않음** — 발행 주체는 클라우드 워커. 프론트는 `GET /jobs` 폴링으로 따라갈 뿐이라, 탭을 닫았다 다시 들어와도 현재 상태를 그대로 반영한다.
- 상태 표시 위치 = **발행 스텝 인라인**(`/new/publish`). 제출 즉시 폼이 현황 패널로 전환되어 같은 화면에서 진행을 본다.

**Out-of-scope** (의도적 제외):
- **예약발행**(`scheduledAt`) — 다음 사이클. 본 단계는 즉시발행만(`scheduledAt` 미전송 → 백엔드 `scheduled_at=now()`). `ScheduleSelector` 는 "지금 발행" 고정/숨김.
- **전역 `/queue` 페이지 실데이터** — 현재 mock 유지. "내 전체 job 목록" 백엔드 엔드포인트가 없어 backend 작업이 필요하므로 분리.
- **상세 페이지(`/library/[id]`) 영속 현황 섹션** — 추후. 본 단계는 `/new` 플로우 인라인만.
- **발행 취소 / job 삭제** — 백엔드 API 없음. YAGNI.
- **실제 채널 발행** — 네이버(Phase 9) / 인스타(Phase 10). n8n stub 그대로.

---

## 도메인/UX 결정 (lock-in)

### 1. 채널 값 매핑 — 프론트 `insta` ↔ 백엔드 `instagram`
- 프론트 `Channel` 타입은 `'naver' | 'insta'`, 백엔드 발행 API 는 `'naver' | 'instagram'`.
- 매핑은 **`lib/api/publish.ts` 한 곳에 흡수** — API 경계에서 변환(요청 시 `insta→instagram`, 응답 job 의 channel `instagram→insta`). 나머지 프론트 코드는 기존 `Channel` 타입 그대로 사용.
- 사유: UI 도메인 타입 오염 방지, 변환 지점 단일화.

### 2. draftId 출처 — context `topicId` → 캐시된 draft
- `/new` 플로우는 `NewContentProvider` context 에 `topicId` 만 보유(draftId 없음). 발행 스텝은 `draftsApi.get(topicId)` (TanStack Query 캐시, 편집 스텝과 공유)에서 `draft.id` 를 얻는다.
- `topicId` 가 null(직접 진입/새로고침으로 in-memory context 소실)이면 기존 스텝과 동일하게 **"주제부터 시작" 가드** 노출.
- 사유: 신규 상태 도입 없이 기존 흐름 답습. (context 영속화는 [[project_tab_routing_backlog]] 와 함께 별도 사안.)

### 3. 폼 ↔ 현황 패널 분기 — 기존 job 존재 여부로 결정
- 발행 스텝 진입 시 `GET /drafts/:id/jobs` 1회 조회:
  - job 없음 → **입력 폼**(ChannelSelector + 발행 버튼).
  - job 있음 → **현황 패널**(재진입/재방문 시 현재 상태 표시).
- 제출 성공 후엔 현황 패널로 전환.
- 사유: 재진입 시 "이미 발행함" 을 자연스럽게 반영. 409(중복) 도 같은 패널로 폴백해 일관.

### 4. 폴링 — 진행 중일 때만, 종결되면 중단
- 현황 패널은 `GET /jobs` 를 **활성 job(`pending`/`processing`)이 하나라도 있는 동안만 ~3s 간격 폴링**(TanStack Query `refetchInterval`), 전부 종결(`published`/`failed`)되면 폴링 중단.
- 재시도 성공 시 캐시 invalidate → 폴링 재개.
- 사유: 워커 @Interval(10s) 비동기 진행을 UI 가 따라가되, 종결 후 불필요한 요청 방지.

### 5. 상태 뱃지 — 4-state (예약됨 제외)
- `pending`(대기) · `processing`(진행 중) · `published`(발행 완료) · `failed`(실패).
- "예약됨" 은 예약발행과 함께 다음 사이클(이번엔 즉시발행뿐이라 `scheduled_at` 이 항상 과거/현재).
- 색/톤은 기존 `/queue` 컴포넌트(QueueRow 등) 시각 언어 재사용.
- 실패 job 은 `last_error` 노출 + **재시도 버튼**. `attempts/max_attempts` 표기.

### 6. 에러 처리
- **409 Conflict**(이미 활성 job 있는 채널) → Toast 안내 후 현황 패널로 폴백(기존 job 표시). 폼 입력은 잃지 않음.
- **재시도**: `failed` job 만 버튼 노출(백엔드도 failed 만 허용 → 그 외 400). 성공 시 invalidate.
- 폴링 네트워크 에러는 TanStack Query 기본 재시도에 위임.

---

## 작업 단위 (frontend only)

> 코드 본체는 실행 단계에서. 여기는 파일·의도·검증까지.

### D1. API 모듈 + 타입 + queryKey
- `lib/api/types.ts` — `PublishJob`(id, draft_id, channel, status, attempts, max_attempts, scheduled_at, triggered_at, published_at, external_ref, last_error, created_at) + `PublishStatus`, `PublishChannelApi` 타입 추가.
- `lib/api/publish.ts` (신규) — `publishApi.create(draftId, channels)` / `listJobs(draftId)` / `retry(jobId)`. **채널 매핑 흡수**(요청/응답 양방향).
- `lib/api/queryKeys.ts` — `publishJobs(draftId)` 키 추가.

### D2. 데이터 훅
- `features/new-content/hooks/usePublishJobs.ts` (신규) — `useQuery(listJobs, { refetchInterval: 활성 job 있으면 3s else false })` + `createJobs` / `retryJob` mutation(성공 시 invalidate).

### D3. 표시 컴포넌트
- `features/new-content/components/JobStatusBadge.tsx` (신규) — status → 라벨/색 뱃지.
- `features/new-content/components/PublishJobsPanel.tsx` (신규) — job 목록(채널·뱃지·attempts·실패 사유·재시도 버튼).

### D4. PublishForm 배선
- `features/new-content/components/PublishForm.tsx` — 가짜 `submit()`(router.push) 제거. draftId 확보 → 진입 시 job 조회로 폼/패널 분기 → 즉시발행 제출 → 패널 전환. `ScheduleSelector` 는 "지금 발행" 고정/숨김. topicId 없을 때 가드.

### D5. 검증 (프로토타입 컨벤션 = jest spec 없음, [[feedback_no_tests_in_prototype]])
- `pnpm type-check` (frontend) 통과.
- **수동 라운드트립**(로컬 backend :3001 재기동 + 로컬 Docker n8n :5678 — [[project_phase8_1_state.md]] 의 워크플로우 그대로):
  1. 발행 스텝에서 채널 선택 → "지금 발행" → 패널 전환, job 들이 `pending`/`processing` 뱃지로 등장.
  2. 워커 폴링 → n8n 콜백 → 패널이 폴링으로 `published` 전이 자동 반영, 폴링 중단 확인.
  3. 같은 draft 재진입 → 폼 대신 현황 패널(기존 job) 노출.
  4. 같은 채널 재발행 시도 → 409 → Toast + 패널 폴백.
  5. (실패 경로) n8n 워크플로우를 failed 콜백으로 임시 변경 또는 DB 에서 `failed` 세팅 → 재시도 버튼 → 다시 `pending` 전이.

---

## 브랜치 / PR
- 브랜치 `feat/phase-8-2-publish-ui` (base `develop`). [[feedback_branch_naming_feat]]
- frontend-only PR → `develop`. ([[reference_gh_active_account]] — gh active account = hec8897.)
- 머지 후 design doc Phase 5/§8 에 8-2 완료 마킹.

## 관련
- 선행: `docs/plans/2026-06-08-phase-8-1-publish-queue.md` (backend 큐/워커/n8n)
- [[project_phase8_1_state.md]] · [[feedback_app_folder_routes_only]] · [[feedback_no_tests_in_prototype]]

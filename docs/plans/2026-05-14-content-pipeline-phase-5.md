# Phase 5 — 대시보드/라이브러리 실데이터 연결

**목표**: Phase 1a 의 mock 으로만 채워져 있던 대시보드(`/`)와 라이브러리(`/library`) 의 콘텐츠 리스트를 drafts 실데이터로 연결한다. 사용자가 본인이 양산한 콘텐츠가 두 화면에서 바로 보이게 만들어 dogfooding 진입 직전 마감을 끝낸다. **딱 리스트 표기까지** — 필터/검색/페이지네이션/상세 페이지 실데이터 연결은 본 phase 스코프 외.

**아키텍처 한 줄**: backend = `GET /api/drafts` 신설(현재 user 의 drafts + topics join, 최신순). frontend = `useDrafts()` React Query hook + `draftToContent(draft)` 어댑터 한 곳에 두고 두 화면에서 동일하게 소비. mock `LIBRARY_ITEMS` 제거.

**스택**: Phase 4 와 동일 (NestJS 11 + Next.js 16 + Supabase + TanStack Query). 신규 dep 없음.

**디자인 레퍼런스**: `claude_design/design_handoff_content_pipeline/README.md` 의 "화면 2 — 대시보드" / "화면 3 — 라이브러리" 절. 카드 비주얼/그리드/Hero 영역 그대로 두고 데이터 소스만 교체.

**Phase 분배 재정렬 (2026-05-14)**:
- **새 Phase 5** = 대시보드/라이브러리 실데이터 연결 (본 문서)
- **새 Phase 6** = 카드뉴스 편집/미리보기 (기존 Phase 5)
- 기존 Phase 6~9 (발행 인프라 / 네이버 / 인스타 / 통합) → +1 씩 뒤로 (Phase 7~10)
- 인프라(Phase 1b) 위치는 그대로 — 새 Phase 6 과 새 Phase 7 사이

**Out-of-scope**:
- 콘텐츠 상세 페이지(`/library/[id]`) 의 실데이터 연결 — 카드뉴스 편집 phase(=새 Phase 6) 에서 같이 처리하는 게 자연스러움
- 라이브러리 필터(상태별) / 검색 / 정렬 옵션 / 페이지네이션 / infinite scroll
- 대시보드 hero stat(이번 주 발행 N, 큐 대기 N), 채널 통계 — 발행 phase 까지 mock 유지
- 발행 큐(`/queue`) 실데이터 — 발행 phase 묶음
- 빈 상태 별도 디자인 (시안 외 신규 컴포넌트 추가) — 화면 안에 짧은 안내 텍스트만
- 실시간 갱신 / 옵티미스틱 업데이트 / 무한스크롤
- 새 phase 의 LLM 호출 변경 — 본 phase 는 데이터 표면 작업만

---

## 사전 작업

- Phase 3 의 `drafts` + `topics` 테이블 그대로 사용. 마이그레이션 없음.
- backend `DraftsModule` 에 GET 라우트 추가만 — 새 모듈/엔티티 없음.
- 이미 두 페이지 모두 `LIBRARY_ITEMS` mock import 만 의존 — mock 파일은 그대로 두되 import 제거.
- env / 인프라 변경 없음.

---

## 도메인 결정 (lock-in)

### List 엔드포인트 응답 모양
- backend 신규 endpoint `GET /api/drafts`
- 현재 user 의 drafts + topics join, `drafts.updated_at desc` 정렬
- 응답 shape (한 row):
  ```
  {
    id, status, blog_title, blog_tags,
    card_news,        // 첫 카드 색/타이틀만 프론트에서 추출. 페이로드는 그대로 전송.
    created_at, updated_at,
    topic: { id, title }
  }
  ```
- 페이지네이션 X — 현 단계에선 user 1명의 drafts 가 수십개 미만이라 전체 반환. 향후 phase 에서 cursor 도입 가능.
- 정렬 옵션 / 필터 파라미터 X.

### `draftToContent(draft)` 어댑터 (frontend 단)
디자인 시안의 `Content` 타입(`thumb`, `thumbFg`, `thumbText`, `state`, `channels`, `publishedAt`, `views`, `likes`)으로 매핑.

- `id` ← `draft.id`
- `title` ← `draft.blog_title` (없으면 `topic.title`)
- `topic` ← `draft.topic.title`
- `thumb` ← `card_news[0].bg`, fallback `#27272a`
- `thumbFg` ← `card_news[0].fg`, fallback `#ffffff`
- `thumbText` ← `card_news[0].num` (예: `01`) — mock 의 "푸들" 같은 카피 추출은 본 phase 스코프 외. 카드 num 으로 단순화.
- `state` ← `draft.status` 매핑:
  - `pending`, `generating` → `processing`
  - `ready` → `draft` (편집 가능)
  - `failed` → `failed`
- `channels` ← `[]` (발행 phase 전까지 모두 빈 배열)
- `publishedAt` ← `draft.updated_at` 을 한국어 상대 시간 문자열로 ("방금" / "N분 전" / "N시간 전" / "어제" / "N일 전" / "YYYY.M.D")
- `views`, `likes` ← `0` (발행 phase 까지 0)

### 빈 상태 처리 (별도 컴포넌트 X)
- 라이브러리: drafts 가 0개일 때 `LibraryGrid` 자리에 한 줄 안내 (`"아직 콘텐츠가 없어요. + 새 콘텐츠로 시작해보세요."`) + 본문 우측 정렬 [+ 새 콘텐츠] 링크. 헤더 부제도 0 일 때 다르게 표시 가능.
- 대시보드 `RecentWorkRow` 영역: 0개일 때 같은 톤의 한 줄 안내. 시안 외 신규 디자인 컴포넌트 추가 금지.

### 대시보드 위젯 노출 개수
- "최근 작업" 위젯은 최근 **5개** (디자인 시안 mock 과 동일).

### hero stat / 채널 통계 등 mock 유지 영역
- 대시보드 상단 hero subtitle("이번 주 콘텐츠 N개 발행됨 · 발행 큐에 N개 대기 중")
- 우측 패널의 채널 통계
- 라이브러리 헤더 부제의 상태별 카운트 — 실데이터 drafts 기반으로 단순 집계만 (live=0, scheduled=0, draft=ready count, failed=failed count) — 발행 상태가 모두 0이라 표시 잠시 어색하지만 다음 phase 까지 그대로 둠.

### 로딩 / 에러 표시
- 로딩 = `LibraryGrid` 자리에 skeleton 또는 한 줄 placeholder. 신규 컴포넌트 X — 한 줄 텍스트 OK.
- 에러 = "콘텐츠를 불러오지 못했어요. [다시 시도]" 안내 + retry 버튼(React Query `refetch`).
- 401 → 인증 만료, 글로벌 인터셉터가 이미 처리 중이라 페이지 단 추가 처리 X.

---

## API 표면

신규 1개:

```
GET /api/drafts
  query: 없음
  auth: Bearer (SupabaseAuthGuard)
  response: Draft[]   // 응답 shape 위 도메인 결정 참조
```

기존 `GET /api/drafts/:id`, `PATCH /api/drafts/:id` 회귀 없음.

---

## 파일 구조

**수정 (backend)**
- `apps/backend/src/drafts/drafts.controller.ts` — `@Get()` 메서드 추가 (list)
- `apps/backend/src/drafts/drafts.service.ts` — `listForUser(userId)` 추가
- (DTO/schema 변경 없음 — list 는 입력 없고 출력은 기존 single + `topic` join 만 추가)

**수정 (frontend)**
- `apps/frontend/src/lib/api/drafts.ts` — `listDrafts()` + `useDrafts()` hook 추가 (이미 있다면 확장)
- `apps/frontend/src/lib/api/adapters.ts` (신규) — `draftToContent(draft): Content` 어댑터 + 시간 포맷 helper
- `apps/frontend/src/app/(app)/page.tsx` — mock `LIBRARY_ITEMS` 제거 → `useDrafts()` 사용 + 빈 상태/로딩/에러 분기. "최근 작업" 영역만 변경, hero/채널 통계는 그대로
- `apps/frontend/src/app/(app)/library/page.tsx` — mock `LIBRARY_ITEMS` 제거 → `useDrafts()` 사용 + 헤더 부제 카운트 실데이터 + 빈/로딩/에러 분기
- (`features/library/components/LibraryGrid.tsx` 자체는 props 시그니처 그대로 유지 — `Content[]` 받음)

**제거**
- 두 페이지의 mock import 제거. `mocks/index.ts` 의 `LIBRARY_ITEMS` 자체는 새 콘텐츠 플로우의 mock 등에서 여전히 참조될 수 있어 본 phase 에선 보존, 사용처 0 확인되면 다음 phase 에서 정리.

---

## Tasks

### 1. backend list endpoint
- `DraftsController.list()` (`@Get()`) — `@CurrentUser()` 의 id 로 `service.listForUser` 호출.
- `DraftsService.listForUser(userId)` — `drafts` 테이블 + `topics(id, title)` 인라인 join, `updated_at desc`. RLS 우회 admin client 사용(Phase 3 패턴), `user_id = userId` 명시 필터.
- 검증: type-check + 수동 — Phase 3 양산 1회 한 뒤 `curl` 로 토큰 붙여 호출, 응답에 `topic` 객체 채워졌는지 확인.

### 2. frontend `useDrafts` + 어댑터
- `lib/api/drafts.ts` 에 `listDrafts()` 추가(이미 있는 axios 인스턴스 재활용) + `useDrafts()` (TanStack Query `useQuery`, queryKey `['drafts','list']`).
- `lib/api/adapters.ts` 신규 — `draftToContent(draft): Content` + 상대시간 포맷 helper. status 매핑 표는 위 도메인 결정 그대로.
- 검증: type-check.

### 3. 라이브러리 페이지 결선
- mock import 제거 → `useDrafts()` 호출.
- loading: 한 줄 placeholder. error: 안내 + retry 버튼. empty: 한 줄 안내 + `+ 새 콘텐츠` 링크.
- 헤더 부제: 실데이터 drafts 의 status 카운트 (live=0, scheduled=0, draft=ready count, failed=failed count). 0 일 때도 표시.
- 검증: type-check + 수동 — drafts 1개 이상 있을 때 카드 그리드 표시, 0개일 때 빈 상태 표시.

### 4. 대시보드 "최근 작업" 결선
- mock import 제거 → `useDrafts()` 의 결과에서 `slice(0, 5)`.
- `RecentWorkRow` 영역만 변경. hero subtitle / 채널 통계 / 액션 버튼 그대로.
- loading/error/empty 분기 동일 톤.
- 검증: type-check + 수동.

### 5. 통합 수동 검증 (`pnpm dev`)
- 시나리오 A — drafts 0 개: 새로 가입한 user 로 로그인 → 대시보드/라이브러리 둘 다 빈 상태 안내 표시, `+ 새 콘텐츠` 링크가 `/new` 로 이동.
- 시나리오 B — drafts 1+ 개: Phase 2~4 플로우 한 번 완주 → 대시보드의 "최근 작업" / 라이브러리 그리드에 양산된 draft 가 즉시 표시 (썸네일 색 = `card_news[0].bg`, 라벨 = 상태 매핑).
- 시나리오 C — Phase 4 회귀: `/new/edit` 진입 → 카드뉴스 탭 / 블로그 탭 / autosave / chip 태그 / CharGuide 모두 그대로 동작.
- 시나리오 D — 상태별 표시: drafts 의 status 가 `generating` 상태일 때(양산 중) 라이브러리에서 `processing` pill, `ready` 일 때 `draft` pill, `failed` 일 때 `failed` pill 로 정상 매핑.
- 시나리오 E — 라이브러리 → 카드 클릭 → 상세: 현 상세 페이지는 mock 으로 동작하므로 클릭 시 mock 데이터가 나옴. **본 phase 에선 이게 정상 동작** — 다음 phase 의 작업.
- 시나리오 F — refetch: drafts 양산 직후 라이브러리 페이지로 이동, React Query 의 캐시 무효화로 새 row 가 자동 표시(또는 새로고침 시 표시).

### 6. design doc 갱신
- `docs/plans/2026-04-28-content-pipeline-saas-design.md` 의 `## 8. Plans` 표:
  - 기존 Phase 5 행 → 본 plan 으로 갱신 (`대시보드/라이브러리 실데이터`).
  - Phase 6 행 신설: `카드뉴스 편집/미리보기 (예정)`.
  - 기존 Phase 6~9 → 7~10 으로 번호만 +1.
  - 표 아래 분배 재정렬 노트(2026-05-13 기존) 옆에 2026-05-14 한 줄 추가.
- `## 9. 결정 이력` 에 두 줄:
  - "**2026-05-14**: Phase 분배 재정렬. 새 Phase 5 = 대시보드/라이브러리 실데이터(딱 리스트 표기까지), 기존 Phase 5(카드뉴스 편집) → Phase 6, 발행 단계들(6~9) → 7~10. 사유 — Phase 4 dogfooding 진입 시 본인 양산 콘텐츠가 두 화면에서 안 보이는 게 답답해 우선순위 재배치."
  - "**2026-05-14**: Phase 5 plan 확정. backend GET `/api/drafts` 신설 + frontend `useDrafts()` + `draftToContent` 어댑터로 mock LIBRARY_ITEMS 제거. drafts.status → Content.state 매핑(pending/generating → processing, ready → draft, failed → failed). 상세 페이지 실데이터 / 필터 / 검색 / 발행큐 / hero stat 은 모두 out — 다음 phase 이거나 발행 phase 묶음."
- `superpowers:finishing-a-development-branch` 호출.

---

## 완료 기준

- `pnpm --filter backend type-check`, `pnpm --filter frontend type-check` PASS
- 시나리오 A/B/C/D 수동 검증 통과 (E 는 의도된 그대로, F 는 캐시 invalidation 확인)
- mock `LIBRARY_ITEMS` import 가 두 페이지에서 제거됨
- Phase 1a Health / Phase 2 인터뷰 / Phase 3 카드뉴스 양산 / Phase 4 블로그 편집 회귀 없음
- design doc Phase 분배 표 + 결정 이력 갱신
- (테스트 코드 / 상세 페이지 실데이터 / 필터 / 발행큐 실데이터는 본 phase 스코프 외)

다음 plan: **Phase 6** (카드뉴스 편집/미리보기). 기존 Phase 5 자리 — 카드 부분 재양산, 카드 이미지 업로드/AI 재생성 stub, 상세 페이지 실데이터 연결 등은 그 시점 dogfooding 결과로 우선순위 결정.

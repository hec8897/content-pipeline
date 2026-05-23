# 모달/다이얼로그 시스템 + dogfooding 필수 기능 보강

> **상태**: 🟢 Brainstorming 완료 — design 확정, 디자인 가이드 수령 후 plan 작성 진입 대기
> **작성일**: 2026-05-21
> **트리거**: Phase 1b dogfooding 중 발견된 빈 기능. 발행 phase (Phase 8~) 진입 전 채워야 dogfooding + 발행 자동화 토대가 일관됨.
> **참조 backlog**: [B-01](../backlog.md#b-01-배경-이미지-영속화-storage-도입), [B-04](../backlog.md#b-04-캡션-자동-생성--편집), [B-08](../backlog.md#b-08-storage-결정--supabase-storage-vs-s3)
> **선행**: Phase 7 (OpenAI 마이그레이션 — `gpt-image-1` 이미지 응답 binary 처리), Phase 1b Task 1~9 (Vercel + ECS + Supabase 인프라 동작)
> **후행**: Phase 8 (발행 인프라 — 외부 채널이 카드 이미지의 영속 URL 을 fetch 가능해짐)

---

## 1. 목적

본 phase 의 **본질 = 재사용 가능한 UI 시스템 (Modal + ConfirmDialog + Toast) 구축 + 디자인 토큰 도입**. 사용자 디자인 핸드오프 (`claude_design/design_handoff_modals/`) 의 가이드 따라 풀 시스템 구현. 위에 두 모달 (답변 편집 + 다시 양산 confirm) 을 first use case 로 얹고, 동시에 dogfooding 흐름의 빈 부분 세 가지를 채움. UI 시스템은 후속 phase 의 토대.

### 1.1 UI 시스템 scope (점진적, 옵션 C)

| Family | 본 phase | Backlog (필요 시) |
|---|---|---|
| Modal 베이스 + Scrim | ✅ | — |
| ConfirmDialog (6 variants) | ✅ publish / delete / schedule / retry / unsaved / disconnect | — |
| Toast (4 variants + helper) | ✅ success / error / info / warn-undo | — |
| Popover (3 variants) | ⏭ | more menu / channels / inline confirm |
| Bottom Sheet (2 variants, mobile) | ⏭ | actions / confirm |

Popover/Sheet 는 우리 즉시 use case 없음 — 필요해지면 (모바일 / more menu / 채널 설정 등) backlog 에서 꺼냄.

### 1.2 채워야 할 dogfooding 빈 기능 세 가지

1. **카드 배경 이미지 영속화** — 지금은 AI 재생성 / 사용자 업로드한 `bg_image` 가 frontend in-memory data URL 만. 새로고침 시 사라짐 + 발행 시점에 외부 채널 (Instagram Graph API 등) 이 fetch 할 URL 없음. **Phase 8 인스타 자동의 전제**.
2. **인터뷰 Q&A 표시** — `/library/[id]` 의 "개요" 탭이 현재 mock. 본인 인터뷰 답변을 라이브러리에서 다시 보고 싶을 때 못 봄.
3. **답변 수정 → 다시 양산** — 양산 결과가 마음에 안 들 때 인터뷰 답변을 직접 수정 후 같은 topic 으로 다시 양산. 인터뷰 다시 진행하는 부담 없이 빠른 재시도.

### 1.3 UI 시스템이 핵심인 이유

#3 의 답변 편집 + 다시 양산 confirm 이 본 phase 의 sentinel use case. 단발 모달이 아닌 **풀 시스템** (Modal + 6 ConfirmDialog variants + 4 Toast variants) 으로 구축하면 후속 phase (발행 / 삭제 / OAuth 해제 / 일정 예약 / 채널 설정 / 결과 알림 등) 가 자연스럽게 확장. UI consistency + 접근성 (focus trap / escape / ARIA) 한 자리에서 책임.

---

## 2. 결정 사항 (brainstorming 결과)

| 결정 | 채택 | 사유 |
|---|---|---|
| **UI 시스템 scope** | **점진적 C** — Modal + ConfirmDialog 6 + Toast 4 만 본 phase | Popover/Sheet 는 즉시 use case 없음. 필요 시 backlog 에서 꺼냄 |
| **구현 방식** | **자체 구현** (Radix / Headless UI / shadcn 미사용) | 의존성 추가 X, 디자인 핸드오프 따라 직접 구축. focus trap / escape / ARIA 도 직접 작성 |
| **디자인 토큰 위치** | `app/globals.css` 의 CSS variables (`--a-*` 그대로) + Tailwind v4 `@theme` mapping | 디자인 핸드오프와 변수명/값 일치, Tailwind v4 의 `@theme` 가 CSS variables 잘 받음 |
| **폰트** | Inter Tight (sans) + Pretendard Variable (한글) + JetBrains Mono (mono) | 핸드오프 spec. Pretendard 는 이미 도입, 나머지 추가 |
| **Toast store** | React Context + reducer (자체 구현) | dogfooding 단계엔 충분. zustand/jotai 의존성 추가 안 함. global provider 하나 (`<ToastProvider>`) + `useToast()` hook |
| **모달 stack 정책** | **순차 — 동시 1개만** | 답변 편집 모달의 "저장 후 다시 양산" 클릭 시 → 답변 모달 close + confirm modal 열기. focus trap nesting 회피 |
| **Demo page** | `app/dev/modals/page.tsx` — production 비공개 | `modals.html` 의 React 버전. 모든 variant 트리거 시현 가능 |
| **`confirm()` helper API** | **Promise 기반** — `const ok = await confirm({ kind, title, ... })` | 핸드오프 권장 패턴. 호출처가 then/await 자연스러움 |
| Storage vendor | **Supabase Storage** | 이미 Supabase 인프라 다 사용 중 — 추가 셋업 0 |
| Bucket access | **Public bucket** | dogfooding + Development Mode 단계, 외부 채널 fetch 단순. Production 화 시점에 RLS+signed URL 로 전환 옵션 |
| Upload 흐름 | **Backend 통과 (AI / 사용자 둘 다)** | 권한 검증 한 곳 + AI 재생성은 OpenAI key server-side 필수 |
| 답변 편집 UX | **별도 모달** | multi-line textarea + "저장 vs 저장 후 다시 양산" 두 액션 명확 |
| 버전 관리 | **A (관리 X + warning confirm)** | dogfooding 1인 운영 |
| 발행 시점 URL | **drafts.card_news[idx].bg_image 의 영속 URL** | 양산 시 cover 자동 생성, 사용자가 임의 카드에 추가/교체 |

---

## 3. 스코프

### In-scope ✅

**Backend**
- `drafts.schema.ts` 의 `cardNewsSchema` + `cardNewsEditSchema` 에 카드별 `bg_image?: string` (URL) 필드 추가
- Supabase Storage 클라이언트 service 신설 (`storage/storage.service.ts`)
- 신규 endpoint `POST /api/drafts/<id>/cards/<idx>/upload-image` (multipart, 사용자 업로드)
- 기존 endpoint `POST /api/drafts/<id>/cards/<idx>/regenerate-image` 수정 — OpenAI 응답 binary → Storage push → URL 반환
- 양산 (`/draft/generate`) 의 cover 카드 자동 이미지 생성 흐름 — 기존 코드 그대로, 단 결과 URL 을 `bg_image` 에 박음

**Frontend — 디자인 토큰 + 폰트**
- `app/globals.css` — `--a-*` CSS variables (디자인 핸드오프 그대로) + Tailwind v4 `@theme` mapping
- `app/layout.tsx` 또는 `app/fonts.ts` — `next/font/google` 로 Inter Tight + JetBrains Mono 도입, Pretendard 는 기존 유지
- `tailwind.config` 폐기 또는 v4 패턴 따름

**Frontend — UI primitives (재사용)**
- `components/ui/Modal.tsx` 신설 — 베이스 컴포넌트:
  - `createPortal` 로 `document.body` 에 렌더
  - Scrim — `background: rgba(20,20,24,0.45)` + `backdrop-filter: blur(2px)`
  - Focus trap (Tab/Shift+Tab 이 모달 안 focusable element 만 순환, ref + keydown)
  - Escape key (close — `closeOnEscape` prop)
  - Scroll lock — body `overflow: hidden` + `scrollbar-gutter: stable` (layout shift 방지)
  - ARIA — `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (useId), `aria-describedby` (옵션)
  - Open animation — scrim opacity 140ms ease + modal `scale(0.96) translateY(4px)` → `scale(1) translateY(0)` 160ms cubic-bezier(0.2,0.7,0.2,1)
  - 첫 input/button auto-focus (80ms delay), 닫힘 시 trigger 로 focus 복귀
- `components/ui/ConfirmDialog.tsx` 신설 — Modal 위 6 variants:
  - `kind` prop: `publish` / `delete` / `schedule` / `retry` / `unsaved` / `disconnect`
  - 각 variant: icon color + eyebrow text + confirm button tone 매핑 (디자인 핸드오프 §1 Confirm Dialog 표 참고)
  - `delete` 의 type-guard — `typeGuard: { expected: 'DELETE p1' }` props, 일치할 때만 danger 버튼 enabled
  - `unsaved` 의 3-way — `tertiary` 버튼 (ghost-danger 변경 버리기)
  - `schedule` body slot — date/time/channels 폼 (구체 폼은 사용처에서 children 주입)
  - 호출 헬퍼: `confirm({ kind, title, description, confirmLabel, cancelLabel, typeGuard, ... })` → `Promise<boolean>`
- `components/ui/Toast.tsx` + `components/ui/ToastProvider.tsx` + `lib/toast.ts` 신설:
  - Provider — `<ToastProvider>` 가 stack 관리 (우하단 360px, gap 10px)
  - Variants 4 — `success` (4000ms) / `error` (persistent 0ms) / `info` (6000ms) / `warn-undo` (5000ms)
  - 진행바 — duration 따라 줄어듦, hover 시 pause
  - 입장 — `translateY(8px) scale(0.98)` → `0,1`, 220ms cubic-bezier
  - 퇴장 — 역방향 180ms ease
  - helper API — `toast.success(title, opts)`, `toast.error(...)`, `toast.info(...)`, `toast.warn(...)` (`opts` = `{ msg, actions, duration }`)
- `app/dev/modals/page.tsx` 신설 — **Demo page**:
  - 모든 ConfirmDialog 6 variants 트리거 버튼
  - 모든 Toast 4 variants 트리거 버튼
  - `modals.html` 의 React 버전 — 디자인 가이드 시현 + 회귀 검증용
  - production 비공개 (path 이름 `/dev/*` + middleware 또는 환경 변수 gate)

**Frontend — Use case 모달 (위 primitives 사용)**
- `features/library-detail/components/DetailOverview.tsx` (또는 신설) — Q&A 리스트 + "다시 양산" 버튼 + 답변 클릭 → 답변 편집 모달
- `features/library-detail/components/AnswerEditModal.tsx` 신설 — Modal 베이스 + question (read-only) + textarea + "저장" + "저장 후 다시 양산" 버튼
- 다시 양산 confirm 은 `ConfirmDialog kind="retry"` 호출 (`confirm({ kind: 'retry', title: '다시 양산하시겠어요?', ... })`)

**Frontend — 카드 이미지**
- `features/detail/components/CardNewsEditor/CardImageBox.tsx` — data URL → Storage URL 사용, upload/regenerate loading state 추가
- `lib/api/drafts.ts` — `uploadCardImage(draftId, idx, file)` + `regenerateCardImage(draftId, idx, prompt?)` 헬퍼

**Infra**
- Supabase Storage bucket `card-images` 신설 (public read), Dashboard 또는 SQL migration
- 명명 규칙: `<user_id>/<draft_id>/<card_idx>-<uuid>.png`
- max size: 5MB (Supabase Storage 기본 50MB 보다 작게 — bandwidth 비용 절감)

### Out-of-scope ⏭

- **1단계 자동 backup (`previous_card_news` 컬럼)** — 후속 phase. 본 phase 의 confirm modal 로 dogfooding 단계엔 충분
- **풀 버전 관리 (`drafts_history` 테이블)** — 일반 사용자 출시 시점 별도 phase
- **이전 카드 편집 보존 (text/color)** — 다시 양산 시 LLM 이 새로 생성하므로 잃음. confirm modal 이 경고 담당
- **신규 인터뷰 추가 / 인터뷰 자체 재진행** — 답변 수정만 본 phase. 인터뷰 재진행은 별도 흐름 (기존 `topics.controller` 의 `start-interview` 재호출 패턴 그대로)
- **캡션 자동 생성 (B-04)** — Phase 10 (인스타 자동) 과 묶어 처리
- **사진 위치 조절 (B-02)** — 본 phase 외
- **`previous_bg_image` 영속화** — bg_image 갱신 시 이전 URL 의 Storage object 삭제 (orphan 정리). 후속 phase 의 cron / lifecycle 정책

---

## 4. 아키텍처 / 파일 변경

### 4.1 Backend

```
apps/backend/src/
├── storage/                           ← 신규 모듈
│   ├── storage.module.ts
│   └── storage.service.ts             ← Supabase Storage client, uploadCardImage, getPublicUrl
├── drafts/
│   ├── drafts.schema.ts               ← cardNewsSchema + cardNewsEditSchema 에 bg_image 추가
│   ├── drafts.controller.ts           ← upload-image endpoint 신설, regenerate-image 수정
│   ├── drafts.service.ts              ← uploadCardImage / regenerateCardImage 메서드, OpenAI binary 처리
│   └── drafts.module.ts               ← StorageModule import
└── app/
    └── app.module.ts                  ← StorageModule import
```

**의존성 — 이미 있음:**
- `@supabase/supabase-js` (Storage API 포함)
- `@nestjs/platform-express` (multer 내장, multipart 처리)

**zod 스키마 변경:**
- `cardNewsSchema` (LLM 출력 검증): cover 카드의 `bg_image: z.string().url().optional()` 추가
- `cardNewsEditSchema` (사용자 편집): 모든 카드에 `bg_image: z.string().url().optional()` 추가 (cover/body/outro 모두 이미지 가능)

### 4.2 Frontend

```
apps/frontend/src/
├── features/
│   ├── library-detail/
│   │   └── components/
│   │       ├── DetailOverview.tsx           ← Q&A 리스트 + 다시 양산 버튼 (mock 제거)
│   │       ├── AnswerEditModal.tsx          ← 신규
│   │       └── RegenerateConfirmModal.tsx   ← 신규
│   └── detail/
│       └── components/
│           └── CardNewsEditor/
│               └── CardImageBox.tsx          ← data URL → URL, loading state
├── lib/
│   └── api/
│       ├── drafts.ts                          ← uploadCardImage, regenerateCardImage 추가
│       └── interview.ts                       ← 기존 PATCH 메시지 helper 확인 (이미 있을 듯)
└── types/
    └── index.ts                               ← Card 타입에 bg_image 추가
```

### 4.3 Storage

**Bucket: `card-images`**
- public read
- authenticated write (RLS — `auth.uid()` 가 path 의 user_id 와 일치해야 upload)
- max file size: 5MB
- allowed mime types: `image/png`, `image/jpeg`, `image/webp`

**RLS 정책 (Storage policies):**

```sql
-- READ: public (누구나 접근, URL 만 알면 OK)
CREATE POLICY "Public read for card-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'card-images');

-- INSERT: 본인 폴더에만 (path 의 첫 segment 가 auth.uid())
CREATE POLICY "User can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'card-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE/DELETE: 본인 폴더만
CREATE POLICY "User can modify own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'card-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "User can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'card-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

단 backend 가 service-role key 로 작업하면 RLS 우회 가능 — RLS 는 사용자 직접 access 차단 안전장치. backend controller 의 ownership 검증이 1차.

---

## 5. 작업 단위 (plan 단계에서 day 단위로 분배)

| # | 단위 | 산출물 | 검증 |
|---|---|---|---|
| **A** | **디자인 토큰 + 폰트** | `app/globals.css` 의 `--a-*` 변수 + Tailwind v4 `@theme` + Inter Tight + JetBrains Mono 폰트 추가 | 임의 element 에 `bg-[var(--a-accent)]` 또는 token 색상 적용 시 핸드오프와 일치 |
| **B** | **Modal 베이스 컴포넌트** | `components/ui/Modal.tsx` — Portal + Scrim(blur) + Focus trap + Escape + Scroll lock(scrollbar-gutter) + ARIA + open animation (scale 0.96→1, 160ms) | 시나리오 0 — 열기/닫기/Tab 순환/Escape/Backdrop click/scroll lock/focus 복귀 7가지 |
| **C** | **ConfirmDialog (6 variants)** | `components/ui/ConfirmDialog.tsx` — kind prop 으로 publish/delete/schedule/retry/unsaved/disconnect 분기 + icon/eyebrow/tone 매핑 + delete 의 type-guard + unsaved 의 3-way + `confirm()` Promise helper | 6 variants 모두 demo page 에서 시현, type-guard / 3-way 동작 |
| **D** | **Toast 시스템 + helper** | `components/ui/Toast.tsx` + `ToastProvider.tsx` + `lib/toast.ts` 의 `toast.success/error/info/warn` API + Context store | 4 variants demo page 시현 + progress bar + hover pause + persistent (error) + stack 동시 다수 |
| **E** | **Demo page** | `app/dev/modals/page.tsx` — 모든 variant 트리거 + ToastProvider + production 비공개 gate | `/dev/modals` 접속 → 10개 (6 confirm + 4 toast) 트리거 정상 동작 + `modals.html` 와 픽셀/모션 일치 |
| F | Storage bucket + RLS 셋업 | `card-images` bucket + RLS 정책 SQL | Supabase Dashboard 에서 본인 계정으로 PNG 1개 upload + URL 접근 |
| G | Backend storage service | `storage/storage.service.ts` + `StorageModule` | 수동 — service 메서드 호출 시 Storage 에 push + URL 반환 |
| H | Backend regenerate-image endpoint 수정 | `drafts.controller.ts` + `drafts.service.ts` 의 regenerate-image OpenAI 응답 처리 | curl 또는 frontend 에서 AI 재생성 → 응답 URL → 그 URL 접속해 이미지 표시 |
| I | Backend upload-image endpoint 신설 | `POST /drafts/<id>/cards/<idx>/upload-image` multipart | curl 로 PNG 업로드 → 응답 URL → 접속 확인 |
| J | Frontend CardImageBox URL 사용 | `CardImageBox.tsx` + `drafts.ts` helper | AI 재생성 / 사용자 업로드 → 새로고침 → 이미지 유지 |
| K | DetailOverview Q&A 리스트 | `DetailOverview.tsx` + interview API 호출 | 라이브러리 상세 진입 → "개요" 탭 → Q&A 리스트 표시 |
| L | AnswerEditModal (B 사용) | `AnswerEditModal.tsx` + PATCH 메시지 | 답변 클릭 → 모달 → 수정 → "저장" → 리스트 갱신 |
| M | 다시 양산 트리거 (C 의 retry variant 사용) | `confirm({ kind: 'retry', ... })` + POST draft/generate 재호출 | "저장 후 다시 양산" 또는 "다시 양산" → confirm → 양산 → 새 카드뉴스/블로그 + toast 결과 알림 |

**의존 순서:**
- A → B (token 적용 후 Modal 베이스)
- B → C → D (ConfirmDialog 가 Modal 의존, Toast 는 독립이지만 같은 ToastProvider 패턴이 Modal 의 Portal 패턴과 비슷해서 B 후가 자연스러움)
- C, D → E (demo page 가 모든 variant 트리거 의존)
- F → G → H, I (Storage 셋업 → backend 통합)
- G, H, I → J (frontend 가 backend endpoint 의존)
- B, K → L (Q&A 리스트 + Modal 베이스)
- C, L → M (다시 양산 = retry variant + 답변 편집 모달의 트리거)

A~E 그룹 (UI 시스템) 과 F~J 그룹 (Storage) 은 독립이라 병렬 가능. K~M (use case) 는 둘 다 의존.

---

## 6. 검증 시나리오

| # | 시나리오 | 통과 조건 |
|---|---|---|
| **0** | **Modal 베이스 동작** | (a) 열면 scrim(blur) + 모달 scale-in (b) Escape close (c) Scrim click close (d) Tab/Shift+Tab 이 모달 안 focusable 만 순환 (focus trap) (e) 첫 input/button auto-focus 80ms (f) 닫힘 후 trigger element 로 focus 복원 (g) body 스크롤 lock + scrollbar-gutter |
| **0b** | **ConfirmDialog 6 variants** | demo page 에서 publish / delete (+ type-guard) / schedule (date/time/channels) / retry / unsaved (3-way) / disconnect 6개 모두 트리거 정상 + 디자인 핸드오프 색상/타이포/스페이싱 일치 |
| **0c** | **Toast 4 variants** | demo page 에서 success (4s) / error (persistent) / info (6s) / warn-undo (5s) 진행바 + hover pause + 동시 stack + 입장/퇴장 애니메이션 |
| **0d** | **`confirm()` Promise helper** | `const ok = await confirm({ kind: 'delete', typeGuard: { expected: 'DELETE p1' }, ... })` → 정확히 "DELETE p1" 입력 + danger 클릭 시 `ok=true`, cancel/scrim/escape 시 `ok=false` |
| 1 | 카드뉴스 양산 → cover 카드의 AI 이미지가 Storage URL | 새로고침 후에도 cover 이미지 유지, frontend Network 탭에 `*.supabase.co/storage/v1/object/public/card-images/...` |
| 2 | 카드 편집 화면에서 사용자 PNG 업로드 | 업로드 직후 카드에 표시 + 새로고침 후 유지 |
| 3 | 카드 편집 화면에서 AI 재생성 | 재생성 후 카드에 표시 + 새로고침 후 유지 + 5MB 이하 |
| 4 | 라이브러리 상세 "개요" 탭 | 인터뷰 Q&A 리스트 표시. 인터뷰 skip 한 topic 은 빈 상태 placeholder |
| 5 | 답변 편집 모달 | 답변 클릭 → 모달 열림 + 기존 값 pre-fill → 수정 → "저장" → 리스트 즉시 갱신 + success toast |
| 6 | 답변 편집 후 다시 양산 | 답변 수정 → "저장 후 다시 양산" → 답변 모달 close + confirm `kind="retry"` open → "다시 양산" → 진행 화면 → 새 카드뉴스/블로그 + 완료 toast |
| 7 | 다시 양산 단독 트리거 | 답변 수정 없이 "다시 양산" 버튼 → confirm modal → 양산 |
| 8 | 외부 채널 시뮬 | curl 로 카드의 `bg_image` URL fetch → 200 + 이미지 binary (인스타 Meta Graph API 가 fetch 할 흐름 검증) |

---

## 7. 완료 기준

**UI 시스템:**
- `app/dev/modals` demo page 에서 ConfirmDialog 6 variants + Toast 4 variants 모두 시현 가능
- `modals.html` 와 픽셀 / 모션 일치 (색상 / 타이포 / spacing / animation curve / duration)
- `confirm()` Promise helper 동작 (`await confirm(...)` → boolean)
- 시나리오 0/0b/0c/0d 모두 통과
- Modal/ConfirmDialog/Toast 가 `components/ui/` 에 재사용 primitives 로 위치 (use case 와 무관)

**Use case + dogfooding 기능:**
- `/library/[id]` 의 "개요" 탭에서 인터뷰 Q&A 표시 + 답변 편집 + 다시 양산 1회 완주
- 카드뉴스 양산 → cover AI 이미지 → 새로고침 → URL 유지
- 카드 편집 → 사용자 업로드 / AI 재생성 → 새로고침 → URL 유지
- `drafts.card_news[idx].bg_image` 가 Storage public URL 로 저장 (data URL X)

**문서 / 회귀:**
- Phase 2~7 + 1b 의 기존 흐름 모두 동작 (양산 / 인터뷰 / 카드 편집 / 블로그 편집 / 라이브러리)
- design doc §8 Plans 표 + §9 결정 이력 갱신
- `docs/backlog.md` 에 Popover / Bottom Sheet 항목 추가

---

## 8. 잠재 위험 / 미해결

- **Focus trap edge case** — 모달 안 focusable 요소가 0/1개일 때. 0개 시 modal container 에 `tabindex="-1"` + focus, 1개 시 stuck 방지 fallback
- **Animation cleanup race** — close animation 중 다시 open 트리거. `isOpen` + `isAnimating` 두 state 또는 React 18 transition
- **Scroll lock layout shift** — `overflow: hidden` 만으로 scrollbar 사라져서 layout shift. **`scrollbar-gutter: stable`** (CSS, 2023+ 표준) 사용
- **Toast progress bar hover pause 의 timer 관리** — `setTimeout` 의 remaining 계산 시 hover 시점 / mouseleave 시점 차이 계산. `requestAnimationFrame` 기반 또는 elapsed tracking
- **Toast stack memory leak** — 닫힌 toast 의 ref / timer cleanup. unmount 시 cleanup 강제
- **`/dev/modals` production 노출** — middleware 에서 `process.env.NODE_ENV === 'development'` 일 때만 통과, prod 에선 404. 또는 환경 변수 `ENABLE_DEV_ROUTES=true` 일 때만
- **Tailwind v4 + CSS variables 호환** — Tailwind v4 의 `@theme` directive 가 CSS variables 받음. 단 `--a-*` prefix 가 Tailwind v4 의 자동 utility 생성과 충돌 없는지 확인 (예: `bg-[var(--a-accent)]` 작동 검증)
- **폰트 로딩 FOUT** — Inter Tight 추가 시 next/font 의 `display: 'swap'` 설정, 또는 self-host 로 변환
- **Storage 비용** — Supabase 무료 1GB. dogfooding 단계엔 충분 (카드 1장 ~200KB, 1000장 = 200MB)
- **Orphan 이미지** — bg_image 갱신 시 이전 object 남음. 후속 lifecycle 정책 backlog
- **다시 양산 중 사용자가 페이지 떠나면** — backend 에서 계속 진행, 다음 진입 시 status='generating' 확인 후 polling 또는 GenerateProgress 표시. 기존 패턴
- **multipart upload size** — Express default limit 1MB. multer 5MB 명시
- **CORS for canvas (PNG export)** — Storage URL 이 cross-origin → html-to-image 의 canvas tainted 방지: `crossorigin="anonymous"` img 태그 + Supabase Storage 의 CORS 설정 (`Access-Control-Allow-Origin: *`)

---

## 9. Phase 표 위치 / 명명

본 plan 은 phase 번호를 매기지 않음. design doc §8 Plans 표에 별도 행으로 추가:

```
| 7.5 | [Dogfooding 필수 기능 보강](./2026-05-21-content-pipeline-dogfooding-essentials.md) | plan 작성 중 |
```

위치는 Phase 7 (OpenAI 마이그) 와 Phase 1b (인프라) 사이 또는 1b 다음. 발행 phase (8~) 의 의존 (이미지 URL) 이라 발행 전 마감 필수.

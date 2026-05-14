# Phase 4 — 블로그 편집/미리보기

**목표**: Phase 3 의 `/new/edit` 블로그 탭(현재 plain textarea)을 dogfooding 가능한 편집기로 끌어올린다. 마크다운 실시간 프리뷰(side-by-side), 글자 수 / 권장 길이 가이드, 해시태그 chip 편집(DB 컬럼 신설), Autosave + 페이지 이탈 경고, 그리고 한국어 타이포그래피(Pretendard) 도입까지 한 phase 로 묶는다. 인스타 카드뉴스 탭은 본 phase 스코프 외(다음 phase 가 받음).

**아키텍처 한 줄**: backend = `drafts.blog_tags text[]` 1 컬럼 추가 + 블로그 prompt/파서가 태그를 별도로 분리해서 저장. frontend = `BlogEditor` 가 split layout(상단 제목+태그 / 하단 본문 markdown + 프리뷰) 을 조립하고 4개의 작은 컴포넌트(`MarkdownPreview`, `HashtagChips`, `CharGuide`, `AutosaveIndicator`)로 책임 분리. `/new/edit` 페이지가 debounce autosave 와 `beforeunload` 가드를 관장.

**스택**: Phase 3 와 동일 (NestJS 11 + Next.js 16 + Supabase + Gemini). frontend 신규: `react-markdown` + `remark-gfm` (마크다운 렌더), `next/font/google` 의 Pretendard (한국어 sans).

**디자인 레퍼런스**: `claude_design/design_handoff_content_pipeline/README.md` 의 §"새 콘텐츠 풀 플로우 `/new/*`" 의 Step 4 (편집 헤더 + AutosaveIndicator) 와 Step 4b (네이버 블로그 탭 풀 스펙). 시각 디테일(폰트 사이즈, padding, 컬러 hex 등)은 그 문서가 정답.

**Phase 분배 재정렬 (2026-05-13)**: 기존 design doc 의 Phase 4(편집+미리보기 통합) 를 둘로 쪼갠다.
- **새 Phase 4** = 블로그 전용 (본 문서)
- **새 Phase 5** = 카드뉴스 전용 (편집 강화 + 채널 미리보기)
- 기존 Phase 5~8 (발행 인프라 / 네이버 / 인스타 / dogfooding) 은 각각 **+1** 씩 뒤로 (Phase 6/7/8/9).
- 인프라(Phase 1b) 위치는 그대로 — 새 Phase 5 와 Phase 6(=구 5) 사이에 진입.

**Out-of-scope**:
- 인스타 카드뉴스 편집/미리보기 — 새 Phase 5.
- 네이버 블로그 채널 발행 형태 미리보기 (실제 발행 시 모양 mockup) — 네이버 발행 phase(재정렬 후 Phase 7) 직전이 더 자연스러우므로 그쪽으로 이관.
- WYSIWYG / 노션형 에디터 (Tiptap 등). 본 phase 는 raw 마크다운 textarea + side-by-side 프리뷰 유지.
- 마크다운 toolbar (헤딩/볼드/리스트 단축 버튼).
- 본문 부분 재양산 (블로그만 다시 LLM 호출).
- 기존 `drafts` row 의 backfill (이미 양산된 본문 마지막 줄의 `#태그` 분리). 직접 재양산 또는 수동 정리.
- JetBrains Mono / Source Serif 4 도입 — Pretendard 만. 본문 textarea 는 시스템 monospace fallback, 프리뷰는 Pretendard.
- 핸드오프 README 의 `blog-editor-preview.html` 같은 dev 단축 진입 페이지.
- 테스트 코드 (jest spec). 검증 = type-check + 수동 시나리오.

---

## 사전 작업

- Phase 3 의 `drafts` 테이블 그대로 사용. `blog_tags` 컬럼만 신규.
- env 변경 없음 (`GEMINI_API_KEY` 그대로).
- `claude_design/` 디렉토리는 frontend 빌드/배포 산출물에 포함되지 않아야 함(`.gitignore` 또는 Next.js `pageExtensions` 확인 — 이미 frontend src 밖이라 자동 제외되지만 점검).

---

## 도메인 결정 (lock-in)

### `drafts.blog_tags text[]` 컬럼 신설
- `not null default '{}'` — 빈 배열 기본. null vs 빈 배열 양분 회피.
- length 제약은 zod 단(태그 1개 ≤ 40자, 총 ≤ 10개)에서 관리. DB 는 단순 배열.
- backfill 안 함 — 기존 row 가 본문 마지막 줄에 `#태그` 형태로 남아 있어도 새 UI 에서 chip 영역이 비어 있는 채로 표시되고, 사용자가 재양산 누르면 분리되어 들어옴.

### 블로그 prompt 출력 형식 변경
- Phase 3 prompt 의 "**본문 마지막 줄에 `#태그1 #태그2 #태그3` 한 줄**" 규약 폐기.
- 새 규약: 본문(마크다운) + 한 줄 빈 줄 + 마지막 줄 = `TAGS: tag1, tag2, tag3` 형태로 명시.
  - 이유: `#` 접두는 마크다운 헤딩과 충돌해서 LLM 이 가끔 본문 헤딩으로 출력. 별도 prefix 가 파싱 신뢰성 높음.
  - 콤마 separator + 앞에 `#` 없음. 프론트가 표시할 때만 `#` prepend.
- `parseBlogMarkdown` 확장: `{ title, body, tags: string[] }` 반환. 마지막 비공백 줄이 `TAGS:` prefix 면 split + trim, 본문에서 그 줄(+ 위 빈 줄) 제거. 없으면 `tags = []` + body 그대로.
- LLM 콘텐츠 가드레일(Phase 2 부터의 규약) — transcript 외 사실 지어내기 금지 / 정치·종교·시사·특정 인물 비판 회피 — 그대로 유지.

### Autosave 설계
- debounce 800ms. 변경 후 idle 800ms → PATCH.
- 동시성: 진행 중 PATCH 가 있으면 "pending change" boolean 만 세움, 이전 mutation resolve 직후 한 번 더 발사. 별도 큐 자료구조 X.
- 저장 단위: 한 번의 PATCH 가 `blog_title` + `blog_body` + `blog_tags` (+ 카드 변경 있으면 카드까지) 묶음.
- `AutosaveIndicator` 표시 상태 (`'saved' | 'saving' | 'failed'`):
  - `saved` → success 닷 + `{savedAgo} 저장됨` (savedAgo = "방금" / "X초 전" / "X분 전")
  - `saving` → accent 닷(1s 펄싱 애니메이션) + "저장 중…"
  - `failed` → danger 컬러 버튼 "⚠ 저장 실패 — 재시도" (클릭 시 강제 mutate)
- Phase 3 의 수동 "변경 사항 저장" 버튼은 **제거**.

### 페이지 이탈 경고
- `dirty || mutation.isPending` 상태에서 `window.beforeunload` listener — 브라우저 표준 confirm.
- "다음 — 발행" 버튼 클릭 핸들러: dirty 면 `confirm("저장 중인 변경 사항이 있어요. 그대로 이동할까요?")` 안내.

### 레이아웃 (디자인 핸드오프 §4b 기준)

데스크톱(≥ 768px):
```
┌─ 헤더(탭 + AutosaveIndicator + 다음—발행 버튼) ─────────────────┐
├─────────────────────────────────────────────────────────────┤
│ [제목 input + 28자 가이드]   1.4fr │ [HashtagChips]   1fr   │
├──────────────────────────────────┴─────────────────────────┤
│ [본문 textarea + CharGuide]  50%  │ [MarkdownPreview]  50% │
└─────────────────────────────────────────────────────────────┘
```

모바일(< 768px):
- 제목/태그가 세로 스택.
- 본문/프리뷰는 단일 컬럼 + 상단에 segmented toggle `[본문 편집 · MD] / [프리뷰 · 네이버]`. 활성 뷰만 렌더(unmount). state: `'edit' | 'preview'` default `'edit'`.

### 컴포넌트 책임 (5분리)
- `BlogEditor` — 레이아웃 조립 + 모바일 toggle state. props: `{ title, body, tags, onTitleChange, onBodyChange, onTagsChange }`.
- `MarkdownPreview` — `react-markdown` + `remark-gfm` 렌더. props: `{ body, title }` (메타 행 mock 은 컴포넌트 내부 상수). 헤딩/리스트/링크/코드/표/blockquote 의 typography 는 컴포넌트 override 로 명시 (`prose` 클래스 미사용 — Tailwind v4 변경 대비).
- `HashtagChips` — chip 입력/삭제 컨테이너. props: `{ tags, onChange, max?: number }` (default max 10).
  - 키 입력: Enter / 콤마 / 스페이스 → 추가 (preventDefault).
  - Backspace (input 비어 있을 때) → 마지막 chip 삭제.
  - blur 시 input 잔여값 자동 commit.
  - 클렌징: `#` 접두 자동 제거, 내부 공백 제거, 중복 차단.
  - 카운트 표시(`{n}개`), 최대치 도달 시 input disabled + 안내.
- `CharGuide` — 글자 수 가이드. props: `{ count: number }`.
  - 권장 1200~1800, 절대 위치 바 0~2200 스케일.
  - sweet-spot 밴드(1200~1800 사이) + 1200/1800 위치 1px 세로 마커.
  - 상태 분기: `count < 1200` → low(warn 컬러 fill + "권장 1200자 이상" hint), `1200 ≤ count ≤ 1800` → ok(success 컬러), `count > 1800` → high(danger 컬러 + "조금 길어요").
  - 좌측 `0` / 우측 `2,200` 라벨.
- `AutosaveIndicator` — 위 Autosave 표시 상태를 시각화. props: `{ status, savedAgo }`.

### 메타 행 (프리뷰 상단) — mock 포함
- `MarkdownPreview` 내부 상수: `{ author: 'minji_daily', date: '2026.5.7', category: '일상' }` (mock).
- Phase 4 스코프 외 — 실제 발행 phase 가 실데이터로 교체.

### 제목 가이드
- 권장 28자 이내 (네이버 검색 노출 SEO). 현재 글자 수 / 권장 라벨을 input 하단에 표시. 막는 게 아니라 표시만.

### 폰트 도입 — Pretendard 만
- `next/font/google` (가능하면) 또는 `next/font/local` 로 Pretendard 등록.
- `apps/frontend/src/app/layout.tsx` 의 `<html>` 에 className 적용.
- `apps/frontend/src/app/globals.css` 의 `@theme inline` 에 `--font-sans: var(--font-pretendard), system-ui, sans-serif`.
- 본문 textarea = Tailwind `font-mono` (시스템 monospace fallback — 별도 폰트 도입 안 함).
- 프리뷰/제목/UI = `font-sans` (Pretendard).
- 다른 phase 한국어 화면이 모두 Pretendard 로 자동 적용됨. 회귀 위험 light(Tailwind 구문 유지).

### 마크다운 렌더 라이브러리
- `react-markdown` + `remark-gfm`(GFM: 표/체크리스트/취소선).
- `dangerouslySetInnerHTML` 사용 금지. react-markdown 의 컴포넌트 override 로 typography 규칙 명시.

---

## API 표면

새 endpoint 없음. Phase 3 의 PATCH `/api/drafts/:id` payload 만 확장:

```
PATCH /api/drafts/:id
  body: {
    card_news?: CardNewsCard[];
    blog_title?: string;
    blog_body?: string;
    blog_tags?: string[];  // 신규
  }
```

GET 응답에도 `blog_tags: string[]` 포함 (database.types.ts 재생성으로 자동 반영).

generate endpoint 응답 모양 변경 없음 — 내부 흐름에서 tags 분리해서 저장하는 단계만 추가.

---

## 양산 흐름 변경 (DraftsService.generate)

Phase 3 흐름에서 한 줄 추가:

```
generate(topicId, userId)
  ├─ ... (Phase 3 그대로)
  ├─ Gemini 호출 2 (블로그 마크다운)
  ├─ parseBlogMarkdown(raw)  // 확장: { title, body, tags } 반환
  ├─ DB update → blog_title + blog_body + blog_tags + ...
  └─ ...
```

`patchDraft` 는 zod schema 확장만으로 끝. tags 배열 길이/원소 길이 제약 zod 단에서.

---

## 파일 구조

**신규 (backend)**
- `supabase/migrations/20260513000001_phase4_blog_tags.sql`

**수정 (backend)**
- `apps/backend/src/drafts/drafts.prompts.ts` — `buildBlogPrompt` (태그 출력 규약 변경) + `parseBlogMarkdown` 확장
- `apps/backend/src/drafts/drafts.service.ts` — `generate` 흐름에 tags 저장 추가
- `apps/backend/src/drafts/drafts.schema.ts` — `patchDraftSchema` 에 `blog_tags` 추가
- `apps/backend/src/drafts/dto/patch-draft.dto.ts` — `blog_tags?: string[]`
- `apps/backend/src/supabase/database.types.ts` — 재생성

**신규 (frontend)**
- `apps/frontend/src/features/new-content/components/MarkdownPreview.tsx`
- `apps/frontend/src/features/new-content/components/HashtagChips.tsx`
- `apps/frontend/src/features/new-content/components/CharGuide.tsx`
- `apps/frontend/src/features/new-content/components/AutosaveIndicator.tsx`

**수정 (frontend)**
- `apps/frontend/src/features/new-content/components/BlogEditor.tsx` — split layout + 자식 4개 조립 + 모바일 toggle
- `apps/frontend/src/app/new/edit/page.tsx` — autosave + 마지막 저장 시각 표시 + `beforeunload` + "다음 — 발행" dirty 가드 + 수동 저장 버튼 제거
- `apps/frontend/src/lib/api/types.ts` — `Draft.blog_tags`, `PatchDraftPayload.blog_tags`
- `apps/frontend/src/app/layout.tsx` — Pretendard `next/font` 등록 + `<html>` className
- `apps/frontend/src/app/globals.css` — `@theme inline` 에 `--font-sans` 토큰
- `apps/frontend/package.json` — `react-markdown`, `remark-gfm` 추가

---

## Tasks

### 1. drafts.blog_tags 마이그레이션
- `ALTER TABLE drafts ADD COLUMN blog_tags text[] NOT NULL DEFAULT '{}'`.
- MCP `apply_migration` 적용.
- 검증: Dashboard Table Editor 에서 컬럼 + default 확인.

### 2. database.types.ts 재생성
- MCP `generate_typescript_types`.
- 검증: `pnpm --filter backend type-check` 통과.

### 3. backend prompt + parser 확장
- `buildBlogPrompt`: 출력 형식을 "본문 마크다운 + 빈 줄 + `TAGS: a, b, c`" 로 변경. 가드레일 문구 유지.
- `parseBlogMarkdown`: 반환 타입 `{ title, body, tags }`. 마지막 비공백 줄이 `TAGS:` prefix 면 split/trim, 본문에서 제거. 없으면 `tags = []`.
- 검증: type-check.

### 4. backend schema/dto + service 흐름 반영
- `patchDraftSchema` 에 `blog_tags: z.array(z.string().min(1).max(40)).max(10).optional()`.
- `patch-draft.dto.ts`: `blog_tags?: string[]`.
- `DraftsService.generate`: parser 변경에 맞춰 update payload 에 `blog_tags` 포함.
- 검증: type-check.

### 5. Pretendard 도입
- `next/font/google` 로 Pretendard 가 노출되어 있는지 점검(없으면 `next/font/local` + Pretendard variable woff2 호스팅).
- `app/layout.tsx` 에서 font instance import + `<html>` className.
- `app/globals.css` 의 `@theme inline` 블록에 `--font-sans` 토큰 매핑.
- 다른 phase 한국어 화면 회귀 점검(대시보드 / `/new/*` 전 단계 / `/library`).
- 검증: `pnpm --filter frontend type-check`, `pnpm --filter frontend dev` 로 한국어 텍스트가 Pretendard 로 렌더되는지 육안 확인.

### 6. frontend deps
- `pnpm --filter frontend add react-markdown remark-gfm`.
- 검증: install 성공, lockfile diff 만 변경.

### 7. MarkdownPreview 컴포넌트
- 신규. props: `{ body: string; title: string }`.
- `react-markdown` + `remark-gfm`. 헤딩/리스트/링크/코드/blockquote/표 의 typography 는 컴포넌트 override 로 명시(`prose` 미사용).
- 상단 메타 행 mock (`minji_daily · 2026.5.7 · 일상`) 내부 상수.
- 우측 상단 `● live` 인디케이터(success 컬러 닷 + "live" 라벨).
- 빈 제목 시 placeholder "제목을 입력하세요".
- 시각 디테일은 핸드오프 README §4b 의 "본문 프리뷰" 절 참조.
- 검증: type-check, BlogEditor 에서 import 시 동작.

### 8. HashtagChips 컴포넌트
- 신규. props: `{ tags: string[]; onChange: (next: string[]) => void; max?: number }` (default 10).
- 키 입력 / 클렌징 / Backspace 삭제 / blur 잔여 commit 위 도메인 결정 명세대로.
- 카운트 `{n}개` 표시. 최대치 도달 시 input disabled + 안내.
- 시각 디테일은 핸드오프 README §4b 의 "해시태그 chips" 절 참조.
- 검증: type-check.

### 9. CharGuide 컴포넌트
- 신규. props: `{ count: number }`.
- 0~2200 스케일 + 1200~1800 sweet-spot 밴드 + 마커 + 상태별 컬러/hint.
- 시각 디테일은 핸드오프 README §4b 의 "글자수 가이드" 절 참조.
- 검증: type-check.

### 10. AutosaveIndicator 컴포넌트
- 신규. props: `{ status: 'saved' | 'saving' | 'failed'; savedAgo: string; onRetry: () => void }`.
- 상태별 시각: success/accent(1s 펄싱)/danger.
- 시각 디테일은 핸드오프 README §"Step 4 — 편집" 절 참조.
- 검증: type-check.

### 11. BlogEditor 조립
- 기존 BlogEditor.tsx 폐기 후 재작성.
- props 확장: `{ title, body, tags, onTitleChange, onBodyChange, onTagsChange }`.
- 상단 행(제목 1.4fr + HashtagChips 1fr) / 하단 행(본문 textarea + MarkdownPreview 50:50). 본문 textarea 하단에 CharGuide.
- 모바일(<768px): 단일 컬럼 + segmented toggle state(`'edit' | 'preview'` default `'edit'`).
- 제목 input 하단에 `{count}자 · 권장 28자 이내` 가이드.
- 본문 textarea: Tailwind `font-mono`, line-height 1.7, tab-size 2, spell-check off.
- 검증: type-check.

### 12. /new/edit 페이지 autosave + 이탈 경고
- 페이지 상단 액션 영역에서 수동 "변경 사항 저장" 버튼 제거. `<AutosaveIndicator status savedAgo onRetry />` 로 대체.
- state: `dirty`, `lastSavedAt`, `autosaveStatus`. `savedAgo` 는 `lastSavedAt` 으로부터 1초마다 갱신(setInterval, unmount cleanup).
- useEffect 로 dirty 시 800ms timer → mutation.mutate(). cleanup 으로 unmount/재변경 시 clear.
- mutation in-flight 중 새 변경 → `pendingChange` flag → onSuccess 후 즉시 재발사.
- onSuccess → `dirty=false`, `lastSavedAt=Date.now()`, `autosaveStatus='saved'`.
- onError → `autosaveStatus='failed'`, dirty 유지. retry 클릭 시 강제 mutate.
- `useBeforeUnload(dirty || pending)` 훅으로 listener.
- "다음 — 발행" 클릭 핸들러에서 dirty 면 `confirm`.
- 카드뉴스 변경도 같은 mutation 으로 묶임(Phase 3 회귀 X).
- 검증: type-check.

### 13. types.ts 갱신
- `Draft.blog_tags: string[]`, `PatchDraftPayload.blog_tags?: string[]`.
- 검증: type-check.

### 14. 통합 수동 검증 (`pnpm dev`)
- 시나리오 A — 새 양산 → 블로그 탭: Phase 2/3 풀 코스 완주, `/new/edit` 블로그 탭에서 (1) 상단 제목+태그 행 / 하단 본문+프리뷰 행 레이아웃, (2) 본문 입력 즉시 우측 프리뷰 렌더링, (3) 태그 chip 표시, (4) CharGuide 색 분기 확인.
- 시나리오 B — Autosave: 본문 수정 → 800ms 대기 → "저장 중…" → "방금 저장됨". reload 후 변경 유지.
- 시나리오 C — 이탈 경고: 본문 수정 직후(저장 완료 전) 탭 닫기 / 뒤로가기 → 브라우저 confirm. "다음 — 발행" 클릭 시 안내.
- 시나리오 D — CharGuide 분기: 본문을 짧게(<1200) / 적정(~1500) / 길게(>1800) 만들어 색·hint·bar fill 분기.
- 시나리오 E — HashtagChips: 입력 + Enter/콤마/스페이스 → chip 추가, Backspace(빈 input) → 마지막 삭제, `#` 접두 자동 제거, 중복 차단, 10개 초과 차단, blur 시 잔여값 자동 commit. 저장 후 reload 시 유지.
- 시나리오 F — 모바일(390px Chrome DevTools): segmented toggle 로 본문↔프리뷰 전환 동작.
- 시나리오 G — Phase 3 회귀: 카드뉴스 탭 손상 X(편집/드래그/색 변경/저장).
- 시나리오 H — 새 prompt 출력 확인: 재양산 1회 → Supabase Dashboard `drafts.blog_tags` 채워짐, `blog_body` 마지막 줄에 `TAGS:` / `#태그` 줄 잔존 X.
- 시나리오 I — 저장 실패 fallback(선택): backend 강제 다운 또는 잘못된 endpoint → AutosaveIndicator 의 "재시도" 버튼 노출, 클릭 시 재발사. 검증 후 원복.
- 시나리오 J — Pretendard 적용: 다른 화면(대시보드/`/new/*` 전 단계/`/library`) 의 한국어가 Pretendard 로 렌더, 시스템 폰트로 fallback 안 됨.

### 15. 마무리
- design doc(`2026-04-28-content-pipeline-saas-design.md`) 의 `## 8. Plans` 표:
  - 기존 Phase 4 행 → 본 plan 으로 갱신.
  - 새 Phase 5 (카드뉴스 편집/미리보기) placeholder 행 추가.
  - 기존 Phase 5~8 행을 6~9 로 번호만 +1.
- design doc `## 9. 결정 이력` 에 두 줄:
  - "**2026-05-13**: Phase 분배 재정렬. 기존 Phase 4(편집+미리보기) 를 둘로 쪼개 새 Phase 4 = 블로그 전용, 새 Phase 5 = 카드뉴스 전용 으로 분리. 발행 phase 들은 +1 씩 뒤로. 사유 — 블로그/카드뉴스의 편집 UX 가 본질적으로 다르고 한 phase ~2일 가설을 지키려면 분리가 필요."
  - "**2026-05-13**: 블로그 태그 데이터 모델 = DB 컬럼 분리(`drafts.blog_tags text[]`) + prompt 출력 형식 `TAGS:` prefix 별도 줄로 변경 (Phase 3 의 `#태그` 마지막 줄 규약 폐기) — 마크다운 헤딩 충돌 회피. 한국어 sans 폰트 = Pretendard 단일 도입."
- `superpowers:finishing-a-development-branch` 호출.

---

## 완료 기준

- `pnpm --filter backend type-check`, `pnpm --filter frontend type-check` PASS
- 시나리오 A/B/C/D/E/F/G/H/J 수동 검증 통과 (I 는 선택)
- Supabase Dashboard `drafts.blog_tags` 컬럼 + 재양산 row 에 분리된 값 확인
- Phase 1a Health 200 + Phase 2 인터뷰 + Phase 3 카드뉴스 회귀 없음
- design doc Phase 분배 표 + 결정 이력 갱신
- 한국어 화면 전반에 Pretendard 적용
- (테스트 코드 / 네이버 채널 미리보기 / 카드뉴스 편집 강화는 본 phase 스코프 외)

다음 plan: **Phase 5** (카드뉴스 편집/미리보기). 카드 부분 재양산, 카드 이미지 업로드/AI 재생성 stub 연결, 인스타 캐러셀 미리보기 등 — Phase 4 dogfooding 결과를 보고 우선순위 결정.

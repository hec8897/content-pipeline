# Phase 9 — 인스타 자동 발행 (design)

> 작성 2026-06-18. 브랜치 `feat/phase-9-insta-publish`.
> 단일 진실 원천 설계 = [`2026-04-28-content-pipeline-saas-design.md`](./2026-04-28-content-pipeline-saas-design.md).
> 발행 큐/워커/트리거/콜백 인프라 = [`2026-06-08-phase-8-1-publish-queue.md`](./2026-06-08-phase-8-1-publish-queue.md) (Phase 8-1, 완료).
> 발행 UI = [`2026-06-15-phase-8-2-publish-ui.md`](./2026-06-15-phase-8-2-publish-ui.md) (Phase 8-2, 완료).

## 0. 순서 결정 — 네이버보다 인스타 먼저

원 로드맵은 네이버(Phase 9) → 인스타(Phase 10) 였으나, **인스타를 먼저** 구현하기로 변경(2026-06-18).
인스타 카드뉴스가 제품 핵심 산출물이고, 콘텐츠 쪽 준비(1080 카드 렌더·캡션·발행 큐)가 이미 갖춰져 있어
실연동 검증 가치가 크기 때문. 네이버(메일 트릭)는 이후 phase 로 미룸.

## 1. 문제 정의

발행 큐/워커/트리거/콜백(HMAC)은 Phase 8-1 로 완성됐으나 채널 무관 echo 스텁이라
트리거 payload 가 `{}` 다. 인스타 캐러셀 발행에 실제로 필요한 데이터를 채워야 한다.

인스타 Graph API 캐러셀은 **텍스트까지 합성된 최종 카드 PNG 의 공개 URL** 이 필요하다. 그런데:

- 캡션은 `drafts.caption` 컬럼에 이미 생성·저장돼 있음 (B-04). ✅
- 카드 내용은 `drafts.card_news` (8장: 텍스트 + bg/fg + bg_image) 에 있음.
- **최종 합성 카드 PNG 는 어디에도 영속되지 않음** — 프론트 `cardsToZip` 가 export 순간 html-to-image
  `toPng` 로 만들어 zip 다운로드만 함. Storage 에도, DB 에도 안 남는다. `card-images` 버킷은
  AI 배경/업로드(`bg_image`) 만 담는다.

→ 핵심 갈림길: **최종 카드 이미지를 어떻게 공개 URL 로 만들 것인가.**

## 2. 결정 사항

| 결정 | 선택 | 근거 |
|------|------|------|
| 최종 카드 이미지 렌더 | **A. 클라이언트 렌더 → 업로드** | 에디터와 픽셀 동일(WYSIWYG) 렌더(`InstaPreviewCard`) 재사용, 서버 렌더링 인프라 0. (B 서버 satori/puppeteer = 레이아웃 재구현·무거운 의존성. C n8n 렌더 = replaceable 원칙 위반) |
| 발행 범위 | **즉시발행만** | Phase 8-2 프론트와 정합. 이 phase 를 Graph API 라운드트립 검증에 집중. 예약은 backlog |
| IG 토큰 / 계정 ID 위치 | **n8n credentials** | 토큰이 백엔드/payload/로그에 안 닿음. dogfooding 단일 사용자엔 가장 단순. (멀티유저 = 향후 "토큰 우리 DB 암호화 저장"으로 진화) |
| 발행 데이터 스냅샷 | **job.payload 에 박음** | 발행 클릭 시점 이미지·캡션을 job 에 스냅샷 → 이후 draft 수정해도 진행 중 발행 불변 |

## 3. 전체 흐름

```
[발행 클릭 (instagram)]
   │  ① 프론트: InstaPreviewCard off-screen 렌더 → 8장 PNG blob
   │  ② 각 PNG Storage 업로드 → 순서 보장된 공개 URL 8개
   │  ③ POST /drafts/:id/publish { channels:['instagram'], images:[url…] }
   ▼
[백엔드 createJobs]
   │  caption(draft.caption 스냅샷) + images(URL 배열) 을 job.payload 에 저장
   │  pending job 생성
   ▼
[워커 폴링 → 트리거]
   │  job.payload 로 n8n webhook 호출 (HMAC) — 더이상 {} 스텁 아님
   ▼
[n8n 인스타 워크플로우 (replaceable)]
   │  HMAC 검증 → images 순회 미디어 컨테이너(is_carousel_item)
   │  → 캐러셀 컨테이너 → publish → IG media id
   ▼
[콜백 POST /webhook/publish-result] → markResult('published', externalRef=media id)
```

## 4. 변경 단위

### 4.1 데이터 모델 (마이그레이션)

`publish_jobs` 에 `payload jsonb` 컬럼 추가. 채널별 발행 스냅샷.
인스타 payload 형태:

```jsonc
{
  "caption": "…",                       // draft.caption 스냅샷
  "images": ["https://…/0.png", "…"]    // 순서 보장된 공개 URL (2~10장)
}
```

### 4.2 백엔드

- `publish.schema.ts` — `createPublishSchema` 확장: `instagram` 채널이면 `images: string[]`
  (2~10, Graph API 캐러셀 요건, Storage 도메인 URL 만 허용) 받음. caption 은 프론트가 안 보냄
  → 백엔드가 `draft.caption` 에서 스냅샷.
- `publish.service.ts` `createJobs` — 검증 후 `job.payload` 에 `{ caption, images }` 저장.
  캡션 없으면(=null) 인스타 발행 거부(400).
- 가드 — 카드(=이미지) 1장 draft 는 캐러셀 불가 → 인스타 발행 거부(400). 실 사용 흐름은
  항상 8장이라 엣지 케이스 방어용.
- `triggers/n8n-publish.trigger.ts` — `payload: {}` → `job.payload` 그대로 실어 전송.
- `triggerPayloadSchema` — `payload` 를 인스타 형태(`caption`, `images`)로 구체화.
- Storage 경로 — 최종 합성 카드는 기존 `card-images` 버킷에
  `<userId>/<draftId>/publish/<idx>-<ts>.png` 로(bg_image 업로드와 폴더 분리).

### 4.3 프론트엔드

- `insta-export/lib` — `cardsToZip` 의 렌더 코어를 `renderCardsToPngBlobs(cards)` 로 추출
  (zip 다운로드와 발행이 공유). zip 경로는 그대로 동작.
- 발행 패널(인스타 경로) — 클릭 → 8장 렌더 → 업로드(진행/실패 inline) → URL 모아 `/publish` 호출.
  기존 상태 뱃지/재시도 UI 재사용.
- 가드 — 카드 비었거나 `caption` 없으면 인스타 발행 버튼 disabled + 안내.

### 4.4 n8n 인스타 워크플로우 (replaceable)

webhook 수신(HMAC 검증) → payload `images` 순회 `is_carousel_item` 미디어 컨테이너 생성
→ 캐러셀 컨테이너 생성 → publish → IG media id 를 콜백으로 회신.
IG 액세스 토큰 + Business 계정 ID 는 n8n credential 로 저장.

## 5. 외부 준비물 (사용자 직접 — 코드 아님)

코드 머지와 별개로 dawoon 님이 직접 처리해야 실연동 검증 가능. (인프라 CLI 가이드 원칙)

- Meta Developer App 등록 + **Instagram Graph API** 제품 추가
- 개인 IG → **Business/Creator** 전환 + Facebook 페이지 연결
- 장수명 액세스 토큰 + IG Business 계정 ID 발급 → **n8n credential 로 저장**
- Development Mode = 본인 계정만 발행 가능 (dogfooding 범위로 충분)

## 6. 검증 (성공 기준)

프로토타입 규칙 — jest spec 안 씀. type-check + 수동 라운드트립.

1. **로컬 echo**: 발행 클릭 → Storage 에 8장 업로드 확인 → job.payload 스냅샷 확인
   → n8n echo 로 payload(caption + images) 도달 확인.
2. **실연동**: 본인 IG 에 캐러셀 1건 실제 게시 + `external_ref`(media id) 기록
   + 상태 `published` 확인.

## 7. 스코프 밖 (backlog)

- 예약 발행 UI (백엔드 예약 로직은 존재)
- 멀티유저 토큰 관리(우리 DB 암호화 저장)
- 네이버 자동 발행 (별도 phase)
- 블로그(네이버 외) 채널

# 2차 프로토타입 — 콘텐츠 자동화 파이프라인 SaaS

> **상태**: 🟢 Brainstorming 완료 — 핵심 결정 확정, plan 단계 진입 대기
> **작성일**: 2026-04-28
> **유형**: Product / System Design (Complex)
> **앱 이름 (가칭)**: `content-pipeline`
> **앱 위치**: `/` (루트)

---

## 1. 컨셉

### 한 줄 가치 명제

> **"주제 한 줄 던지면, AI가 인터뷰로 당신의 경험을 끌어내 한국 채널 콘텐츠로 양산해주는 SaaS"**

### 핵심 차별점

| #   | 차별점                     | 의미                                                            |
| --- | -------------------------- | --------------------------------------------------------------- |
| 1   | 🎤 **AI 인터뷰형 인풋**    | 단순 폼 입력 X — AI가 멀티턴 대화로 사용자 경험을 끌어냄        |
| 2   | 🇰🇷 **한국 채널 특화**      | 네이버 블로그, 인스타 등 글로벌 SaaS가 약한 영역                |
| 3   | 📦 **멀티 포맷 묶음 양산** | 한 주제 → 카드뉴스 + 블로그 동시 양산 (시각/텍스트 콘텐츠 묶음) |

---

## 2. 타겟 사용자

| 우선순위 | 페르소나                               | 핵심 Pain                                 | 결제 트리거                 |
| -------- | -------------------------------------- | ----------------------------------------- | --------------------------- |
| **1**    | 🎨 개인 크리에이터 / 인플루언서 지망생 | 콘텐츠 꾸준히 못 올림 / 뭘 써야 할지 모름 | 팔로워 증가 체감, 시간 절약 |
| **2**    | 🧑‍💼 1인 사업자 / 인디브랜드             | 마케팅 인력 부재, 콘텐츠 ROI 불안         | 매출/리드 연결 체감         |

> 본인용 도구 X — **일반 SaaS 서비스화가 목표**.

---

## 3. 핵심 사용자 시나리오 (Aha Moment)

**페르소나**: 인플루언서 지망생 "민지"의 첫 30분

```
1️⃣ 가입 → "어떤 주제로 콘텐츠 만들고 싶어요?"
2️⃣ 민지: "최근에 강아지 입양해서 그 후기 쓰고 싶어"

3️⃣ AI 인터뷰 (5~7개 질문):
   - "어떤 종이에요? 입양 전에 고민했던 건 뭐였어요?"
   - "입양 첫날 가장 의외였던 순간은?"
   - "지금 가장 자주 검색하는 주제는?"
   - "독자가 어떤 사람이었으면 해요? 강아지 입양 고민하는 사람?"

4️⃣ AI 양산 (1분 대기):
   ✨ 인스타 카드뉴스 8장 (썸네일 + 본문 7장)
   ✨ 네이버 블로그 글 1편 (~1500자, 마크다운)

5️⃣ 미리보기 → 살짝 편집 (제목/일부 문구)

6️⃣ 발행:
   - 네이버 블로그: "발행" 클릭 → 메일 트릭 자동 전송 → 1분 후 게시
   - 인스타: 이미지 zip 다운로드 + 캡션 복사 → 모바일에서 업로드

7️⃣ 30분 만에 첫 콘텐츠 2개 발행 완료 → "와 이거 진짜 되네" (Aha 🎉)
```

### 왜 이 시나리오가 진짜 가치인가

- 🚪 **진입장벽 낮음** — 주제 한 줄만 있으면 시작
- 💬 **AI 인터뷰가 사용자 머릿속 끌어냄** = 진짜 본인 콘텐츠 (단순 AI 글과 다른 결)
- ⚡ **30분 안에 결과 = 즉시 만족** (freemium 전환 트리거)
- 🇰🇷 **네이버 자동 + 인스타 반자동** = 한국 환경 현실적 자동화

---

## 4. 자동화 흐름

```
[사용자 입력]
  - 필수: 주제 한 줄
  - 옵션: 자료(메모/URL/사진), 톤, 키포인트
        ↓
[AI 인터뷰] ← 옵션, 깊이 있는 콘텐츠 원할 때
        ↓
[AI 양산] → 인스타 카드뉴스 + 블로그 (2차 MVP)
        ↓     추후: 링크드인 / 유튜브 / 트위터 등
[편집기] ← 사용자가 다듬기
        ↓
[발행 큐 + 스케줄러]
        ↓
[발행 → 채널]
```

### 인풋 깊이 원칙

- "최소 인풋으로도 작동, 추가할수록 품질 ↑"
- 점진적 풍부함 모델 — 사용자가 자유도 조절 가능

---

## 5. 발행 채널 전략

### 2차 MVP 채널 (Solid+ Variant)

| 채널            | 발행 방식                                       | 자동화 정도                |
| --------------- | ----------------------------------------------- | -------------------------- |
| 네이버 블로그   | n8n Email 노드 → 메일 포스팅 트릭               | ✅ 자동 (공식 기능 활용)   |
| 인스타 카드뉴스 | Meta Graph API 캐러셀 포스트 (n8n HTTP Request) | ✅ 자동 (Development Mode) |

> **Meta App 모드**: 2차 MVP는 Development Mode로 본인 Business 계정만 발행 가능 (App Review 불필요).
> 일반 사용자 출시 시 Production Mode 전환 + App Review 필요 (며칠~몇 주, 출시 직전 단계).

### 후속 채널 (3차 이후)

- **Tistory** — n8n HTTP Request + 공식 OAuth API
- **링크드인, 유튜브, 트위터 등** — n8n 노드 추가만으로 확장
- **확장 비용**: 코드 거의 없이 워크플로우 수정으로 대응

### 비추 옵션

- ❌ Selenium / Playwright 풀 자동화 — ToS 위반 + 불안정
- ❌ 비공식 API 리버스 엔지니어링 — 차단 리스크

---

## 6. n8n Internal Pattern (핵심 인프라 결정)

### 결정

**n8n을 internal automation engine으로 사용**. 사용자에게 직접 노출하지 않음 (UI/워크플로우 비공개).

### 채택 이유

1. ✅ **라이선스 안전** — Sustainable Use License는 internal 사용 허용
2. ✅ **채널 추가 속도 ↑** — 새 채널은 n8n 노드 추가만
3. ✅ **워크플로우 시각화** — 실행 로그 GUI 확인, 디버깅 용이
4. ✅ **운영 비용 합리적** — EC2 t3.small (~$15/월)에서 시작
5. ✅ **포트폴리오 차별점** — n8n 운영 경험은 흔치 않음
6. ✅ **확장성 검증됨** — Queue Mode + Worker scale-out으로 수만 건/일 가능

### 아키텍처 원칙: 우리 앱이 진실의 원천 (Source of Truth)

```
[우리 앱] = 발행 큐의 SoT (DB)
   ↓ webhook 트리거
[n8n] = 실행 엔진 (replaceable)
```

- 발행 작업은 **우리 DB 큐에 저장** (`pending → processing → published / failed`)
- n8n은 polling 또는 webhook으로 트리거
- n8n 다운 시에도 작업은 우리 DB에 보존, 재처리 가능
- 추후 어댑터 직접 구현 시 **n8n 자리만 교체** (벤더 락인 방지)

### 사용자별 격리 패턴

```
[사용자] OAuth 토큰을 우리 DB에 암호화 저장 (Tistory key, 네이버 메일, 인스타 토큰 등)
  ↓
[우리 앱] webhook 호출 (payload: 콘텐츠 + 사용자 자격증명)
  ↓
[n8n 워크플로우] (단일, 우리가 관리)
  ↓ 분기: 채널별 노드에 자격증명 동적 주입
[발행]
```

→ 워크플로우는 우리가 1개만 관리, 사용자별 데이터는 우리 DB에서.

### 리스크 & 대응

| 리스크             | 대응                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| 🔴 SPOF (n8n 다운) | 우리 DB 큐 + retry 로직 + 모니터링. 장애 시 직접 어댑터 fallback 가능 |
| 🔴 벤더 락인       | 발행 어댑터 인터페이스 추상화 → 마이그레이션 옵션 보존                |
| 🟡 학습 곡선       | 토이의 학습 가치이기도 함 (1차 NestJS 학습량과 유사)                  |
| 🟡 디버깅          | n8n UI execution log → 오히려 코드보다 시각적                         |

---

## 6.5. Solid+ MVP 스코프 (Phase 기반)

> 1차의 "Day N" 임의 마일스톤 X. 매일 dev 배포 + dogfooding으로 검증 자연스럽게.
> 정확한 일수 분배는 plan 단계에서 (예상 17~22일).

### In-scope ✅

- 인증 (Supabase Auth)
- 주제 입력 화면
- AI 인터뷰 (멀티턴 대화, 5~7개 질문)
- AI 양산 — 인스타 카드뉴스 8장(텍스트만, 단색 배경) + 블로그 마크다운 1편
- 미리보기 + 간단한 편집기
- **n8n self-host** (EC2 + Docker, internal automation engine)
- **발행 큐 DB** (앱이 SoT) + 앱 ↔ n8n webhook
- **스케줄러** (node-cron, 예약 발행)
- **네이버 블로그 자동 발행** — n8n Email 노드 (메일 포스팅 트릭)
- **인스타 카드뉴스 자동 발행** — Meta Graph API 캐러셀 포스트 (Development Mode, 본인 Business 계정만)
- 매일 dev 배포 + dogfooding

### Out-of-scope (3차 이후) ⏭

- **Tistory 자동 발행** (필요 시 3차에 n8n 노드 추가만으로 도입)
- **Meta App Review (Production)** — 일반 사용자에게 인스타 자동 풀려면 App Review 필요 (며칠~몇 주). MVP는 Development Mode로 본인만 사용
- 결제 / freemium 사용량 제한
- 대시보드 (사용자 콘텐츠 관리 페이지)
- 인스타 카드뉴스 비주얼 고도화 (템플릿/AI 이미지/사용자 자료 합성)
- 멀티 유저 onboarding UX (현재는 dogfooding 위주)

### Phase 분배 (가설, 정확한 일수는 plan에서)

> **2026-05-09 재정렬**: 원래 Phase 1에 묶여있던 인프라(ECS/n8n/Cloudflare)를 **Phase 1b로 분리하여 Phase 4 다음으로 지연**. 1~4는 로컬 + 호스티드 Supabase + Gemini API 로 굴러가므로 dogfooding 가치가 충분히 쌓이기 전까지 AWS/Cloudflare 셋업 비용을 미룸.

**로컬 단계 (1~4)**

```
Phase 1a — 인증 기반 (~2일)
  - 신규 Supabase 프로젝트 생성 + 익스텐션 마이그레이션
  - NestJS: SupabaseModule / SupabaseAuthGuard / Health (devjournal 1차 패턴 재활용)
  - Next.js: login / callback / AuthGuard (기존 5개 screens + new flow의 mock-data 유지)

Phase 2 — AI 인터뷰 (~2~3일)
  - 도메인 테이블 첫 마이그레이션 (topics, interview_sessions, interview_messages)
  - Gemini 멀티턴 prompt 설계 + 매 턴 동적 LLM 호출
  - frontend new/interview 흐름 ↔ backend API 연결

Phase 3 — AI 양산 (~2~3일)
  - drafts 테이블 마이그레이션
  - 카드뉴스 생성 (HTML→Image, 단색 배경 + 큰 타이포)
  - 블로그 마크다운 생성

Phase 4 — 미리보기 + 편집 (~2일)
  - frontend 편집기 ↔ backend API 연결
```

**클라우드 단계 (5~9)**

```
Phase 1b — 인프라 (~3~4일)  ← 지연됨
  - ECS Fargate + ECR (Docker 이미지 빌드/푸시)
  - ALB 호스트 라우팅 (api.<도메인>, n8n.<도메인>)
  - n8n self-host (ECS Task)
  - Cloudflare DNS + Zero Trust Access (n8n UI 보호)
  - GitHub Actions OIDC → ECR/ECS 배포 파이프라인

Phase 5 — 발행 인프라 (~2일)
  - 발행 큐 DB 스키마 (publish_queue, SoT 원칙) + 앱 ↔ n8n webhook + HMAC
  - 스케줄러 (node-cron, 예약 발행)

Phase 6 — 네이버 자동 (~1~2일)
  - n8n 워크플로우: 메일 포스팅 트릭

Phase 7 — 인스타 자동 (~4~5일)
  - Meta Developer App 등록 + Business 계정 전환
  - Instagram Graph API 연동 (캐러셀 포스트)
  - n8n 워크플로우: 인스타 발행
  - 카드뉴스 이미지 업로드 → 미디어 컨테이너 → 캐러셀 생성

Phase 8 — 통합 + dogfooding (~2일)
  - End-to-end 테스트
  - 본인 첫 콘텐츠 자동 발행 검증

→ 합계 약 18~23일 (버퍼 포함 ~25일)
```

### 1차 사용자 = 개발자 본인 (Dogfooding)

- 본인이 매일 쓰면서 검증 → 진짜 불편 발견 → 다음 사이클 우선순위 결정
- "민지 페르소나" 외에 **본인 시나리오**도 함께 성립
- Aha moment 검증 = 본인이 30분 안에 콘텐츠 1개 자동 발행 성공
- 일반 사용자 출시 전 단계: Meta App Review (인스타 자동 권한)

---

## 6.6. 인프라 / 배포 (확정)

### 채택: ECS Fargate + ECR

**이유**:

1. 🎯 **학습 가치 최대화** — Docker + ECR + Fargate Task Definition + ALB + IAM execution role 등 AWS 컨테이너 표준 워크플로우 전부 경험
2. 💰 **"껐다 켰다" 비용 모델과 잘 맞음** — Fargate는 task `desired count = 0` 으로 내리면 컴퓨팅 비용 = $0. EC2처럼 EBS 스토리지 비용 잔존 없음
3. 🐳 **1차와 깨끗한 분리** — 1차 devjournal-backend는 EC2 + PM2 (Docker 미사용). 2차는 처음부터 컨테이너 워크플로우로 가는 게 학습 진척에 명확
4. 🔁 **Phase B 마이그레이션 학습 사이클 가능** — 추후 ECS on EC2 / EKS 등으로 옮기는 것 자체가 또 하나의 학습 콘텐츠

### 비용 시나리오 (대략)

| 운영 상태                     | 월 비용 | 비고                        |
| ----------------------------- | ------- | --------------------------- |
| 항상 켜둠 (production 흉내)   | ~$45    | Fargate 풀가동 + ALB        |
| 개발 시간만 켬 (하루 4~6시간) | ~$25    | 부담스러우면 이 모드로 운영 |
| Idle (scale to 0, ALB만 유지) | ~$16    | 장기간 안 쓸 때             |

> 💡 비용 부담 시 ECS Service `desired count = 0` 으로 내리고 ALB만 유지. 재개 시 desired count 복귀.

### 큰 그림

```
[Cloudflare DNS + Access (Zero Trust)]
       ↓
[ALB] (호스트 기반 라우팅, public subnet)
   ├─ api.도메인 → ECS Service: content-pipeline-backend (Fargate)
   └─ n8n.도메인 → ECS Service: n8n (Fargate)
                            ↓
                       [Supabase Postgres]  ← 메인 DB + n8n 메타데이터
                       [Supabase Storage]   ← 카드뉴스 이미지 호스팅 (인스타 Graph API에 공개 URL 제공)

[GitHub Actions]
   ├─ docker build → ECR push (backend 이미지)
   └─ aws ecs update-service --force-new-deployment
```

- **VPC**: 단일 VPC + **public subnet only** (NAT Gateway $32/월 회피). Task에 public IP 할당, Security Group으로 제한.
- **컨테이너 레지스트리**: ECR (private repository, Free Tier 500MB 내)
- **로깅**: CloudWatch Logs (Free Tier 내)

### n8n 노출 방식: 채택 옵션 = **B (Cloudflare Access + public webhook)**

n8n에 들어오는 트래픽은 두 종류:

- **(a) n8n UI 접근** — 개발자 본인만 (워크플로우 편집/디버깅)
- **(b) Webhook 트리거** — 우리 backend → n8n으로 발행 작업 호출

**채택안 (B)**:

- `/admin/*`, `/rest/*` 등 UI/관리 경로는 **Cloudflare Access(Zero Trust)** 로 이메일 인증
- `/webhook/*` 만 public 노출, 우리 backend가 **HMAC 시그니처 헤더** 로 호출 (n8n 측에서 검증)
- 채택 이유: Cloudflare Tunnel/Access 무료 + 학습 가치 + 모바일/외부 디버깅 편의 + 견고한 보안

#### 다른 후보 (참고용 — 채택 안 함)

| 옵션                                                            | 구성                                                                                                                       | 채택 안 한 이유                                                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **A. 둘 다 공개 + n8n Basic Auth**                              | `n8n.도메인` 전체 공개, ID/PW 로그인. webhook도 같은 도메인에 헤더 인증                                                    | 가장 단순하지만 학습 가치 ↓. 토이로 빠르게 가려면 fallback으로 사용 가능                                                |
| **C. n8n 완전 internal (ECS Service Discovery), UI는 SSH 터널** | n8n에 public IP/ALB 미연결. backend → n8n은 ECS 내부 DNS(`http://n8n.local:5678`)로 호출. UI 접근은 Bastion/SSH 포트포워딩 | 보안은 가장 견고. 다만 디버깅마다 SSH 터널 띄워야 해서 dogfooding 사이클 느려짐. 추후 멀티유저 출시 시 재검토 가치 있음 |

> 💡 **fallback 가이드**: Cloudflare Access 셋업이 막히면 → 옵션 A로 우선 진행, 시간 생기면 B로 업그레이드. 옵션 C는 "n8n을 외부에 절대 노출 안 함" 이 비즈니스 요구로 강해질 때 (예: 사용자 OAuth 토큰을 n8n이 직접 만지게 될 때) 검토.

---

## 6.7. AI 인터뷰 흐름 설계 (확정)

> 컨셉의 핵심 차별점("AI 인터뷰형 인풋")의 구체 설계.
> Prompt 디테일/데이터 스키마는 plan 단계로 이관, 흐름 결정만 여기서.

### 결정 요약

| #   | 영역               | 결정                                                                                                                                                       |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **위상**           | Skippable 기본 경로. 주제 입력 후 인터뷰가 디폴트, 옆에 "스킵하고 바로 만들기" 버튼 노출. 스킵 시 "인터뷰 받으면 본인 결 강한 콘텐츠가 나와요" 가벼운 힌트 |
| 2   | **질문 생성 전략** | 매 턴 동적 LLM 호출. 직전 답변 + 누적 컨텍스트 보고 다음 질문 생성                                                                                         |
| 3   | **종료 조건**      | 하이브리드 — **최소 3개 강제** + **AI 판단** ("충분히 모였어요, 양산할까요?") + **사용자 "그만" 버튼** (3개 이후 노출) + **최대 8개 cap**                  |
| 4   | **UX 패턴**        | Typeform-like wizard — 한 화면 한 질문, 부드러운 페이지 전환. 상단에 진행률 표시 (`3/8 (선택)` 형태)                                                       |
| 5   | **사용자 통제권**  | 단방향 진행 (이전 버튼 X) → 인터뷰 종료 후 **리뷰 화면**에서 모든 답변 한 번에 편집 가능 → "양산" 클릭                                                     |
| 6   | **답변 형태**      | **텍스트만**. 모바일은 OS 음성받아쓰기로 자동 커버. 사진 첨부는 **주제 입력 단계 한정** (인터뷰 답변에는 X, 양산 출력에는 X — 6.5 결정 유지)               |

### 핵심 원칙

- 🎯 **차별점은 가장 강한 형태로** — "AI 인터뷰형"이 컨셉이므로 매 턴 동적 LLM이 자연스러움. 미리 만든 템플릿이면 흉내일 뿐
- ⚖️ **자유도와 품질의 균형** — 사용자에게 "그만" 버튼 주되 최소 3개는 보장 (양산 품질)
- 🔁 **단방향 + 리뷰** — 양방향은 매 턴 동적 LLM과 궁합 안 좋음 (이전 답변 수정 → 이후 질문 폐기/재생성). 종료 후 리뷰가 더 깔끔한 안전망
- 📷 **사진은 input 단계에만** — Gemini 멀티모달이 사진 보고 인터뷰 출발점 풍부하게 만듦. 인터뷰 답변/양산 출력에 끌어들이면 스코프 ↑↑

### 채택 안 한 후보 (참고용)

| 영역      | 후보                                                                                      | 채택 안 한 이유                                                         |
| --------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 위상      | B (첫 화면 분기 선택), C (AI 판단), D (필수)                                              | B는 매번 선택 압박 / C는 첫 인상 복잡 / D는 강제감                      |
| 질문 생성 | B (시드 + 동적 하이브리드), C (일괄 생성), D (일괄 + 1회 분기)                            | B는 차선 (속도 우선 시) / C·D는 "AI 인터뷰" 정체성과 어긋남             |
| 종료 조건 | A (고정 5개), B (AI 판단만), C (사용자 "그만"만)                                          | A는 dogfooding 초기 단순화 시 차선 / B는 끝이 안 보임 / C는 양산 품질 ↓ |
| UX        | A (채팅), C (채팅 + 사이드 패널), D (디바이스별 분기)                                     | A는 진행률 표시 어색 / C는 모바일 어려움 / D는 MVP 스코프 초과          |
| 통제권    | A (단방향만, 리뷰 X), C (양방향 + 리뷰), D (C + 중단/재개 저장)                           | A는 사용자 실수 시 재시작뿐 / C·D는 매 턴 동적 LLM과 궁합 + 복잡도 ↑    |
| 답변 형태 | B (텍스트 + 인터뷰 답변 사진), C (블로그 출력에 사진 박힘), D (카드뉴스 출력에 사진 박힘) | B·C·D는 양산 스코프 영향 — 6.5 "텍스트만, 단색 배경" 결정과 충돌 가능   |

### plan 단계로 이관

- 인터뷰 prompt 설계 (시스템 prompt, few-shot 예시, AI 종료 판단 기준 prompt)
- 인터뷰 답변 데이터 스키마 (`interview_session`, `interview_answer` 등)
- 진행률 UX 디테일 (`3/8 (선택)` 표기, 애니메이션)
- 리뷰 화면 편집 UX (인라인 편집? 다이얼로그?)
- LLM 호출 실패 / 타임아웃 시 처리

---

## 7. 기술 스택 결정 (확정)

| 영역              | 결정                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------- |
| **앱 위치**       | `/` (루트)                                                                                  |
| **MVP 스코프**    | **Solid+ MVP** (Tistory 제외 변형) — n8n 자동 발행 (네이버+인스타) + 스케줄러, 예상 17~22일 |
| **AI LLM**        | `gemini-2.5-flash` 메인 + 폴백 체인 (`2.5-flash-lite` → `2.0-flash` → `2.0-flash-lite`)     |
| **AI Embedding**  | `gemini-embedding-001` (768dim) — 추후 콘텐츠 유사도/검색 확장 시 활용                      |
| **AI SDK**        | `@google/generative-ai`                                                                     |
| **백엔드**        | NestJS                                                                                      |
| **프론트엔드**    | Next.js App Router                                                                          |
| **DB**            | Supabase — content-pipeline 전용 프로젝트. auth.users / RLS / 마이그레이션 모두 독립        |
| **카드뉴스 렌더** | HTML → Image (Puppeteer 또는 Satori), 단색 배경 + 큰 타이포                                 |
| **인증**          | Supabase Auth + `SupabaseAuthGuard`                                                         |
| **결제**          | Lean MVP out-of-scope. 3차 이후 Toss Payments 우선 검토                                     |

## 7.5. plan 단계 / 후속 사이클로 미룬 결정

> brainstorming에서는 결정하지 않고, plan 또는 후속 사이클에서 다룸.

- **시스템 아키텍처 디테일** — 모듈 구조, DB 스키마(topic/interview/generation/draft/publish_queue 등), API 라우트, n8n 워크플로우 페이로드 스키마 → plan 단계
- **인증 구현 방식 선택** (Supabase Auth vs 1차 JWT 모듈 재활용) → plan 단계
- **카드뉴스 렌더 라이브러리 확정** (Puppeteer / Satori / Canvas) → plan 단계
- **인스타 캐러셀 발행 디테일** — 미디어 컨테이너 생성 순서, 이미지 호스팅(Supabase Storage 등), Graph API 에러 핸들링 → plan 단계
- **Tistory 자동 발행** → 3차
- **Meta App Review (Production Mode)** → MVP 출시 직전 단계
- **결제 / freemium / 사용량 제한** → 3차 이후
- **수익화 모델 가설** (freemium / paid / pay-as-you-go) → MVP 검증 후
- **카드뉴스 비주얼 고도화** (디자인 템플릿, AI 이미지 생성, 사용자 자료 합성) → 3차 이후
- **멀티 유저 onboarding UX** → 3차 (dogfooding 단계는 본인용 UX로 충분)
- **브랜드 네이밍 정식 확정** → MVP 검증 후 또는 출시 직전

---

## 8. Plans

| Phase | Plan                                                                         | 상태                              |
| ----- | ---------------------------------------------------------------------------- | --------------------------------- |
| 1a    | [Phase 1a — 인증 기반](./2026-05-09-content-pipeline-phase-1a.md)            | 완료 (#1)                         |
| 2     | [Phase 2 — AI 인터뷰](./2026-05-10-content-pipeline-phase-2.md)              | 완료 (#3, #4)                     |
| 3     | [Phase 3 — AI 양산](./2026-05-12-content-pipeline-phase-3.md)                | 완료 (#5)                         |
| 4     | [Phase 4 — 블로그 편집/미리보기](./2026-05-13-content-pipeline-phase-4.md)   | 완료 (#6)                         |
| 5     | [Phase 5 — 대시보드/라이브러리 실데이터](./2026-05-14-content-pipeline-phase-5.md) | 완료 (#7, #8)                     |
| 6     | [Phase 6 — 카드뉴스 편집 + AI 이미지 + PNG export](./2026-05-15-content-pipeline-phase-6.md) | 완료 (브랜치 `claude/phase-6-implementation`) |
| 7     | [Phase 7 — LLM provider 마이그레이션 (Gemini → OpenAI)](./2026-05-16-llm-migration-openai.md) | 완료 (브랜치 `claude/phase-7-llm-migration`) |
| 1b    | _Phase 1b — 인프라 (ECS/n8n/Cloudflare, 발행 진입 직전)_                     | —                                 |
| 8     | _Phase 8 — 발행 인프라 (큐/스케줄러/n8n webhook)_                            | —                                 |
| 9     | _Phase 9 — 네이버 자동_                                                      | —                                 |
| 10    | _Phase 10 — 인스타 자동_                                                     | —                                 |
| 11    | _Phase 11 — 통합 + dogfooding_                                               | —                                 |

> Out-of-scope backlog: [docs/backlog.md](../backlog.md) — Phase 6 진행 중 미룬 항목 (Storage 영속화 / 사진 위치 조절 / 탭 라우팅 / 캐러셀 미리보기 / 캡션 자동 생성 등) 모음.

> **2026-05-13 분배 재정렬**: 기존 Phase 4(편집+미리보기) 를 새 Phase 4(블로그) + 새 Phase 5(카드뉴스) 로 쪼개고, 기존 Phase 5~8(발행 단계) 은 각각 +1 씩 뒤로 (Phase 6~9). 인프라(Phase 1b) 는 발행 진입 직전.
>
> **2026-05-14 분배 재정렬**: 새 Phase 5 = 대시보드/라이브러리 실데이터(딱 리스트 표기까지), 기존 Phase 5(카드뉴스 편집) → Phase 6 으로 밀고 발행 단계들(6~9) → 7~10. 인프라(1b) 위치는 그대로 — 새 Phase 6 과 새 Phase 7 사이.
>
> **2026-05-16 분배 재정렬**: Phase 6 마감. LLM provider 가 Gemini → OpenAI 로 일괄 교체될 가능성이 커서 발행 단계(원 Phase 7~10) 직전에 별도 phase 신설 — 새 Phase 7 = LLM 마이그레이션, 이전 발행 단계(7~10)는 +1 씩 뒤로 (8~11). 인프라(1b) 위치는 그대로 — 새 Phase 7 과 새 Phase 8 사이.

> 직전 Phase 완료 후 다음 plan을 순차 작성. Phase 1a가 굳혀야 Phase 2 위에 얹을 토대가 명확해짐.
>
> **폐기**: `toy-monorepo/docs/superpowers/plans/2026-05-01-content-pipeline-phase-1.md` — `apps/content-pipeline/`을 toy-monorepo 안에 신설하는 전제로 작성됐으나, 이후 별도 레포(`/Users/dawoon/Desktop/dev/content-pipeline`)로 분리되어 디렉토리 가정이 어긋남. 결정만 본 design 문서에 흡수하고 plan은 새로 작성.

---

## 9. 결정 이력

- **2026-04-28**: 1차 프로토타입(DevJournal Day 14) 종료 결정 → 컨셉 피벗
- **2026-04-28**: 새 컨셉 = AI 인터뷰 기반 콘텐츠 자동화 SaaS
- **2026-04-28**: 타겟 = 개인 크리에이터(1순위) + 1인 사업자(2순위)
- **2026-04-28**: 발행 채널 = 네이버(메일 트릭) + Tistory(API) + 인스타(반자동)
- **2026-04-28**: n8n internal pattern 채택, 사용자에게 노출 X
- **2026-04-28**: 우리 앱이 발행 큐의 SoT, n8n은 replaceable 실행 엔진
- **2026-04-28**: 앱 위치 = `apps/content-pipeline/` 신설 + `apps/devjournal/` read-only 보존 (B-3 모드)
- **2026-04-28**: 가칭 이름 = `content-pipeline` (브랜드 네이밍은 추후 정식 결정)
- **2026-04-28**: 2차 MVP = **Lean MVP** (수동 발행, 14일 분배), n8n/자동발행/결제는 3차 이후
- **2026-04-28**: 1차 사용자 = 개발자 본인 (dogfooding), 토이프로젝트 성격 살려 본인 검증부터
- **2026-04-28**: AI 모델 = 1차와 동일한 Gemini 스택 재활용 (`gemini-2.5-flash` 메인 + 폴백 체인, `gemini-embedding-001` 임베딩, `@google/generative-ai` SDK)
- **2026-04-28**: 인스타 카드뉴스 비주얼 = Lean MVP는 텍스트만 (단색 배경), 템플릿/AI 이미지는 3차 이후
- **2026-04-28**: Supabase = 1차 DevJournal과 같은 인스턴스 + 새 스키마/테이블 (무료 티어 절약, 인증/배포 환경 재활용)
- **2026-04-28**: MVP 스코프 변경 — Lean MVP(수동 발행) → **Solid+ MVP** (n8n 자동: 네이버 + 인스타, 스케줄러 포함). Tistory는 3차로 미룸
- **2026-04-28**: 14일 고정 마일스톤 폐기 → **Phase 기반 분배** (예상 17~22일, 정확한 일수는 plan 단계에서 결정)
- **2026-04-28**: 인스타 자동 발행 = Meta App **Development Mode**로 dogfooding (본인 Business 계정만 사용, App Review 불필요). Production Mode 전환 + App Review는 일반 사용자 출시 직전 단계
- **2026-04-29**: 컨테이너 오케스트레이션 = **ECS Fargate + ECR** 채택 (Docker 학습 + "껐다 켰다" 비용 모델 적합). 후보였던 EC2 + Docker Compose / ECS on EC2는 후속 학습 사이클 옵션으로 메모
- **2026-04-29**: 네트워크 = 단일 VPC + public subnet only (NAT Gateway 비용 회피), Security Group 제한
- **2026-04-29**: n8n 노출 방식 = **B (Cloudflare Access + public webhook)** 채택. UI/관리 경로는 Cloudflare Zero Trust 이메일 인증, `/webhook/*` 만 public + HMAC 시그니처. 후보 A(전체 공개 + Basic Auth) / C(완전 internal + SSH 터널)는 fallback/후속 검토용으로 메모
- **2026-04-29**: 1차 devjournal 인프라 = 기존 EC2 + PM2 그대로 read-only 유지, 2차로 마이그레이션 X
- **2026-04-29**: AI 인터뷰 위상 = **skippable 기본 경로** (스킵 가능, 스킵 시 양산 품질 안내). B(분기 선택)/C(AI 판단)/D(필수) 후보는 메모로 남김
- **2026-04-29**: AI 인터뷰 질문 생성 = **매 턴 동적 LLM 호출**. 차별점("AI 인터뷰형")을 가장 강한 형태로 구현. B(시드+동적)/C(일괄)/D(일괄+분기) 후보는 메모
- **2026-04-29**: AI 인터뷰 종료 조건 = **하이브리드** (최소 3개 + AI 판단 + 사용자 "그만" + 최대 8개). A(고정 N)/B(AI만)/C(사용자만) 후보는 메모
- **2026-04-29**: AI 인터뷰 UX = **Typeform-like wizard** (한 화면 한 질문, 진행률 표시). A(채팅)/C(채팅+사이드)/D(디바이스별 분기) 후보는 메모
- **2026-04-29**: AI 인터뷰 사용자 통제권 = **단방향 + 종료 후 리뷰 화면 편집**. A(단방향만)/C(양방향+리뷰)/D(C+중단재개) 후보는 메모
- **2026-04-29**: AI 인터뷰 답변 형태 = **텍스트만** (모바일은 OS 음성받아쓰기). 사진 첨부는 **주제 입력 단계 한정** (인터뷰 답변/양산 출력엔 X, 6.5 텍스트만 결정 유지)

---

- **2026-05-01**: Phase 1 plan 작성 완료. 핵심 결정 — 인증 = Supabase Auth + `SupabaseAuthGuard` 1차 devjournal 패턴 1:1 재활용 (NestJS JWT 옵션 폐기), 도메인 테이블 = `cp_*` 접두어로 `public` 스키마 격리(별도 DB 스키마 분리는 미사용 — Supabase PostgREST 노출 설정 회피), n8n 영속 = 같은 Supabase Postgres의 별도 `n8n` schema + `n8n_runner` role, 배포 자동화 = GitHub Actions OIDC → ECR/ECS update-service
- **2026-05-01**: **DB 결정 변경** — content-pipeline 전용 **신규 Supabase 프로젝트** 생성 (1차 devjournal Supabase는 pause). 이전 결정(2026-04-28 "1차와 같은 인스턴스" + 2026-05-01 "`cp_*` 접두어 + public schema") 폐기. 사유 — (1) 일반 SaaS 출시 대상이라 1차 dogfooding 사용자와 분리 필요 (2) RLS/마이그레이션 격리로 사고 위험 ↓ (3) 1차 pause로 무료 슬롯 재배치 가능. 영향 — 도메인 테이블 접두어 제거(자유로운 이름), `auth.users` 분리(양쪽 별도 가입), `.env`에 cp 전용 키 사용, n8n schema는 cp Supabase Postgres에 위치(이전 결정 그대로)
- **2026-05-01**: `SupabaseService` 구현 패턴 = devjournal 1차 실구현 1:1 재활용 (`ConfigService.getOrThrow` + constructor 주입 + `SupabaseClient<Database>` 타입드 + `anon`/`admin` 네이밍). 이전 plan 초안(`process.env` + `OnModuleInit` + `serviceRole` 네이밍) 폐기 — backend-code-style.md "🔧 설정 관리"의 ConfigModule 사용 원칙 + Phase 2 도메인 테이블 도입 시 IDE 자동완성 지원
- **2026-05-09**: **Phase 분배 재정렬** — 원래 Phase 1(기반)을 **1a(인증, 로컬)** + **1b(인프라, 클라우드)** 로 분리하고 1b를 Phase 4 다음으로 지연. 사유: Phase 2~4(인터뷰/양산/편집)는 로컬 + 호스티드 Supabase + Gemini API 만으로 dogfooding 가능. AWS ECS / n8n self-host / Cloudflare Access 셋업은 dogfooding 가치가 충분히 쌓인 후로 미뤄 초반 인프라 부담을 줄임. 발행(Phase 5~7)은 클라우드 인프라가 필수라 1b 다음에 위치.
- **2026-05-09**: **레포 구조 변경** — content-pipeline 을 `toy-monorepo` 안의 `apps/content-pipeline/`이 아니라 **별도 레포 `/Users/dawoon/Desktop/dev/content-pipeline`** (pnpm + turborepo) 로 분리. 사유: 일반 SaaS 출시 대상이라 toy 성격 레포에서 분리 필요. 영향 — 2026-05-01 Phase 1 plan 폐기, 신규 plan은 본 레포의 `docs/plans/` 에 작성
- **2026-05-09**: **모바일 앱 확장 시 인증 재사용** — 추후 iOS/Android 또는 RN/Flutter 앱으로 확장하더라도 **Supabase Auth SDK 그대로 재활용** (Firebase Auth 도입 X). 사유: 두 인증 시스템 병행 시 사용자 매핑 / RLS 분기 비용이 큼. 푸시 알림이 필요해도 FCM 은 device token 기반이라 Auth 와 독립 — Firebase 프로젝트는 FCM sender 용도로만 사용 가능
- **2026-05-10**: Phase 2 plan 확정. 도메인 = `topics` / `interview_sessions` / `interview_messages` 3 테이블 + RLS. `(topic_id) where status='active'` partial unique 로 active session 단일성, `(session_id, turn, role)` unique 로 같은 turn = assistant Q + user A 한 쌍 강제. backend 는 admin(service-role) 로 RLS 우회 + controller 단 ownership 직접 확인 (`NotFound` vs `Forbidden` 분리). AI 인터뷰 상태머신 = MIN(3) ≤ N < MAX(8) 구간만 enough judge LLM 호출 (비용 최적화), MAX 도달 시 judge 없이 `max_reached` 강제 종료. Gemini 호출은 인터뷰어 / judge 별도 — 페르소나 `systemInstruction` (자연어 질문) vs YES/NO 강제 출력으로 역할 분리
- **2026-05-11**: 프론트엔드 API 레이어 도구 = **axios + TanStack Query** 채택. axios instance 의 request interceptor 가 `createBrowserSupabaseClient()` 싱글톤에서 직접 token 조회 → 페이지/훅에서 `supabase` 인자 전파 제거. TanStack Query 는 Phase 3 의 refresh hydrate / 목록 캐싱 / mutation invalidation 자리 선점 (본 Phase 는 mutation-only 라 `useMutation` 마이그레이션은 Phase 3 와 함께 일괄). 후보 — 모듈 레벨 `setAccessTokenGetter` 패턴은 SupabaseProvider mount 순서 의존 race 우려로 폐기, fetch 직접 사용은 인터셉터 확장성 부족으로 폐기
- **2026-05-11**: Supabase API 키 = **publishable / secret 시스템 (`sb_publishable_*` / `sb_secret_*`)** 채택. legacy anon/service_role JWT 키가 신규 프로젝트에서 signature reject 되는 케이스 → 새 시스템으로 전환. 코드 변경 없이 env 값만 교체 (변수 이름은 기존 `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 유지 — 향후 별도 리네임 PR 후보)
- **2026-05-12**: Phase 3 plan 확정. 양산 = sync 단일 POST + Gemini 2회 호출(카드 JSON / 블로그 마크다운), `drafts` 1 topic : 1 row(regenerate replaces). 카드 HTML→Image 렌더는 Phase 7(인스타 발행) 로 이관 — `/new/edit` 가 JSON 으로 직접 렌더, 이미지 자산은 발행 시점에만 필요. 색상 팔레트 7쌍 화이트리스트로 LLM 출력 컨트롤. zod ^4.4.3 backend dep 추가 (LLM JSON 검증 + class-validator deep tuple 약점 보완).
- **2026-05-13**: **Phase 분배 재정렬**. 기존 Phase 4(편집+미리보기) 를 둘로 쪼개 새 Phase 4 = 블로그 전용, 새 Phase 5 = 카드뉴스 전용 으로 분리. 기존 Phase 5~8(발행 인프라 / 네이버 / 인스타 / dogfooding) 은 각각 +1 씩 뒤로 (Phase 6~9). 사유 — 블로그/카드뉴스의 편집 UX 가 본질적으로 다르고 한 phase ~2일 가설을 지키려면 분리가 필요. 인프라(Phase 1b) 위치는 그대로 — 새 Phase 5 와 새 Phase 6 사이.
- **2026-05-13**: Phase 4 plan 확정. 블로그 태그 데이터 모델 = DB 컬럼 분리(`drafts.blog_tags text[]`) + prompt 출력 형식 `TAGS:` prefix 별도 줄로 변경 (Phase 3 의 `#태그` 마지막 줄 규약 폐기) — 마크다운 헤딩 충돌 회피. 편집 UX = split layout(좌 raw 마크다운 textarea / 우 react-markdown 실시간 프리뷰, 50:50, 스크롤 동기화 X) + chip 태그 + CharGuide(1200~1800자 가이드) + Autosave(debounce 800ms, AutosaveIndicator saved/saving/failed 3상태, beforeunload + 라우팅 가드). Pretendard 단일 한국어 sans 도입(JetBrains Mono / Source Serif 4 미도입, 본문 textarea 만 시스템 monospace fallback). 인프라 의존 작업은 모두 발행 phase 로 이관 (네이버 채널 미리보기 mockup 등).
- **2026-05-14**: **Phase 분배 재정렬**. 새 Phase 5 = 대시보드/라이브러리 실데이터 연결(딱 리스트 표기까지). 기존 Phase 5(카드뉴스 편집) → Phase 6 으로 밀고 발행 단계들(6~9) → 7~10. 사유 — Phase 4 dogfooding 진입 시 본인 양산 콘텐츠가 두 화면에서 안 보이는 게 답답해 우선순위 재배치.
- **2026-05-14**: Phase 5 plan 확정. backend `GET /api/drafts` 신설 + frontend `useQuery(qk.drafts())` + `draftToContent` 어댑터(`lib/api/adapters.ts`)로 mock LIBRARY_ITEMS 제거. drafts.status → Content.state 매핑(pending/generating → processing, ready → draft, failed → failed). 필터 / 검색 / 발행큐 / hero stat 은 out — 발행 phase 묶음.
- **2026-05-14**: Phase 5 도중 scope 확장. 상세 페이지(`/library/[id]`) lookup 도 본 phase 로 끌어옴 — 라이브러리 카드 클릭 시 mock LIBRARY_ITEMS.find 로 404 떨어지는 문제 회피. 페이지를 client component 로 변환 + DetailInsta/DetailBlog 가 card_news / blog_title·body·tags prop 으로 직접 받음. DetailOverview 의 인터뷰 영역과 DetailActivity 는 그대로 mock(다음 phase 또는 발행 phase).
- **2026-05-14**: Phase 5 도중 scope 확장 #2. 편집 라우트를 `?mode=blog` 쿼리에서 `/edit/[mode]` dynamic segment 로 전환 + mock 폐기 + 실데이터 autosave 연결. `/new/edit` 의 DraftEditor autosave 패턴(800ms debounce, pending flag, beforeunload) 을 단일 mode 로 축약 재사용. 기존 `BlogEditPanel.tsx` / `[id]/edit/page.tsx` 폐기, `routes.libraryItemEdit(id, mode)` 의 mode 인자 required 화. 저장 후 `qk.drafts()` 리스트 캐시의 해당 row 만 갱신.
- **2026-05-16**: Phase 6 마감. CardNewsEditor 텍스트 갭(cover tag / outro cta / 카드 추가 type dropdown) + features/insta-export (1080 캡처 컴포넌트 + html-to-image + jszip PNG zip 헤더 actions 다운로드) + 모든 카드(cover/body/outro)에 AI 재생성(stub / pollinations / gemini 3-mode env) + 로컬 업로드(FileReader → data URL, in-memory) + 이미지 제거 토글. backend zod 를 양산용 cardNewsSchema(tuple, LLM 출력 검증)와 편집용 cardNewsEditSchema(array max 8 / bg·fg 자유 hex regex) 로 분리 — 편집 단계 자유도 확보 + autosave 400 루프 해소. CardNewsEditor 모듈화(566 → 본체 ~200줄 + 5 자식 컴포넌트 + presets, CardNewsEditor/ 폴더 구조). 인스타 swipe 캐러셀 / 사진 위치 조절 / Storage 영속화는 [backlog](../backlog.md) 로 미룸. 작업 브랜치 `claude/phase-6-implementation`, 9 commits.
- **2026-05-17**: Phase 7 마감 (LLM provider 마이그레이션). Gemini → OpenAI 통일 — 텍스트 `gpt-5` 메인 + `gpt-5-mini` 폴백, 이미지 `gpt-image-1` (1024×1024 medium). backend `gemini/` → `llm/` rename, `LlmService` 단일 클래스 + 자체 중립 타입 `LlmRequest` (system / messages / temperature / jsonMode) 도입으로 SDK 결합 청산. `IMAGE_GEN_MODE` 도메인 `stub | pollinations | gemini` → `stub | openai`. JSON 강제는 `response_format: { type: 'json_object' }`, 카드뉴스 응답 shape `[ ... ]` → `{ cards: [ ... ] }` 로 (OpenAI JSON 모드 호환). Pollinations 한→영 prompt 번역 + `buildCardImagePromptForFlux` 폐기. gpt-5 family 가 `temperature` default(1)만 지원하는 제약 발견 → `LlmService` 가 LlmRequest.temperature 를 OpenAI 호출에서 무시 (인터페이스는 미래 호환 유지). frontend 응답 shape / 라우트 시그니처 / DB 변경 없음 — 양산/인터뷰/이미지 재생성 모두 회귀 없음. 양산 1회 비용 ~$0.1 미만 확인.

---

## 10. 참고 — 1차 프로토타입과의 연결

- **재활용 가능 자산**: NestJS + Supabase + JWT 인증, 모노레포 구조, AI API 연동 경험, EC2 배포 경험
- **재활용 가능 아이디어**: 1차 ideation 메모(`project_devjournal_ideation.md`)의 "AI 생각 도출" 아이디어가 본 컨셉의 AI 인터뷰로 발전
- **계승 안 함**: DevJournal의 일기/마인드맵/대시보드 기능은 본 컨셉과 무관 (별도 앱으로 archive)

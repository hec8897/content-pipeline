# Runbook — Phase 8-1 발행 n8n stub 워크플로우 + 라운드트립 검증

> Phase 8-1 C5. 백엔드 코드(C1~C4)는 라운드트립 로직을 더미 n8n 으로 이미 검증함. 여기서는 **진짜 n8n** 을 연결해 전체 경로를 닫는다. 인프라/n8n 작업이라 Claude 는 가이드만, 실행은 직접. (read-only describe / curl 은 같이.)

## 경로 한 줄

```
[워커] ──트리거(HMAC)──> [n8n stub (클라우드)] ──콜백(HMAC)──> [백엔드 /api/webhook/publish-result] ──> job published
```

n8n 은 클라우드(`n8n.dawoon.dev`)라 콜백은 **클라우드 백엔드**(`api.dawoon.dev`)로 가야 한다. → 전체 라운드트립 검증은 **C1~C4 가 main 머지·배포된 뒤** 가능.

---

## 사전: 공유 HMAC 시크릿

n8n 과 백엔드가 같은 `HMAC_WEBHOOK_SECRET` 을 알아야 양방향 서명이 맞는다. 32바이트 hex 권장:

```bash
openssl rand -hex 32
```

이 값을 **(a) SSM, (b) n8n** 양쪽에 동일하게 넣는다. 아래 단계에서 `<SECRET>` 로 표기.

서명 스킴(백엔드와 동일하게 맞출 것):

```
x-cp-signature: sha256=<hex(HMAC_SHA256(rawBody, SECRET))>
```

- **트리거(앱→n8n)**: 백엔드가 위 서명을 보냄. n8n 이 검증(stub 에선 선택).
- **콜백(n8n→앱)**: n8n 이 콜백 바디로 위 서명을 만들어 보냄. 백엔드가 **반드시** 검증(틀리면 401). → n8n 의 서명 정확성이 핵심.

---

## Step 1 — SSM 파라미터 2개 추가 (직접 실행)

```bash
# 공유 시크릿 (SecureString)
aws ssm put-parameter --name /cp/HMAC_WEBHOOK_SECRET \
  --value "<SECRET>" --type SecureString --region ap-northeast-2

# 워커가 트리거할 n8n webhook URL
aws ssm put-parameter --name /cp/N8N_WEBHOOK_URL \
  --value "https://n8n.dawoon.dev/webhook/publish" --type String --region ap-northeast-2
```

확인(값 미노출):
```bash
aws ssm get-parameters-by-path --path /cp/ --recursive --query "Parameters[].Name" --output text
```

---

## Step 2 — ECS backend task def 에 secret 2개 주입 (직접 실행)

`cp-backend` task def 컨테이너의 `secrets` 배열에 추가:

```json
{ "name": "HMAC_WEBHOOK_SECRET", "valueFrom": "arn:aws:ssm:ap-northeast-2:837411606914:parameter/cp/HMAC_WEBHOOK_SECRET" },
{ "name": "N8N_WEBHOOK_URL",     "valueFrom": "arn:aws:ssm:ap-northeast-2:837411606914:parameter/cp/N8N_WEBHOOK_URL" }
```

**권장 = AWS Console** (ECS → Task definitions → `cp-backend` → Create new revision → Container → Environment variables → Add secret 2개 → Create). CLI 보다 실수 적음.

새 revision 등록 후 서비스가 그 revision 을 쓰도록 갱신(Step 4 의 배포가 force-new-deployment 만 하므로, task def revision 변경은 별도로 서비스에 반영 필요):
```bash
aws ecs update-service --cluster cp-cluster --service cp-backend-svc \
  --task-definition cp-backend:<새revision> --region ap-northeast-2
```

---

## Step 3 — n8n stub 워크플로우 구성 (n8n UI)

`https://n8n.dawoon.dev` 접속(Cognito 로그인) → New Workflow. 노드 4개 (내장 노드만, Code/require 안 씀):

```
[Webhook] → [Edit Fields(Set)] → [Crypto(HMAC)] → [HTTP Request]
```

### 3-1. Webhook 노드 (수신)
- HTTP Method: `POST`
- Path: `publish` → 최종 URL `https://n8n.dawoon.dev/webhook/publish` (SSM `N8N_WEBHOOK_URL` 과 일치)
- Respond: `Immediately` (200 즉시 응답 — 워커는 트리거 성공만 보면 됨. 응답 후 나머지 노드 계속 실행됨)
- 들어온 jobId 는 이후 노드에서 `{{ $json.body.jobId }}` 로 참조.

### 3-2. Edit Fields(Set) 노드 — 콜백 바디 문자열 만들기
콜백으로 보낼 JSON 을 **하나의 문자열 필드**로 고정한다(서명 대상 = 전송 대상 동일하게).
- 새 필드: 이름 `callbackBody` (String), 값(expression):
  ```
  ={{ JSON.stringify({ jobId: $json.body.jobId, status: 'published', externalRef: 'n8n-stub' }) }}
  ```

### 3-3. Crypto 노드 — HMAC-SHA256 서명
n8n 내장 Crypto 노드. (`require` 불필요)
- Action: `HMAC`
- Type: `SHA256`
- Value: `={{ $json.callbackBody }}`  ← 3-2 가 만든 문자열
- Secret: `<SECRET>` (SSM `HMAC_WEBHOOK_SECRET` 과 동일 값)
- Encoding: `Hex`
- Property Name(출력): `signatureHex` (기존 필드 유지됨)

### 3-4. HTTP Request 노드 — 콜백 전송
- Method: `POST`
- URL: `https://api.dawoon.dev/api/webhook/publish-result`
- Headers:
  - `x-cp-signature` = `=sha256={{ $json.signatureHex }}`  ← `sha256=` 접두사 + Crypto 출력
  - `content-type` = `application/json`
- Body: `Raw` / JSON, 값 = `={{ $json.callbackBody }}`  ← 3-2 문자열 그대로(서명한 것과 동일 바이트)

저장 + **Activate**.

> ⚠️ 핵심 불변량: **3-2 의 `callbackBody` 문자열을 그대로 (a) Crypto 가 서명하고 (b) HTTP 가 전송**한다. 이 둘이 한 글자라도 다르면 백엔드가 401. Set→Crypto→HTTP 가 같은 `callbackBody` 를 참조하므로 일치 보장.

---

## Step 4 — C1~C4 main 머지 → 자동 배포

`feat/phase-8-1-publish-queue` → develop → main PR 머지. GitHub Actions(`deploy-backend.yml`)가 ECR push + `update-service --force-new-deployment` 수행 → 클라우드 백엔드에 publish 모듈 반영.

배포 완료 확인:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.dawoon.dev/api/health   # 200
```

---

## Step 5 — 전체 라운드트립 검증 (배포 후, 같이)

> 인증 토큰 필요(`SupabaseAuthGuard`). `app.dawoon.dev` 로그인 후 브라우저 devtools 에서 access token 확보 → `$TOKEN`.

```bash
DRAFT=<ready 상태 draft id>
TOKEN=<supabase access token>

# 1) 발행 요청 → job pending 생성
curl -s -X POST https://api.dawoon.dev/api/drafts/$DRAFT/publish \
  -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" \
  --data '{"channels":["naver"]}'

# 2) ≤10초 후 워커가 n8n 트리거 → n8n stub 콜백 → published. 상태 확인:
curl -s https://api.dawoon.dev/api/drafts/$DRAFT/jobs -H "Authorization: Bearer $TOKEN"
#   기대: status 가 pending → processing → published 로 전이
```

검증 체크리스트:
- [ ] 발행 요청 → `pending` 2 row(채널 2개 시) 생성
- [ ] 워커 트리거 → n8n execution log 에 실행 기록 + `processing`
- [ ] n8n 콜백 → `published`, `external_ref='n8n-stub'`
- [ ] (음성) 변조 서명 콜백 → 401 (이미 C4 로컬 검증됨)
- [ ] 예약 발행(`scheduledAt` 미래) → 시각 도달 후 트리거
- [ ] n8n stub 비활성화(Deactivate) → 트리거 실패 → 자동 재시도 backoff → max 도달 `failed`

---

## 트러블슈팅

- **콜백 401**: n8n 이 서명한 `body` 와 실제 전송 바디 불일치(공백/순서/인코딩). Code 노드의 `body` 문자열을 HTTP Request 가 raw 로 그대로 보내는지 확인.
- **트리거는 가는데 n8n 실행 안 됨**: Webhook path/method 불일치 또는 워크플로우 Activate 안 됨.
- **시크릿 불일치**: SSM `HMAC_WEBHOOK_SECRET` 과 n8n Code 노드 SECRET 이 같은 값인지.
- **job 이 processing 에 정체**: 콜백이 안 옴(n8n HTTP 노드 실패) 또는 콜백 401. n8n execution log + 백엔드 로그 확인.

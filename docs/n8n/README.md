# n8n 인스타 발행 워크플로우

`insta-publish.workflow.json` — 백엔드 발행 트리거(webhook)를 받아 인스타 캐러셀을
Graph API(`graph.instagram.com`)로 발행하고, 결과를 백엔드 콜백으로 회신.

흐름: Webhook 수신 → 이미지별 미디어 컨테이너 → 캐러셀 컨테이너 → `status_code` FINISHED 폴링
→ `media_publish` → 콜백 바디 문자열 고정 → HMAC 서명 → `POST /api/webhook/publish-result`.

## 셋업 (Import 후 채울 값 3개)
1. **인스타 캐러셀 발행**(Code) — `ACCESS_TOKEN` = IG 장수명 토큰(`IGAA…`). `IG_USER_ID`는 채워둠.
2. **HMAC 서명**(Crypto) — `secret` = 백엔드 `.env`의 `HMAC_WEBHOOK_SECRET`과 **동일 값**.
3. **백엔드 콜백**(HTTP) — URL은 `http://host.docker.internal:3001/api/webhook/publish-result`(로컬 Docker n8n 기준).

저장 → **Activate** → 백엔드 `.env`의 `N8N_WEBHOOK_URL=http://localhost:5678/webhook/publish`.

## 주의 (디버깅 교훈)
- **콜백 HMAC**: 백엔드는 `sha256=HMAC-SHA256(rawBody, secret)`를 raw 바이트로 검증. n8n Crypto secret이
  백엔드 `.env`와 **정확히 같아야** 콜백 401이 안 난다. (그래서 콜백 바디를 문자열로 고정해 서명·전송 바이트를 일치시킴.)
- **media_publish 400**: 캐러셀 컨테이너가 `FINISHED` 되기 전에 publish하면 400. → status_code 폴링 필수.
- **토큰**: n8n Code 편집기에 붙여넣을 때 잘 깨짐(code 190 "cannot parse"). 붙여넣고 head/len 확인 권장.
- n8n Code 노드엔 `URLSearchParams` 없음 → `encodeURIComponent`. IG 에러 본문은 `returnFullResponse + ignoreHttpStatusErrors`로 봐야 보임.

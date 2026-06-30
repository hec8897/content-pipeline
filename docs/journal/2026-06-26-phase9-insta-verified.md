# 일지 — 2026-06-26 · Phase 9 인스타 발행 실연동 검증 완료

[2026-06-22 일지](./2026-06-22-phase9-insta.md)에서 이어짐. 그날 남긴 "n8n 등록/실발행/PR"을 이날 다 끝냄.

## 한 일
- **n8n 인스타 워크플로우(N1)** 작성 → 로컬 Docker n8n에 import. `docs/n8n/insta-publish.workflow.json`(+README).
- **풀 라운드트립 검증 성공** — 프론트 발행 버튼 → 카드 렌더 → Storage 업로드 → 큐 → 워커 → n8n → **인스타 실제 캐러셀 게시** → 콜백 → `status=published` + `external_ref`(IG media id) 자동 기록.
- **PR #25 Ready 전환** (OPEN, → develop).
- 클라우드 ECS 둘 다 desired-count 0 (비용 절감, 로컬 Docker로만 dev).

## 막혔다 푼 것 (디버깅 교훈)
- **media_publish 400**: 캐러셀 컨테이너가 `FINISHED` 되기 전 publish하면 400 → `status_code` 폴링 추가로 해결.
- **토큰 깨짐**: n8n Code 편집기에 토큰 붙여넣을 때 값이 망가져 code190 "cannot parse" → 재입력으로 해결. (head/len 확인 권장)
- **에러 안 보임**: n8n httpRequest가 IG 에러 본문을 숨김 → `returnFullResponse:true, ignoreHttpStatusErrors:true`로 봐야 보임. `URLSearchParams` 없음 → `encodeURIComponent`.
- **콜백 HMAC 401**: n8n Crypto 노드 secret ≠ 백엔드 `.env` HMAC_WEBHOOK_SECRET. 백엔드는 `openssl`로 서명한 curl 테스트로 정상 확인 → n8n Crypto에 .env 값 재입력으로 해결.
- **일시적 TLS 끊김**: 8장 연속 POST 중 1건 socket disconnect → 워커 자동 재시도(attempts=2)가 복구해 발행 성공. (재시도 로직 실전 검증)

## 남은 일
- PR #25 리뷰 후 develop 머지. 인스타 테스트 중복 게시물 삭제. (선택) stuck 잡 `f421dd7f` 정리.
- 멀티유저 토큰(우리 DB 암호화 저장)은 Meta App Review(Production) 게이트 뒤 backlog.

## 참고
- 커밋: 워크플로우 `dccae62`. 잡 검증 media id 예: `18105497981080836`.
- 결정/상태 원천: `docs/plans/2026-06-18-phase-9-insta-publish-design.md`, `docs/n8n/README.md`.

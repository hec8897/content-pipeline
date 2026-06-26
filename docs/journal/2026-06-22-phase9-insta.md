# 일지 — 2026-06-22 · Phase 9 인스타 자동 발행

## 한 일
- **순서 결정**: 네이버보다 **인스타 먼저**. 로드맵 Phase 9 ↔ 10 swap (인스타=9, 네이버=10).
- **spec + 구현 계획** 작성·커밋.
- **코드 구현 (서브에이전트 주도)** — 전부 리뷰 통과, 최종 whole-branch 리뷰 **READY TO MERGE**:
  - `B1` `publish_jobs.payload` jsonb 컬럼 (cp Supabase 적용 + 타입 반영).
  - `BE` 인스타 payload 스냅샷(`{caption, images}`) + 가드(캡션/이미지 2~10/Storage URL 검증) + 트리거 실전송.
  - `FE` 카드 클라이언트 렌더 → Storage 업로드 → 발행 API 배선 + 인스타 가드.
- **Meta 토큰 발급**: 경로 = **Instagram 로그인**(Facebook 페이지 없음). 60일 장수명 토큰(`instagram_business_content_publish` 포함) 확보. IG user id = `27545798328443881`.

## 결정
- 최종 카드 이미지: 클라이언트 렌더 → 업로드(서버 렌더링 X). 즉시발행만. IG 토큰은 n8n credential. 발행 데이터는 job.payload 스냅샷.
- 실발행 n8n = **로컬 Docker n8n** 선택.

## 막혔다 푼 것
- Meta 토큰: 테스터 초대 "대기 중" → instagram.com 직접 URL(`/accounts/manage_access/`)로 수락. 토큰 `/me` 호출 452/190 → 셸 변수의 옛 토큰 문제, **토큰 디버거**로 유효성·user id 확인하며 해결.

## 남은 일 (내일)
1. n8n에 IG credential 등록(토큰 + user id).
2. `N1` 인스타 캐러셀 워크플로우 — 기존 로컬 echo 워크플로우 export 받아 중간을 IG Graph 호출(미디어 컨테이너 → 캐러셀 → publish → media id 콜백)로 확장.
3. 로컬 실발행 테스트 (※ 클라우드 워커가 같은 DB 잡 가로채니 잠시 중단).
4. PR → develop.

## 참고
- 계획: `docs/plans/2026-06-18-phase-9-insta-publish.md` · spec: `…-design.md`
- 브랜치 `feat/phase-9-insta-publish` (base develop), 커밋 B1 `2ebd923` / BE `ec3d6ca` / FE `c7b7b46`.

-- Phase 9 인스타 발행: 채널별 발행 데이터 스냅샷.
-- 발행 클릭 시점의 caption + 최종 카드 이미지 공개 URL 을 job 에 박아두어,
-- 이후 draft 편집과 무관하게 진행 중 발행이 불변하도록 한다(트리거가 더이상 {} 스텁 아님).
-- 인스타 형태: { "caption": text, "images": [public url, ...] }. 네이버는 추후.
-- nullable(8-1 의 기존 row + 네이버 job 은 payload 없이 존재 가능).
alter table publish_jobs add column payload jsonb;

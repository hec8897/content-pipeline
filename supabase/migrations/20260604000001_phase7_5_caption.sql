-- Phase 7.5 (B-04): 인스타 캡션 자동 생성 — 양산 시 카드 호출에서 함께 생성, 별도 컬럼 보관.
-- blog_body 와 동일하게 nullable. 마이그레이션 이전 draft 및 캡션 생성 실패 시 null →
-- 프론트는 빈 상태 + "캡션 생성" 버튼으로 graceful 처리.

alter table drafts
  add column caption text;

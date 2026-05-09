-- Phase 1a — 후속 Phase 에서 사용할 익스텐션 활성화.
-- pgcrypto: gen_random_uuid() 제공.
create extension if not exists pgcrypto;

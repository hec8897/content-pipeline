import type { Database } from '@/supabase/database.types';

type PublishJobRow = Database['public']['Tables']['publish_jobs']['Row'];

// 발행 실행 엔진 추상화. n8n 은 replaceable — 워커/서비스는 이 인터페이스에만 의존(벤더 락인 방지).
export interface PublishTrigger {
  trigger(job: PublishJobRow): Promise<void>;
}

// DI 토큰. module 에서 N8nPublishTrigger 를 이 토큰에 바인딩.
export const PUBLISH_TRIGGER = Symbol('PUBLISH_TRIGGER');

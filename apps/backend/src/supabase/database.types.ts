// Phase 1a placeholder.
// Phase 2 도메인 테이블 첫 마이그레이션 후 Supabase CLI 로 자동 생성될 자리:
//   supabase gen types typescript --project-id <ref> --schema public
// 현재는 SupabaseClient<Database> 타입 인자가 비어있는 형태로 동작.
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

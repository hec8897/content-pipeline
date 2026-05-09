import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { Database } from './database.types';

@Injectable()
export class SupabaseService {
  readonly anon: SupabaseClient<Database>;
  readonly admin: SupabaseClient<Database>;

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const anonKey = this.config.getOrThrow<string>('SUPABASE_ANON_KEY');
    const serviceRoleKey = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    // RLS 적용 — 사용자 요청 처리 시 사용
    this.anon = createClient<Database>(url, anonKey);

    // RLS 우회 — 백오피스/AI 결과 쓰기 시 사용
    this.admin = createClient<Database>(url, serviceRoleKey);
  }
}

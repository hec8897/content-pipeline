import axios, { AxiosError, type AxiosInstance } from 'axios';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getBaseUrl(): string {
  // NEXT_PUBLIC_* 는 빌드 타임에 inline. 누락 시 모듈 로드 즉시 throw — fail-fast 의도.
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL 가 설정되지 않았습니다');
  }
  return url.replace(/\/$/, '');
}

export const api: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
});

api.interceptors.request.use(async (config) => {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new ApiError(401, '로그인이 필요합니다', null);
  }
  config.headers.set('Authorization', `Bearer ${session.access_token}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof ApiError) throw error;
    if (error instanceof AxiosError) {
      const data = error.response?.data;
      const message =
        (typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message: unknown }).message)
          : null) ??
        error.message ??
        error.code ??
        'Request failed';
      throw new ApiError(error.response?.status ?? 0, message, data);
    }
    throw error;
  },
);

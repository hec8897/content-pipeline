'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import { useAuthStore } from '@/lib/auth/store';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error('useSupabase must be used inside SupabaseProvider');
  }
  return ctx;
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const setSession = useAuthStore((s) => s.setSession);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase, setSession, setInitialized]);

  return <SupabaseContext.Provider value={supabase}>{children}</SupabaseContext.Provider>;
}

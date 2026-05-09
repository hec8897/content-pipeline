"use client";

import { useState } from "react";

import { LoginForm } from "@/components/auth/LoginForm";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  const handleGoogleLogin = () => {
    // Phase 1a Task 7~8 (Supabase client + Provider) 완료 후 실 OAuth 호출로 교체:
    //   const supabase = useSupabase();
    //   await supabase.auth.signInWithOAuth({ provider: 'google',
    //     options: { redirectTo: `${origin}/auth/callback` } });
    alert("Google OAuth 연결은 Task 7~8 이후 활성화됩니다.");
  };

  const handleSubmit = () => {
    // 이메일/비밀번호 폼은 시각적 placeholder — Google 버튼만 실 동작
    alert("이메일/비밀번호 로그인은 프로토타입입니다. Google 로그인을 사용해주세요.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <main className="flex-1 flex items-center justify-center px-6 py-7">
        <div className="w-full max-w-[380px] md:bg-surface md:border md:border-border md:rounded-[14px] md:px-9 md:pt-9 md:pb-8 md:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.06)]">
          <LoginForm
            mode={mode}
            setMode={setMode}
            onGoogleLogin={handleGoogleLogin}
            onSubmit={handleSubmit}
          />
        </div>
      </main>

      <footer className="px-6 pb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-text-3 font-mono">
        <span>© 2026 content-pipeline</span>
        <a href="#" className="hover:text-text-2">
          서비스 약관
        </a>
        <a href="#" className="hover:text-text-2">
          개인정보 처리방침
        </a>
        <a href="#" className="hover:text-text-2">
          고객지원
        </a>
      </footer>
    </div>
  );
}

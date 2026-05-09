'use client';

import { useState } from 'react';

import { Logo } from './Logo';

type Mode = 'login' | 'signup';

type Props = {
  mode: Mode;
  setMode: (m: Mode) => void;
  isMobile?: boolean;
  onGoogleLogin: () => void;
  onSubmit?: () => void;
};

const inputClass =
  'w-full px-3 py-[11px] bg-surface border border-border rounded-lg text-[13.5px] text-text ' +
  'transition-colors hover:border-border-strong focus:outline-none focus:border-accent ' +
  'focus:ring-[3px] focus:ring-accent-soft placeholder:text-text-3';

const labelClass = 'text-[11.5px] font-semibold text-text-2 tracking-[0.1px]';

export function LoginForm({ mode, setMode, isMobile, onGoogleLogin, onSubmit }: Props) {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('minji@daily.kr');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');

  const isSignup = mode === 'signup';

  return (
    <form
      className="w-full max-w-[380px]"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <div className="flex items-center gap-2.5 mb-6">
        <Logo />
        <span className="font-semibold text-[14.5px] tracking-[-0.2px] text-text">
          content-pipeline
        </span>
        <span className="ml-1.5 text-[9.5px] font-mono text-text-3 px-[5px] py-[2px] border border-border rounded">
          v0.2
        </span>
      </div>

      <div className="mb-[22px]">
        <h1
          className={
            'm-0 font-semibold tracking-[-0.6px] leading-[1.2] ' +
            (isMobile ? 'text-[22px]' : 'text-[26px]')
          }
          style={{ whiteSpace: 'pre-line' }}
        >
          {isSignup ? '계정을 만들고\n파이프라인을 시작해요' : '다시 만나서 반가워요.'}
        </h1>
        <div className="mt-2 text-[13px] text-text-2 leading-[1.5]">
          {isSignup
            ? '한 번 작성하면 네이버 블로그·인스타그램으로 자동 발행돼요.'
            : '한 번의 인터뷰로 두 채널에 나갈 콘텐츠를 마저 만들어볼까요?'}
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {isSignup && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="name">
              이름
            </label>
            <input
              id="name"
              className={inputClass}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="민지"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            className={inputClass}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@daily.kr"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className={labelClass} htmlFor="pw">
              비밀번호
            </label>
            {!isSignup && (
              <button
                type="button"
                className="text-[11.5px] text-text-2 underline decoration-border-strong underline-offset-[3px] hover:text-accent hover:decoration-accent"
                onClick={() => alert('비밀번호 재설정 메일을 보낼게요.')}
              >
                비밀번호 잊으셨나요?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="pw"
              className={inputClass + ' pr-11'}
              type={showPw ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={isSignup ? '8자 이상, 숫자·기호 포함' : '비밀번호'}
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-text-3 hover:text-text-2 hover:bg-surface-2 px-1.5 py-1 rounded"
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? '숨기기' : '보기'}
            </button>
          </div>
          {isSignup && (
            <div className="flex gap-1 mt-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-[3px] rounded-[2px]"
                  style={{
                    background:
                      pw.length > i * 2
                        ? pw.length > 8
                          ? 'var(--color-success)'
                          : 'var(--color-warn)'
                        : 'var(--color-border)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {!isSignup && (
          <div className="flex items-center justify-between text-[12px]">
            <label className="inline-flex items-center gap-[7px] text-text-2 cursor-pointer select-none">
              <input type="checkbox" defaultChecked className="w-3.5 h-3.5 m-0 accent-accent" />
              로그인 상태 유지
            </label>
            <span className="font-mono text-[10.5px] text-text-3">SSO · SAML 곧 지원</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full px-3.5 py-3 bg-text text-white rounded-lg text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-black active:translate-y-px transition-colors"
        >
          {isSignup ? '계정 만들기' : '로그인'}
          <span className="opacity-50 font-mono text-[11px]">↵</span>
        </button>

        <div className="flex items-center gap-2.5 text-text-3 text-[11px] my-1">
          <span className="flex-1 h-px bg-border" />
          또는
          <span className="flex-1 h-px bg-border" />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onGoogleLogin}
            className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-text text-[12.5px] font-medium inline-flex items-center gap-2.5 text-left hover:bg-surface-2 hover:border-border-strong transition-colors"
          >
            <span
              className="w-[22px] h-[22px] rounded-[5px] inline-flex items-center justify-center font-bold text-[13px] bg-white border border-border shrink-0"
              style={{ color: '#5f6368' }}
            >
              G
            </span>
            <span className="flex-1">Google로 계속하기</span>
            <span className="text-[10.5px] font-mono text-text-3">프로토타입</span>
          </button>
          <div className="text-[10.5px] text-text-3 font-mono text-center mt-0.5">
            네이버 · 인스타그램 연동은 로그인 후 채널 설정에서 추가됩니다
          </div>
        </div>
      </div>

      <div className="text-center mt-[22px] text-[12px] text-text-2">
        {isSignup ? '이미 계정이 있나요? ' : '아직 계정이 없으신가요? '}
        <button
          type="button"
          onClick={() => setMode(isSignup ? 'login' : 'signup')}
          className="text-accent font-semibold"
        >
          {isSignup ? '로그인' : '무료로 시작하기'}
        </button>
      </div>
    </form>
  );
}

'use client';

import { AlertCircle, AlertTriangle, Check, Info, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toastStore, type ToastItem, type ToastKind } from '@/lib/toast';

// globals.css 의 --duration-toast-out 과 일치해야 퇴장 애니메이션이 잘리지 않음.
const EXIT_MS = 180;

type KindStyle = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  progress: string;
};

// 디자인 핸드오프 §2 의 4 variants × icon/색상 매핑.
const KIND_STYLE: Record<ToastKind, KindStyle> = {
  success: {
    icon: Check,
    iconBg: 'rgba(47, 148, 97, 0.12)',
    iconColor: 'var(--color-success)',
    progress: 'var(--color-success)',
  },
  error: {
    icon: AlertCircle,
    iconBg: 'rgba(215, 58, 58, 0.12)',
    iconColor: 'var(--color-danger)',
    progress: 'var(--color-danger)',
  },
  info: {
    icon: Info,
    iconBg: 'var(--color-accent-soft)',
    iconColor: 'var(--color-accent)',
    progress: 'var(--color-accent)',
  },
  warn: {
    icon: AlertTriangle,
    iconBg: 'rgba(200, 127, 10, 0.12)',
    iconColor: 'var(--color-warn)',
    progress: 'var(--color-warn)',
  },
};

export function Toast({ item }: { item: ToastItem }) {
  const cfg = KIND_STYLE[item.kind];
  const Icon = cfg.icon;

  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  // 남은 시간 추적 — hover pause/resume 가 progress bar(CSS) 와 동기화되도록.
  const remainingRef = useRef(item.duration);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => toastStore.dismiss(item.id), EXIT_MS);
  }, [item.id]);

  // 자동 닫힘 타이머. duration <= 0 (persistent) 이거나 hover 중이면 멈춤.
  // unmount/pause 시 경과분을 remainingRef 에서 차감해 resume 때 이어서 셈.
  useEffect(() => {
    if (item.duration <= 0 || paused || closing) return;
    const startedAt = Date.now();
    const t = window.setTimeout(close, remainingRef.current);
    return () => {
      window.clearTimeout(t);
      remainingRef.current -= Date.now() - startedAt;
    };
  }, [item.duration, paused, closing, close]);

  return (
    <div
      role="status"
      aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="bg-surface border-border relative grid grid-cols-[26px_1fr_auto] items-start gap-[11px] overflow-hidden rounded-[10px] border px-[14px] py-[13px]"
      style={{
        boxShadow: 'var(--shadow-toast)',
        animation: closing
          ? `toast-out var(--duration-toast-out) ease forwards`
          : `toast-in var(--duration-toast-in) var(--easing-out-soft)`,
      }}
    >
      <div
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px]"
        style={{ background: cfg.iconBg, color: cfg.iconColor }}
        aria-hidden
      >
        <Icon size={14} strokeWidth={2.4} />
      </div>

      <div className="min-w-0">
        <div className="text-text text-[12.5px] font-semibold leading-[1.35]">{item.title}</div>
        {item.msg ? (
          <div className="text-text-2 mt-0.5 text-[11.5px] leading-[1.5]">{item.msg}</div>
        ) : null}
        {item.actions.length > 0 ? (
          <div className="mt-2 flex gap-1.5">
            {item.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  action.onClick?.();
                  close();
                }}
                className={
                  action.primary
                    ? 'border-text bg-text rounded-[5px] border px-[9px] py-1 text-[11px] font-semibold text-white'
                    : 'border-border bg-surface-2 text-text-2 hover:bg-surface rounded-[5px] border px-[9px] py-1 text-[11px] font-semibold'
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        onClick={close}
        title="닫기"
        aria-label="닫기"
        className="text-text-3 hover:text-text-2 self-start px-1 py-0.5 text-[14px] leading-none"
      >
        ×
      </button>

      {item.duration > 0 ? (
        <div
          className="absolute bottom-0 left-0 h-0.5 w-full origin-left opacity-50"
          style={{
            background: cfg.progress,
            animation: `toast-progress ${item.duration}ms linear forwards`,
            animationPlayState: paused || closing ? 'paused' : 'running',
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

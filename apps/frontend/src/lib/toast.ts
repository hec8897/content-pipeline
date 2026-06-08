/**
 * Imperative toast() helper.
 *
 * `<ToastViewport />` 가 RootLayout 어딘가 한 번 mount 되어 있어야 함.
 * 어디서든 (event handler / hook / async function / React 밖) 호출 가능.
 *
 *   toast.success('발행 완료', { msg: '네이버 · 인스타 2채널에 게시했어요.' });
 *   toast.error('인스타그램 발행 실패', {
 *     msg: 'Graph API · error 24',
 *     actions: [{ label: '로그' }, { label: '↻ 재시도', primary: true, onClick: retry }],
 *   }); // error 는 기본 persistent
 *   const id = toast.info('백그라운드 양산 중', { msg: '약 18초 남음' });
 *   toast.dismiss(id);
 *
 * confirm() helper 와 동일한 모듈 스토어 + useSyncExternalStore 패턴.
 */
import type { ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'info' | 'warn';

export type ToastAction = {
  label: string;
  primary?: boolean;
  onClick?: () => void;
};

export type ToastOptions = {
  msg?: ReactNode;
  actions?: ToastAction[];
  /** ms. 0 = persistent (자동 닫힘 X). 미지정 시 kind 별 기본값. */
  duration?: number;
  /** true 면 duration 0 (persistent) 강제. error 는 기본 persistent. */
  persistent?: boolean;
};

export type ToastItem = {
  id: number;
  kind: ToastKind;
  title: string;
  msg?: ReactNode;
  actions: ToastAction[];
  /** 0 = persistent. */
  duration: number;
};

// kind 별 기본 duration (디자인 핸드오프 §2).
const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4000,
  info: 6000,
  warn: 5000,
  error: 0, // persistent
};

const EMPTY: ToastItem[] = [];

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function notify() {
  for (const listener of listeners) listener();
}

function add(kind: ToastKind, title: string, opts: ToastOptions = {}): number {
  const id = ++seq;
  const duration = opts.persistent ? 0 : (opts.duration ?? DEFAULT_DURATION[kind]);
  items = [
    ...items,
    { id, kind, title, msg: opts.msg, actions: opts.actions ?? [], duration },
  ];
  notify();
  return id;
}

function dismiss(id: number) {
  const next = items.filter((t) => t.id !== id);
  if (next.length === items.length) return;
  items = next;
  notify();
}

export const toast = {
  success: (title: string, opts?: ToastOptions) => add('success', title, opts),
  error: (title: string, opts?: ToastOptions) => add('error', title, opts),
  info: (title: string, opts?: ToastOptions) => add('info', title, opts),
  warn: (title: string, opts?: ToastOptions) => add('warn', title, opts),
  dismiss,
};

// ─── Store internal API (ToastViewport 가 사용) ──────────────────────────────
export const toastStore = {
  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  getSnapshot(): ToastItem[] {
    return items;
  },
  getServerSnapshot(): ToastItem[] {
    return EMPTY;
  },
  dismiss,
};

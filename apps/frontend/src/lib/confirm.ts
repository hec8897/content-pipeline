/**
 * Imperative confirm() helper.
 *
 * `<ConfirmDialogRoot />` 가 RootLayout 어딘가 한 번 mount 되어 있어야 함.
 * 어디서든 (event handler / hook / async function 안) `await confirm(...)` 호출 가능.
 *
 * 일반 케이스 (binary):
 *   const ok = await confirm({ kind: 'delete', title: '...', typeGuard: { expected: 'DELETE p1' }, confirmLabel: '영구 삭제' });
 *   if (ok) doDelete();
 *
 * 3-way (unsaved):
 *   const result = await confirmUnsaved({ title: '...', confirmLabel: '저장', tertiaryLabel: '변경 버리기' });
 *   if (result === 'save') save();
 *   if (result === 'discard') discard();
 *   // null = 취소
 */
import type { ReactNode } from 'react';

import type { ConfirmDialogProps, ConfirmKind } from '@/components/ui/ConfirmDialog';

type BaseProps = Omit<
  ConfirmDialogProps,
  'open' | 'onClose' | 'onConfirm' | 'onCancel' | 'onTertiary' | 'tertiaryLabel'
>;

type StoreState =
  | {
      mode: 'binary';
      props: BaseProps;
      resolve: (ok: boolean) => void;
    }
  | {
      mode: 'unsaved';
      props: Omit<BaseProps, 'kind'> & { kind: Extract<ConfirmKind, 'unsaved'>; tertiaryLabel: string };
      resolve: (result: 'save' | 'discard' | null) => void;
    }
  | null;

let state: StoreState = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function close(value: boolean | 'save' | 'discard' | null) {
  if (!state) return;
  if (state.mode === 'binary') {
    state.resolve(typeof value === 'boolean' ? value : false);
  } else {
    state.resolve(typeof value === 'string' || value === null ? value : value ? 'save' : null);
  }
  state = null;
  notify();
}

/**
 * 일반 confirm. 5 variants (publish/delete/schedule/retry/disconnect).
 * Promise<boolean> — true = confirm, false = cancel/escape/backdrop.
 */
export function confirm(props: BaseProps): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    state = { mode: 'binary', props, resolve };
    notify();
  });
}

/**
 * 미저장 3-way. unsaved variant 전용.
 * Promise<'save' | 'discard' | null> — null = 취소.
 */
export function confirmUnsaved(
  props: Omit<BaseProps, 'kind'> & { tertiaryLabel: string },
): Promise<'save' | 'discard' | null> {
  return new Promise<'save' | 'discard' | null>((resolve) => {
    state = {
      mode: 'unsaved',
      props: { ...props, kind: 'unsaved' },
      resolve,
    };
    notify();
  });
}

// ─── Store internal API (ConfirmDialogRoot 가 사용) ──────────────────────────
export const confirmStore = {
  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  getSnapshot(): StoreState {
    return state;
  },
  getServerSnapshot(): StoreState {
    return null;
  },
  resolveBinary(ok: boolean) {
    close(ok);
  },
  resolveUnsaved(result: 'save' | 'discard' | null) {
    close(result);
  },
};

export type { ReactNode };

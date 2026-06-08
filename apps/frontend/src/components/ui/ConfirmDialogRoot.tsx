'use client';

import { useSyncExternalStore } from 'react';

import { confirmStore } from '@/lib/confirm';

import { ConfirmDialog } from './ConfirmDialog';

/**
 * confirm() / confirmUnsaved() helper 의 렌더 root.
 * RootLayout 어딘가 한 번 mount 되어야 helper 호출이 실제 모달로 표시됨.
 */
export function ConfirmDialogRoot() {
  const state = useSyncExternalStore(
    confirmStore.subscribe,
    confirmStore.getSnapshot,
    confirmStore.getServerSnapshot,
  );

  // state 가 null 이어도 Modal 은 mounted 인 상태에서 open=false 면 자체 close
  // animation 작동. 즉 직전 props 를 보존해야 close 시 layout 이 그대로 페이드아웃.
  // 다만 helper 가 promise resolve 후 즉시 state=null 로 만들기 때문에 다음 render 에
  // props 사라짐. animation 잘림 방지를 위해 별도 ref 로 last state 보존하는 패턴이
  // 깔끔하지만 dogfooding 단계엔 단순 unmount 로 충분 (close animation 잠깐 잘림).
  if (!state) return null;

  const handleConfirm = () => confirmStore.resolveBinary(true);
  const handleCancel = () => confirmStore.resolveBinary(false);

  if (state.mode === 'unsaved') {
    return (
      <ConfirmDialog
        {...state.props}
        open={true}
        onClose={() => confirmStore.resolveUnsaved(null)}
        onConfirm={() => confirmStore.resolveUnsaved('save')}
        onCancel={() => confirmStore.resolveUnsaved(null)}
        onTertiary={() => confirmStore.resolveUnsaved('discard')}
      />
    );
  }

  return (
    <ConfirmDialog
      {...state.props}
      open={true}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

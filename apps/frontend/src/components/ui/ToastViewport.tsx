'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { toastStore } from '@/lib/toast';

import { Toast } from './Toast';

/**
 * toast.* helper 의 렌더 root. RootLayout 어딘가 한 번 mount 되어야
 * helper 호출이 실제 stack 으로 표시됨. 우하단 fixed stack (디자인 핸드오프 §2).
 *
 * SSR/hydration 안전: getServerSnapshot 이 빈 배열을 주므로 초기엔 항상 null.
 * createPortal 은 toast 추가 후 (= hydration 이후 이벤트 핸들러) 에만 실행된다.
 */
export function ToastViewport() {
  const items = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    toastStore.getServerSnapshot,
  );

  if (items.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[1100] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2.5">
      {items.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </div>,
    document.body,
  );
}

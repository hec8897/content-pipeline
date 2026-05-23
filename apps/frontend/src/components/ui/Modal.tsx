'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

// 디자인 토큰 (globals.css) 의 transition duration 과 일치해야 함 — open=false 후
// 이 시간이 지나야 portal 을 unmount 한다. 잘못 짧으면 close animation 잘리고,
// 길면 다음 open 까지 stale node 남음.
const CLOSE_ANIMATION_MS = 180;
const AUTO_FOCUS_DELAY_MS = 80;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Backdrop click 으로 닫을지. default true. */
  closeOnBackdrop?: boolean;
  /** Escape key 로 닫을지. default true. */
  closeOnEscape?: boolean;
  /** aria-labelledby. ConfirmDialog 등 사용처에서 title id 전달. 미지정 시 내부 useId 로 생성된 id 가 ariaLabelledById callback 으로 노출. */
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /** 모달 내부 content. */
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
  ariaLabelledBy,
  ariaDescribedBy,
  children,
}: ModalProps) {
  // mounted = DOM 에 portal 존재 / visible = 열린 상태 className. open 변경 시
  // mounted 가 먼저 true → 다음 frame 에 visible 토글 → CSS transition 작동.
  // close 시 visible=false → CLOSE_ANIMATION_MS 후 mounted=false (unmount).
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);
  // 모달 open 직전의 focus 대상 — 닫힘 시 여기로 focus 복귀.
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // open prop 의 변화를 mounted/visible 두 state 로 펼침. enter/exit transition 을
  // 위해 setState 는 모두 RAF 또는 setTimeout callback 안에서만 호출 — effect body
  // 안의 동기 setState 가 cascading render 를 일으키지 않게.
  useEffect(() => {
    if (open) {
      // 직전 focus 저장 — 첫 진입에만. 이후 focus 가 모달 내부로 이동해도 trigger 는 유지.
      if (!previousFocusRef.current) {
        previousFocusRef.current = document.activeElement as HTMLElement | null;
      }
      let cancelled = false;
      // RAF 1: portal mount, RAF 2: visible=true (mount 후 다음 frame 에 transition 시작)
      const r1 = window.requestAnimationFrame(() => {
        if (cancelled) return;
        setMounted(true);
        window.requestAnimationFrame(() => {
          if (cancelled) return;
          setVisible(true);
        });
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(r1);
      };
    }
    let cancelled = false;
    // close — 즉시 visible=false 로 transition 시작, CLOSE_ANIMATION_MS 후 unmount + focus 복귀
    const r = window.requestAnimationFrame(() => {
      if (cancelled) return;
      setVisible(false);
    });
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setMounted(false);
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    }, CLOSE_ANIMATION_MS);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(r);
      window.clearTimeout(t);
    };
  }, [open]);

  // Scroll lock — mounted 동안만 body overflow hidden. scrollbar-gutter 는
  // globals.css 에서 항상 stable 이라 layout shift 없음.
  useLayoutEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  // Escape 닫기.
  useEffect(() => {
    if (!visible || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, closeOnEscape, onClose]);

  // Focus trap — Tab/Shift+Tab 이 모달 안 focusable 만 순환.
  useEffect(() => {
    if (!visible) return;
    const root = contentRef.current;
    if (!root) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusableElements(root);
      if (focusables.length === 0) {
        // 모달 안 focusable 0개 — 모달 box 자체에 focus 묶기.
        e.preventDefault();
        root.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible]);

  // Auto-focus 첫 focusable. 디자인 가이드 — 80ms 후 (open animation 안정화).
  useEffect(() => {
    if (!visible) return;
    const root = contentRef.current;
    if (!root) return;
    const t = window.setTimeout(() => {
      const focusables = getFocusableElements(root);
      const target = focusables[0] ?? root;
      target.focus();
    }, AUTO_FOCUS_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [visible]);

  const internalTitleId = useId();
  const titleId = ariaLabelledBy ?? internalTitleId;

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) onClose();
  }, [closeOnBackdrop, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'var(--scrim-bg)',
        backdropFilter: 'blur(var(--scrim-blur))',
        WebkitBackdropFilter: 'blur(var(--scrim-blur))',
        transitionDuration: 'var(--duration-modal-scrim)',
      }}
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`bg-surface relative mx-4 w-full max-w-[440px] rounded-[12px] outline-none transition-all ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-1 scale-[0.96] opacity-0'
        }`}
        style={{
          boxShadow: 'var(--shadow-modal)',
          transitionDuration: 'var(--duration-modal-content)',
          transitionTimingFunction: 'var(--easing-out-soft)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('inert') && el.offsetParent !== null,
  );
}

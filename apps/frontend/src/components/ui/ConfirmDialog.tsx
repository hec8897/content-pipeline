'use client';

import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  Trash2,
  Unlink,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

import { Button } from './Button';
import { Modal } from './Modal';

export type ConfirmKind = 'publish' | 'delete' | 'schedule' | 'retry' | 'unsaved' | 'disconnect';

type KindConfig = {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  eyebrow: string;
  eyebrowColor: string;
  confirmTone: 'primary' | 'danger';
};

// 디자인 핸드오프 §1 의 6 variants × icon/eyebrow/tone 매핑.
const KIND_CONFIG: Record<ConfirmKind, KindConfig> = {
  publish: {
    icon: Check,
    iconColor: 'var(--color-accent)',
    iconBg: 'var(--color-accent-soft)',
    eyebrow: '발행',
    eyebrowColor: 'var(--color-accent)',
    confirmTone: 'primary',
  },
  delete: {
    icon: Trash2,
    iconColor: 'var(--color-danger)',
    iconBg: 'rgba(215, 58, 58, 0.12)',
    eyebrow: '영구 삭제',
    eyebrowColor: 'var(--color-danger)',
    confirmTone: 'danger',
  },
  schedule: {
    icon: Clock,
    iconColor: 'var(--color-warn)',
    iconBg: 'rgba(200, 127, 10, 0.12)',
    eyebrow: '예약 발행',
    eyebrowColor: 'var(--color-warn)',
    confirmTone: 'primary',
  },
  retry: {
    icon: AlertCircle,
    iconColor: 'var(--color-danger)',
    iconBg: 'rgba(215, 58, 58, 0.12)',
    eyebrow: '발행 실패',
    eyebrowColor: 'var(--color-danger)',
    confirmTone: 'primary',
  },
  unsaved: {
    icon: AlertTriangle,
    iconColor: 'var(--color-warn)',
    iconBg: 'rgba(200, 127, 10, 0.12)',
    eyebrow: '미저장 변경',
    eyebrowColor: 'var(--color-warn)',
    confirmTone: 'primary',
  },
  disconnect: {
    icon: Unlink,
    iconColor: 'var(--color-danger)',
    iconBg: 'rgba(215, 58, 58, 0.12)',
    eyebrow: '연결 해제',
    eyebrowColor: 'var(--color-danger)',
    confirmTone: 'danger',
  },
};

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  kind: ConfirmKind;
  title: string;
  /** description — inline code 등을 위해 ReactNode. 단순 문자열도 OK. */
  description?: ReactNode;
  /** Detail panel — key-value 등 부가 정보. ConfirmDetailPanel 컴포넌트 활용 권장. */
  detail?: ReactNode;
  /** 추가 body slot — schedule 의 form, 또는 임의 추가 인풋. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** unsaved 의 3-way 용 (예: '변경 버리기'). 지정 시 cancel 좌측에 ghost-danger 버튼 노출. */
  tertiaryLabel?: string;
  /** delete variant 의 type-guard. expected 와 정확히 일치할 때만 confirm 버튼 활성화. */
  typeGuard?: { expected: string; placeholder?: string };
  onConfirm: () => void;
  onCancel?: () => void;
  onTertiary?: () => void;
};

export function ConfirmDialog({
  open,
  onClose,
  kind,
  title,
  description,
  detail,
  children,
  confirmLabel,
  cancelLabel = '취소',
  tertiaryLabel,
  typeGuard,
  onConfirm,
  onCancel,
  onTertiary,
}: ConfirmDialogProps) {
  const cfg = KIND_CONFIG[kind];
  const Icon = cfg.icon;
  const titleId = useId();
  const descId = useId();

  // delete 의 type-guard — 입력값이 expected 와 정확히 일치할 때만 confirm 활성화.
  const [guardInput, setGuardInput] = useState('');
  const guardPasses = !typeGuard || guardInput.trim() === typeGuard.expected;

  // open=false 로 닫혔다 다시 열릴 때 guard 입력 reset.
  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => setGuardInput(''), 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const handleConfirm = () => {
    if (!guardPasses) return;
    onConfirm();
  };

  const handleTertiary = () => {
    onTertiary?.();
  };

  return (
    <Modal open={open} onClose={handleCancel} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      {/* Body */}
      <div className="px-[22px] pt-[22px] pb-2">
        <div className="flex items-start gap-[14px]">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
            style={{ background: cfg.iconBg, color: cfg.iconColor }}
            aria-hidden
          >
            <Icon size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.6px]"
              style={{ color: cfg.eyebrowColor }}
            >
              {cfg.eyebrow}
            </div>
            <h2
              id={titleId}
              className="text-text mt-1 text-[16px] font-semibold leading-[1.35] tracking-[-0.3px]"
            >
              {title}
            </h2>
            {description ? (
              <p id={descId} className="text-text-2 mt-1.5 text-[13px] leading-[1.55]">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {detail ? <div className="mt-3.5">{detail}</div> : null}

        {typeGuard ? (
          <div className="mt-3.5">
            <label className="text-text-2 text-[11.5px]">
              아래에 <code className="bg-surface-2 rounded px-1 py-0.5 font-mono text-[11.5px]">{typeGuard.expected}</code>{' '}
              를 입력해주세요.
            </label>
            <input
              type="text"
              value={guardInput}
              onChange={(e) => setGuardInput(e.target.value)}
              placeholder={typeGuard.placeholder ?? typeGuard.expected}
              className="border-border focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] mt-1.5 w-full rounded-md border bg-white px-3 py-2 font-mono text-[12.5px] outline-none transition-shadow"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        ) : null}

        {children ? <div className="mt-3.5">{children}</div> : null}
      </div>

      {/* Footer */}
      <div
        className="border-border mt-2 flex items-center justify-end gap-2 rounded-b-[12px] border-t px-[22px] py-4"
        style={{ background: 'var(--color-bg)' }}
      >
        <span className="text-text-3 mr-auto hidden font-mono text-[10.5px] sm:inline">
          ESC 로 닫기
        </span>
        {tertiaryLabel ? (
          <Button variant="ghost-danger" size="md" onClick={handleTertiary}>
            {tertiaryLabel}
          </Button>
        ) : null}
        <Button variant="ghost" size="md" onClick={handleCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant={cfg.confirmTone}
          size="md"
          disabled={!guardPasses}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * ConfirmDialog 의 `detail` slot 에 넣을 key-value 패널.
 * 핸드오프 §1 의 "Detail panel" — bg --color-bg, 1px border, radius 8, padding 12×14,
 * key-value 행마다 dashed bottom border.
 */
export function ConfirmDetailPanel({ items }: { items: Array<{ key: string; value: ReactNode }> }) {
  return (
    <div
      className="border-border rounded-[8px] border px-[14px] py-3"
      style={{ background: 'var(--color-bg)' }}
    >
      {items.map((item, i) => (
        <div
          key={item.key}
          className={`flex items-center justify-between gap-3 py-1.5 ${
            i < items.length - 1 ? 'border-border border-b border-dashed' : ''
          }`}
        >
          <span className="text-text-3 font-mono text-[11px]">{item.key}</span>
          <span className="text-text text-[12.5px]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

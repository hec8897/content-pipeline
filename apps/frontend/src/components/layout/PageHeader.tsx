import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, breadcrumb, actions }: Props) {
  return (
    <header className="flex items-end justify-between gap-4 px-7 py-6 border-b border-border bg-surface">
      <div className="min-w-0">
        {breadcrumb && <div className="text-[11.5px] text-text-3 mb-1">{breadcrumb}</div>}
        <h1 className="text-[22px] font-semibold text-text" style={{ letterSpacing: '-0.4px' }}>
          {title}
        </h1>
        {subtitle && <p className="text-[12.5px] text-text-2 mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

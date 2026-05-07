import type { ReactNode } from "react";

type Props = {
  title?: string;
  sub?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({
  title,
  sub,
  actions,
  children,
  className = "",
}: Props) {
  return (
    <section
      className={`bg-surface border border-border rounded-[10px] overflow-hidden ${className}`}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-3.5 py-3 border-b border-border">
          <div className="min-w-0 flex items-baseline gap-2">
            {title && (
              <h3 className="text-[13px] font-semibold text-text">{title}</h3>
            )}
            {sub && (
              <span className="text-[11.5px] text-text-3 truncate">{sub}</span>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

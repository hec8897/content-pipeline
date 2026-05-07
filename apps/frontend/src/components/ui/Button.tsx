import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost";
type Size = "sm" | "md";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 disabled:opacity-40 disabled:cursor-not-allowed";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-text text-white hover:bg-black font-semibold",
  ghost:
    "bg-transparent border border-border text-text-2 hover:bg-surface-2 hover:text-text",
};

const sizeClass: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-[12px]",
  md: "px-3.5 py-2 text-[12.5px]",
};

export function Button({
  variant = "ghost",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={[
        base,
        variantClass[variant],
        sizeClass[size],
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

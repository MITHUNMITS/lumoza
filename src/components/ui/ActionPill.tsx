import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function ActionPill({ children, className = "", ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button {...props} className={`lumoza-focus rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition hover:border-accent/30 hover:bg-accent/10 hover:text-text ${className}`}>
      {children}
    </button>
  );
}

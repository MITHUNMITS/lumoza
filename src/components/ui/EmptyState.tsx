import type { ReactNode } from "react";

interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  detail: string;
  action?: ReactNode;
}

export function EmptyState({ eyebrow = "Empty state", title, detail, action }: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-dashed border-white/12 bg-ink/35 p-8 text-center">
      <div className="absolute left-1/2 top-0 h-32 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative mx-auto max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-subtle">{eyebrow}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-muted">{detail}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

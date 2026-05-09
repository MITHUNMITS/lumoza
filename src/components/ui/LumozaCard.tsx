import type { PropsWithChildren, ReactNode } from "react";

interface LumozaCardProps extends PropsWithChildren {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  className?: string;
  padded?: boolean;
}

export function LumozaCard({ eyebrow, title, action, className = "", padded = true, children }: LumozaCardProps) {
  return (
    <section className={`lumoza-card rounded-[28px] ${padded ? "p-5" : ""} ${className}`}>
      {(eyebrow || title || action) ? (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-subtle">{eyebrow}</p> : null}
            {title ? <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-text">{title}</h3> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function GlassPanel({ className = "", children }: PropsWithChildren<{ className?: string }>) {
  return <div className={`lumoza-glass rounded-[28px] ${className}`}>{children}</div>;
}

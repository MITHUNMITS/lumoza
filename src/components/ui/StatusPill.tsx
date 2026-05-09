import type { PropsWithChildren } from "react";

type Tone = "accent" | "success" | "warning" | "danger" | "muted" | "purple";

const tones: Record<Tone, string> = {
  accent: "border-accent/25 bg-accent/12 text-accent",
  success: "border-success/25 bg-success/12 text-success",
  warning: "border-warning/25 bg-warning/12 text-warning",
  danger: "border-danger/25 bg-danger/12 text-danger",
  muted: "border-white/10 bg-white/[0.055] text-muted",
  purple: "border-purple/25 bg-purple/12 text-purple",
};

export function StatusPill({ children, tone = "muted", className = "" }: PropsWithChildren<{ tone?: Tone; className?: string }>) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tones[tone]} ${className}`}>{children}</span>;
}

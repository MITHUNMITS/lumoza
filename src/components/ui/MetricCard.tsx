import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  tone?: "accent" | "success" | "warning" | "danger" | "purple";
}

const tones = {
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  purple: "text-purple",
};

export function MetricCard({ label, value, detail, icon, tone = "accent" }: MetricCardProps) {
  return (
    <div className="lumoza-card lumoza-card-hover rounded-[24px] p-5">
      <div className={`flex items-center gap-3 ${tones[tone]}`}>
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.22em]">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-text">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-muted">{detail}</p> : null}
    </div>
  );
}

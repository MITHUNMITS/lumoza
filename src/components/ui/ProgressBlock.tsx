interface ProgressBlockProps {
  label: string;
  value: number;
  detail?: string;
}

export function ProgressBlock({ label, value, detail }: ProgressBlockProps) {
  const percent = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-xs text-text">{percent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-gradient-to-r from-accent via-purple to-success shadow-glow transition-all duration-500 ease-lz" style={{ width: `${percent}%` }} />
      </div>
      {detail ? <p className="mt-2 text-xs leading-5 text-subtle">{detail}</p> : null}
    </div>
  );
}

export function LumozaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-purple/10">
        <div className="absolute inset-0 rounded-[14px] bg-purple/30 blur-xl" />
        <div className="relative h-6 w-6 rotate-45 rounded-[7px] bg-gradient-to-br from-purple via-accent to-white shadow-glow" />
      </div>
      {!compact ? (
        <div className="leading-none">
          <p className="text-sm font-bold tracking-[0.24em] text-text">LUMOZA</p>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.42em] text-purple">STUDIO</p>
        </div>
      ) : null}
    </div>
  );
}

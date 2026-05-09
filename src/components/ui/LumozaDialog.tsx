import type { PropsWithChildren, ReactNode } from "react";
import { X } from "lucide-react";

interface LumozaDialogProps extends PropsWithChildren {
  open: boolean;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onClose: () => void;
}

export function LumozaDialog({ open, title, subtitle, action, onClose, children }: LumozaDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/72 p-6 backdrop-blur-xl">
      <div className="absolute inset-0 lumoza-photo-collage opacity-30" />
      <section className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-panel/92 p-6 shadow-panel">
        <div className="absolute right-0 top-0 h-44 w-56 rounded-full bg-purple/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-text">{title}</h2>
            {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="lumoza-focus rounded-full bg-white/[0.06] p-2 text-muted hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mt-6">{children}</div>
        {action ? <div className="relative mt-6 flex justify-end">{action}</div> : null}
      </section>
    </div>
  );
}

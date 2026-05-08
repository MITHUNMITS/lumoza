import type { ScanTask } from "../../types/system";

interface ScanProgressCardProps {
  task?: ScanTask;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function ScanProgressCard({ task, onPause, onResume, onCancel }: ScanProgressCardProps) {
  if (!task) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/12 bg-card/50 p-5 text-sm text-muted">
        No active scan yet. Phase 1 will attach the scan engine to this control surface.
      </div>
    );
  }

  const percent = task.progressTotal === 0 ? 0 : Math.round((task.progressCurrent / task.progressTotal) * 100);

  return (
    <div className="rounded-[24px] border border-white/8 bg-card/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Active Scan</p>
          <p className="mt-2 text-lg font-semibold text-text">{task.message}</p>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-accent">{task.status}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>{task.progressCurrent} / {task.progressTotal}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onPause} className="rounded-full border border-white/10 px-4 py-2 text-sm text-text">Pause</button>
        <button type="button" onClick={onResume} className="rounded-full border border-white/10 px-4 py-2 text-sm text-text">Resume</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">Cancel</button>
      </div>
    </div>
  );
}

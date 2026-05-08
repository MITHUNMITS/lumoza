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
        No active scan yet. The next slice wires a real recursive indexer into this control surface.
      </div>
    );
  }

  const percent = task.progressTotal === 0 ? 0 : Math.round((task.progressCurrent / task.progressTotal) * 100);
  const isTerminal = task.status === "completed" || task.status === "cancelled" || task.status === "error";

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
      <div className="mt-4 grid gap-2 text-sm text-muted">
        <div className="flex items-center justify-between">
          <span>Indexed photos</span>
          <span className="text-text">{task.indexedCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Unreadable entries</span>
          <span className="text-text">{task.failedCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Generated thumbnails</span>
          <span className="text-text">{task.thumbnailGeneratedCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Thumbnail failures</span>
          <span className="text-text">{task.thumbnailFailedCount}</span>
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onPause} disabled={isTerminal} className="rounded-full border border-white/10 px-4 py-2 text-sm text-text disabled:opacity-40">Pause</button>
        <button type="button" onClick={onResume} disabled={isTerminal} className="rounded-full border border-white/10 px-4 py-2 text-sm text-text disabled:opacity-40">Resume</button>
        <button type="button" onClick={onCancel} disabled={isTerminal} className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger disabled:opacity-40">Cancel</button>
      </div>
    </div>
  );
}

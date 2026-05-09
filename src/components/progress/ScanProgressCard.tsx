import { Pause, Play, Square, TimerReset } from "lucide-react";
import type { ScanTask } from "../../types/system";
import { EmptyState } from "../ui/EmptyState";
import { LumozaButton } from "../ui/LumozaButton";
import { ProgressBlock } from "../ui/ProgressBlock";
import { StatusPill } from "../ui/StatusPill";

interface ScanProgressCardProps {
  task?: ScanTask;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function ScanProgressCard({ task, onPause, onResume, onCancel }: ScanProgressCardProps) {
  if (!task) {
    return <EmptyState eyebrow="Scan engine" title="No active scan" detail="Start a project scan to index metadata, build thumbnails, and prepare the local intelligence pipeline." />;
  }

  const percent = task.progressTotal === 0 ? 0 : Math.round((task.progressCurrent / task.progressTotal) * 100);
  const isTerminal = task.status === "completed" || task.status === "cancelled" || task.status === "error";

  return (
    <div className="lumoza-card rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-subtle">Active scan</p>
          <p className="mt-2 text-lg font-semibold leading-7 tracking-[-0.02em] text-text">{task.message}</p>
        </div>
        <StatusPill tone={task.status === "error" ? "danger" : task.status === "completed" ? "success" : task.status === "paused" ? "warning" : "accent"}>{task.status}</StatusPill>
      </div>

      <div className="mt-5">
        <ProgressBlock label="Overall progress" value={percent} detail={`${task.progressCurrent} of ${task.progressTotal} files processed`} />
      </div>

      <div className="mt-5 grid gap-3 text-sm text-muted">
        {[
          ["Indexed photos", task.indexedCount],
          ["Unreadable entries", task.failedCount],
          ["Generated thumbnails", task.thumbnailGeneratedCount],
          ["Thumbnail failures", task.thumbnailFailedCount],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-ink/30 px-4 py-3">
            <span>{label}</span>
            <span className="font-mono text-xs text-text">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <LumozaButton type="button" onClick={onPause} disabled={isTerminal} variant="secondary" className="px-3">
          <Pause className="h-4 w-4" />
          <span className="hidden lg:inline">Pause</span>
        </LumozaButton>
        <LumozaButton type="button" onClick={onResume} disabled={isTerminal} variant="secondary" className="px-3">
          <Play className="h-4 w-4" />
          <span className="hidden lg:inline">Resume</span>
        </LumozaButton>
        <LumozaButton type="button" onClick={onCancel} disabled={isTerminal} variant="danger" className="px-3">
          <Square className="h-4 w-4" />
          <span className="hidden lg:inline">Cancel</span>
        </LumozaButton>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-subtle">
        <TimerReset className="h-4 w-4" />
        <span>Dynamic ETA and current-file streaming are reserved for the next scan-progress refinement.</span>
      </div>
    </div>
  );
}

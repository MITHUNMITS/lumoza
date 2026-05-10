import { Activity, AlertTriangle, BrainCircuit, CheckCircle2, Circle, Database, Layers3, Pause, Play, RefreshCcw, ScanLine, ShieldCheck } from "lucide-react";
import type { ProjectAnalysisSummary, ProjectPeopleSummary, ProjectSummary } from "../types/project";
import type { ActivityItem, QualityAnalysisTask, ScanTask, SystemStatus } from "../types/system";
import { LumozaButton } from "../components/ui/LumozaButton";
import { StatusPill } from "../components/ui/StatusPill";

interface OperationsPageProps {
  currentProject?: ProjectSummary;
  analysisSummary?: ProjectAnalysisSummary;
  peopleSummary?: ProjectPeopleSummary;
  activity: ActivityItem[];
  task?: ScanTask;
  analysisTask?: QualityAnalysisTask;
  systemStatus?: SystemStatus;
  systemError?: string;
  isRefreshingSystemStatus: boolean;
  onRefreshSystemStatus: () => void;
}

function percent(current = 0, total = 0) {
  if (!total) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

function taskProgress(task?: ScanTask, analysisTask?: QualityAnalysisTask) {
  if (analysisTask && analysisTask.progressTotal > 0) {
    return percent(analysisTask.progressCurrent, analysisTask.progressTotal);
  }
  if (task && task.progressTotal > 0) {
    return percent(task.progressCurrent, task.progressTotal);
  }
  return analysisTask?.status === "completed" ? 100 : task?.status === "completed" ? 100 : 45;
}

function ProgressRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative flex h-52 w-52 items-center justify-center rounded-full bg-white/[0.035] shadow-soft">
      <div className="absolute inset-4 rounded-full" style={{ background: `conic-gradient(var(--lz-purple) ${clamped * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }} />
      <div className="absolute inset-9 rounded-full bg-panel shadow-panel" />
      <div className="relative text-center">
        <p className="text-5xl font-semibold tracking-[-0.07em] text-text">{clamped}%</p>
        <p className="mt-2 text-xs text-subtle">Total Progress</p>
      </div>
    </div>
  );
}

function StageRow({ label, value, total, done }: { label: string; value?: number; total?: number; done?: boolean }) {
  const progress = done ? 100 : percent(value, total);
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)_92px] items-center gap-3 text-sm">
      {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : progress > 0 ? <Circle className="h-4 w-4 fill-purple/20 text-purple" /> : <Circle className="h-4 w-4 text-subtle" />}
      <div className="min-w-0">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="truncate text-muted">{label}</span>
          <span className="font-mono text-[11px] text-subtle">{done ? "done" : total ? `${value ?? 0}/${total}` : "pending"}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-accent to-purple" style={{ width: `${progress}%` }} /></div>
      </div>
      <span className="text-right font-mono text-xs text-subtle">{progress}%</span>
    </div>
  );
}

function PreviewStrip() {
  return (
    <div className="grid grid-cols-8 gap-2">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-square rounded-2xl lumoza-memory-frame shadow-soft" />)}
    </div>
  );
}

export function OperationsPage({
  currentProject,
  analysisSummary,
  peopleSummary,
  activity,
  task,
  analysisTask,
  systemStatus,
  systemError,
  isRefreshingSystemStatus,
  onRefreshSystemStatus,
}: OperationsPageProps) {
  const totalProgress = taskProgress(task, analysisTask);
  const discovered = task?.progressTotal ?? currentProject?.photoCount ?? 0;
  const indexed = task?.indexedCount ?? currentProject?.photoCount ?? 0;
  const analyzed = analysisTask?.analyzedCount ?? analysisSummary?.analyzedPhotoCount ?? 0;
  const duplicateGroups = analysisTask?.duplicateGroupCount ?? analysisSummary?.duplicateGroupCount ?? 0;
  const faces = peopleSummary?.detectedFaceCount ?? 0;
  const latestActivity = activity.slice(0, 5);

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[30px] border border-white/8 bg-ink/30 p-5 shadow-panel">
        <div className="absolute right-20 top-16 h-56 w-56 rounded-full bg-purple/12 blur-3xl" />
        <div className="relative text-center">
          <StatusPill tone="purple">06 Media Analysis</StatusPill>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.055em] text-text">Analyzing your memories</h1>
          <p className="mt-2 text-sm text-muted">This may take some time. You can pause and resume anytime.</p>
        </div>

        <div className="relative mt-8 grid min-h-0 flex-1 items-center gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center gap-5">
            <ProgressRing value={totalProgress} />
            <div className="flex gap-2">
              <LumozaButton type="button" variant="secondary" className="px-4"><Pause className="h-4 w-4" /> Pause</LumozaButton>
              <LumozaButton type="button" variant="ghost" className="px-4"><Play className="h-4 w-4" /> Resume</LumozaButton>
            </div>
          </div>

          <div className="min-w-0 rounded-[28px] border border-white/8 bg-white/[0.035] p-5 shadow-soft">
            <div className="grid gap-4">
              <StageRow label="Scanning files" value={indexed} total={discovered} done={task?.status === "completed"} />
              <StageRow label="Analyzing quality" value={analyzed} total={discovered} done={analysisTask?.status === "completed" || Boolean(analysisSummary?.analyzedPhotoCount)} />
              <StageRow label="Detecting duplicates" value={duplicateGroups} total={Math.max(duplicateGroups, 1)} done={duplicateGroups > 0} />
              <StageRow label="Face detection" value={faces} total={Math.max(faces, 1)} done={faces > 0} />
              <StageRow label="Scene understanding" value={analysisSummary?.albumCandidateCount ?? 0} total={Math.max(analysisSummary?.albumCandidateCount ?? 0, 1)} done={(analysisSummary?.albumCandidateCount ?? 0) > 0} />
              <StageRow label="Extracting metadata" value={indexed} total={discovered} done={indexed > 0 && indexed === discovered} />
            </div>
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between text-sm"><span className="text-text">Live preview</span><span className="font-mono text-xs text-subtle">+{Math.max(0, discovered - 8)}</span></div>
              <PreviewStrip />
            </div>
          </div>
        </div>
      </section>

      <aside className="hidden min-h-0 space-y-4 overflow-y-auto pr-1 lumoza-scrollbar xl:block">
        <div className="rounded-[28px] border border-white/8 bg-white/[0.035] p-5 shadow-soft">
          <div className="flex items-center gap-2 text-text"><ScanLine className="h-4 w-4 text-purple" /> Active stage</div>
          <p className="mt-3 text-sm leading-6 text-muted">{analysisTask?.message ?? task?.message ?? "Waiting for a scan or analysis task."}</p>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between"><p className="text-sm text-text">System check</p><button type="button" onClick={onRefreshSystemStatus} className="text-subtle hover:text-text"><RefreshCcw className={`h-4 w-4 ${isRefreshingSystemStatus ? "animate-spin" : ""}`} /></button></div>
          {systemError ? <p className="mb-3 rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">{systemError}</p> : null}
          <div className="space-y-2 text-sm text-muted">
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.045] px-3 py-3"><span className="flex items-center gap-2"><Database className="h-4 w-4" /> SQLite</span><span className="text-text">{systemStatus?.sqlite ?? "unknown"}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.045] px-3 py-3"><span className="flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> AI engine</span><span className="text-text">{systemStatus?.pythonSidecar ?? "unknown"}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.045] px-3 py-3"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Registry</span><span className="text-text">{systemStatus?.registry ?? "unknown"}</span></div>
          </div>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 shadow-soft">
          <div className="flex items-center gap-2 text-text"><Activity className="h-4 w-4 text-accent" /> Recent activity</div>
          <div className="mt-3 space-y-2">
            {latestActivity.length === 0 ? <p className="text-sm text-subtle">No activity yet.</p> : latestActivity.map((item) => <p key={item.id} className="line-clamp-2 rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-muted">{item.message}</p>)}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-6 text-muted shadow-soft"><Layers3 className="mb-3 h-4 w-4 text-purple" /> Lumoza indexes metadata, thumbnails, quality signals, faces, duplicates, and curation hints locally.</div>
      </aside>
    </div>
  );
}

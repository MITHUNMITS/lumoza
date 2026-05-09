import { Activity, AlertTriangle, BrainCircuit, Layers3, RefreshCcw, Server, ShieldCheck } from "lucide-react";
import type { ProjectAnalysisSummary, ProjectPeopleSummary, ProjectSummary } from "../types/project";
import type { ActivityItem, QualityAnalysisTask, ScanTask, SystemStatus } from "../types/system";

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

function statusTone(status?: SystemStatus) {
  if (!status) {
    return "text-subtle";
  }
  if (status.sqlite !== "ready" || status.registry !== "ready") {
    return "text-danger";
  }
  if (status.pythonSidecar === "offline") {
    return "text-warning";
  }
  return "text-accent";
}

function systemSummary(status?: SystemStatus) {
  if (!status) {
    return "Workspace health is still waking up.";
  }
  if (status.sqlite !== "ready") {
    return "Local library storage needs attention before curation can continue.";
  }
  if (status.registry !== "ready") {
    return "Project list needs attention before switching memories.";
  }
  if (status.pythonSidecar === "offline") {
    return "Desktop foundation is healthy, but the Python sidecar is offline.";
  }
  if (status.pythonSidecar === "placeholder") {
    return "Local workspace is ready. People intelligence is prepared for the next curation pass.";
  }
  return "Desktop foundation is healthy and all monitored services currently report ready.";
}

function formatEventLabel(eventType: string) {
  return eventType.split("_").join(" ");
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
  const incidents = activity.filter((item) => item.severity !== "info");
  const errors = activity.filter((item) => item.severity === "error");
  const warnings = activity.filter((item) => item.severity === "warning");
  const duplicateGroupCount = analysisTask?.duplicateGroupCount ?? analysisSummary?.duplicateGroupCount ?? 0;
  const burstGroupCount = analysisTask?.burstGroupCount ?? analysisSummary?.burstGroupCount ?? 0;
  const keepCount = analysisTask?.keepCount ?? analysisSummary?.keepCount ?? 0;
  const reviewCount = analysisTask?.reviewCount ?? analysisSummary?.reviewCount ?? 0;
  const rejectCount = analysisTask?.rejectCount ?? analysisSummary?.rejectCount ?? 0;
  const highConfidenceCount = analysisTask?.highConfidenceCount ?? analysisSummary?.highConfidenceCount ?? 0;
  const albumCandidateCount = analysisTask?.albumCandidateCount ?? analysisSummary?.albumCandidateCount ?? 0;
  const averageScore = analysisTask?.averageScore ?? analysisSummary?.averageOverallScore ?? 0;
  const detectedFaceCount = peopleSummary?.detectedFaceCount ?? 0;
  const clusteredPeopleCount = peopleSummary?.clusteredPeopleCount ?? 0;
  const namedPeopleCount = peopleSummary?.namedPeopleCount ?? 0;
  const priorityPeopleCount = peopleSummary?.priorityPeopleCount ?? 0;
  const unassignedFaceCount = peopleSummary?.unassignedFaceCount ?? 0;
  const photosWithFacesCount = peopleSummary?.photosWithFacesCount ?? 0;

  return (
    <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="lumoza-scrollbar grid min-h-0 gap-5 overflow-y-auto pr-1">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="lumoza-card rounded-[28px] p-5">
            <div className="flex items-center gap-3 text-accent">
              <Activity className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.22em]">Activity</p>
            </div>
            <p className="mt-4 text-3xl font-semibold text-text">{activity.length}</p>
            <p className="mt-2 text-sm text-muted">Recent operational events retained in memory for the current session.</p>
          </div>
          <div className="lumoza-card rounded-[28px] p-5">
            <div className="flex items-center gap-3 text-warning">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.22em]">Incidents</p>
            </div>
            <p className="mt-4 text-3xl font-semibold text-text">{incidents.length}</p>
            <p className="mt-2 text-sm text-muted">Warnings and errors surfaced by scanning, thumbnails, Phase 2 analysis, or Phase 3 people intelligence.</p>
          </div>
          <div className="lumoza-card rounded-[28px] p-5">
            <div className={`flex items-center gap-3 ${statusTone(systemStatus)}`}>
              <ShieldCheck className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.22em]">Health</p>
            </div>
            <p className="mt-4 text-3xl font-semibold text-text">{systemStatus?.activeTaskCount ?? 0}</p>
            <p className="mt-2 text-sm text-muted">Active native task count reported by the desktop runtime.</p>
          </div>
        </div>

        <div className="lumoza-card rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-subtle">Activity timeline</p>
              <h2 className="mt-2 text-2xl font-semibold text-text">Operational history</h2>
            </div>
            <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.22em] text-muted">
              {currentProject ? currentProject.name : "Global session"}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {activity.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-ink/30 p-5 text-sm text-muted">
                No operational events have been recorded yet.
              </div>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-white/8 bg-ink/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
                        <span>{formatEventLabel(item.eventType)}</span>
                        <span className={item.severity === "error" ? "text-danger" : item.severity === "warning" ? "text-warning" : "text-accent"}>
                          {item.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-text">{item.message}</p>
                    </div>
                    <span className="text-xs text-subtle">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="lumoza-scrollbar grid min-h-0 gap-5 overflow-y-auto pr-1">
        <div className="lumoza-card rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-subtle">Error report</p>
              <h3 className="mt-2 text-xl font-semibold text-text">Current risks</h3>
            </div>
            <span className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.22em] text-muted">
              {errors.length} errors / {warnings.length} warnings
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {incidents.length === 0 ? (
              <div className="rounded-[20px] border border-accent/20 bg-accent/10 p-5 text-sm text-muted">
                No warnings or errors are currently recorded in the session.
              </div>
            ) : (
              incidents.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-white/8 bg-ink/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-xs uppercase tracking-[0.22em] ${item.severity === "error" ? "text-danger" : "text-warning"}`}>
                      {item.severity}
                    </span>
                    <span className="text-xs text-subtle">{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-text">{item.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lumoza-card rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 text-accent">
                <Server className="h-5 w-5" />
                <p className="text-sm uppercase tracking-[0.22em]">System health</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted">{systemSummary(systemStatus)}</p>
            </div>
            <button
              type="button"
              onClick={onRefreshSystemStatus}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text hover:bg-white/10"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshingSystemStatus ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          {systemError ? <div className="mt-5 rounded-[20px] border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{systemError}</div> : null}
          <div className="mt-5 grid gap-3 text-sm text-muted">
            <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-ink/35 px-4 py-3">
              <span>Python sidecar</span>
              <span className="text-text">{systemStatus?.pythonSidecar ?? "unknown"}</span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-ink/35 px-4 py-3">
              <span>SQLite</span>
              <span className="text-text">{systemStatus?.sqlite ?? "unknown"}</span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-ink/35 px-4 py-3">
              <span>Registry</span>
              <span className="text-text">{systemStatus?.registry ?? "unknown"}</span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-ink/35 px-4 py-3">
              <span>Active native tasks</span>
              <span className="text-text">{systemStatus?.activeTaskCount ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="lumoza-card rounded-[28px] p-6">
          <div className="flex items-center gap-3 text-accent">
            <BrainCircuit className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-subtle">Phase 3 people intelligence</p>
          </div>
          <div className="mt-4 grid gap-3 rounded-[22px] border border-white/8 bg-ink/35 p-4 text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>Detected faces</span>
              <span className="text-text">{detectedFaceCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Photos with faces</span>
              <span className="text-text">{photosWithFacesCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>People clusters</span>
              <span className="text-text">{clusteredPeopleCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Named people</span>
              <span className="text-text">{namedPeopleCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Priority people</span>
              <span className="text-text">{priorityPeopleCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Unassigned faces</span>
              <span className="text-text">{unassignedFaceCount}</span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted">
            Phase 3 people intelligence is active: local CPU face-candidate analysis, cache-only crops, clustering, naming, merge/split, hiding, and priority labels are now wired.
          </p>
        </div>
        <div className="lumoza-card rounded-[28px] p-6">
          <div className="flex items-center gap-3 text-accent">
            <BrainCircuit className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-subtle">Phase 2 analysis</p>
          </div>
          <div className="mt-4 grid gap-3 rounded-[22px] border border-white/8 bg-ink/35 p-4 text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>Average score</span>
              <span className="text-text">{(averageScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Duplicate groups</span>
              <span className="text-text">{duplicateGroupCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Burst groups</span>
              <span className="text-text">{burstGroupCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Keep picks</span>
              <span className="text-text">{keepCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Review picks</span>
              <span className="text-text">{reviewCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Reject picks</span>
              <span className="text-text">{rejectCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>High-confidence decisions</span>
              <span className="text-text">{highConfidenceCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Album candidates</span>
              <span className="text-text">{albumCandidateCount}</span>
            </div>
          </div>
          <div className="mt-5 rounded-[20px] border border-white/8 bg-card/50 p-4 text-sm text-muted">
            <div className="flex items-center gap-3 text-text">
              <Layers3 className="h-4 w-4" />
              <span>Grouping summary</span>
            </div>
            <p className="mt-3 leading-7">
              Duplicate grouping now clusters near-identical frames using perceptual similarity, burst grouping clusters closely timed capture sequences, and the ranking pass now adds confidence and album-candidate guidance to explainable keep, review, and reject recommendations.
            </p>
          </div>
          {analysisTask ? (
            <div className="mt-5 space-y-3 text-sm text-muted">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="text-text">{analysisTask.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Progress</span>
                <span className="text-text">{analysisTask.progressCurrent} / {analysisTask.progressTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Analyzed</span>
                <span className="text-text">{analysisTask.analyzedCount}</span>
              </div>
              <p className="rounded-[18px] border border-white/8 bg-ink/35 p-4 leading-7 text-text">{analysisTask.message}</p>
            </div>
          ) : task ? (
            <p className="mt-4 text-sm leading-7 text-muted">Scan activity is present, but technical quality analysis has not run for this session yet.</p>
          ) : (
            <p className="mt-4 text-sm leading-7 text-muted">No active analysis task is currently registered.</p>
          )}
        </div>
      </section>
    </div>
  );
}

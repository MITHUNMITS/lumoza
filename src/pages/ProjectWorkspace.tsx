import { BrainCircuit, ScanLine, Sparkles, UsersRound } from "lucide-react";
import { ProjectPhotoGrid } from "../components/photo-grid/ProjectPhotoGrid";
import { ScanProgressCard } from "../components/progress/ScanProgressCard";
import { LumozaButton } from "../components/ui/LumozaButton";
import { StatusPill } from "../components/ui/StatusPill";
import type { CurationGroupSummary, ProjectAnalysisSummary, ProjectPeopleSummary, ProjectPhoto, ProjectSummary } from "../types/project";
import type { ActivityItem, QualityAnalysisTask, ScanTask } from "../types/system";

interface ProjectWorkspaceProps {
  project: ProjectSummary;
  photos: ProjectPhoto[];
  albumCandidates: ProjectPhoto[];
  reviewQueue: ProjectPhoto[];
  groupSummaries: CurationGroupSummary[];
  analysisSummary?: ProjectAnalysisSummary;
  peopleSummary?: ProjectPeopleSummary;
  isLoadingPhotos: boolean;
  isLoadingMorePhotos: boolean;
  hasMorePhotos: boolean;
  photoError?: string;
  task?: ScanTask;
  analysisTask?: QualityAnalysisTask;
  activity: ActivityItem[];
  onLoadMorePhotos: () => void;
  onStartScan: () => void;
  onStartAnalysis: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

function averageQualityScore(photos: ProjectPhoto[]) {
  const scored = photos.filter((photo) => photo.quality?.overallScore !== undefined);
  if (scored.length === 0) {
    return undefined;
  }
  return scored.reduce((sum, photo) => sum + (photo.quality?.overallScore ?? 0), 0) / scored.length;
}

function CompactStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/[0.045] px-4 py-3">
      <p className="font-mono text-lg text-text">{value}</p>
      <p className="mt-1 text-xs text-subtle">{label}</p>
    </div>
  );
}

export function ProjectWorkspace({
  project,
  photos,
  albumCandidates,
  reviewQueue,
  groupSummaries,
  analysisSummary,
  peopleSummary,
  isLoadingPhotos,
  isLoadingMorePhotos,
  hasMorePhotos,
  photoError,
  task,
  analysisTask,
  activity,
  onLoadMorePhotos,
  onStartScan,
  onStartAnalysis,
  onPause,
  onResume,
  onCancel,
}: ProjectWorkspaceProps) {
  const averageScore = analysisSummary?.averageOverallScore ?? averageQualityScore(photos);
  const duplicateGroupCount = analysisTask?.duplicateGroupCount ?? analysisSummary?.duplicateGroupCount ?? 0;
  const burstGroupCount = analysisTask?.burstGroupCount ?? analysisSummary?.burstGroupCount ?? 0;
  const keepCount = analysisTask?.keepCount ?? analysisSummary?.keepCount ?? 0;
  const reviewCount = analysisTask?.reviewCount ?? analysisSummary?.reviewCount ?? 0;
  const albumCandidateCount = analysisTask?.albumCandidateCount ?? analysisSummary?.albumCandidateCount ?? 0;
  const detectedFaceCount = peopleSummary?.detectedFaceCount ?? 0;
  const clusteredPeopleCount = peopleSummary?.clusteredPeopleCount ?? 0;
  const visibleAlbumCandidates = albumCandidates.slice(0, 4);
  const latestActivity = activity.slice(0, 3);
  const activeGroups = groupSummaries.slice(0, 4);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
      <section className="min-w-0 space-y-4">
        <div className="relative overflow-hidden rounded-[34px] bg-ink/38 p-5 shadow-soft">
          <div className="absolute right-0 top-0 h-28 w-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="accent">Workspace</StatusPill>
                <StatusPill tone="muted">{photos.length}{hasMorePhotos ? "+" : ""} photos</StatusPill>
              </div>
              <h2 className="mt-3 truncate text-3xl font-semibold tracking-[-0.05em] text-text">{project.name}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <LumozaButton type="button" onClick={onStartAnalysis} variant="secondary"><BrainCircuit className="h-4 w-4" /> Analyze</LumozaButton>
              <LumozaButton type="button" onClick={onStartScan} variant="primary"><ScanLine className="h-4 w-4" /> Scan</LumozaButton>
            </div>
          </div>
        </div>

        <ProjectPhotoGrid
          photos={photos}
          isLoading={isLoadingPhotos}
          isLoadingMore={isLoadingMorePhotos}
          hasMore={hasMorePhotos}
          error={photoError}
          onLoadMore={onLoadMorePhotos}
        />
      </section>

      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <ScanProgressCard task={task} onPause={onPause} onResume={onResume} onCancel={onCancel} />

        <section className="rounded-[30px] bg-white/[0.035] p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-text"><Sparkles className="h-4 w-4 text-accent" /> AI picks</div>
            <span className="text-xs text-subtle">{analysisTask?.status ?? "ready"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CompactStat label="Keep" value={keepCount} />
            <CompactStat label="Review" value={reviewCount} />
            <CompactStat label="Album" value={albumCandidateCount} />
            <CompactStat label="Score" value={`${((analysisTask?.averageScore ?? averageScore ?? 0) * 100).toFixed(0)}%`} />
          </div>
          {analysisTask ? <p className="mt-4 line-clamp-2 text-xs leading-5 text-muted">{analysisTask.message}</p> : null}
        </section>

        <section className="rounded-[30px] bg-white/[0.03] p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-text"><UsersRound className="h-4 w-4 text-purple" /> People</div>
          <div className="grid grid-cols-2 gap-2">
            <CompactStat label="Faces" value={detectedFaceCount} />
            <CompactStat label="People" value={clusteredPeopleCount} />
          </div>
        </section>

        <section className="rounded-[30px] bg-white/[0.03] p-5 shadow-soft">
          <p className="mb-3 text-sm text-text">Shortlist</p>
          <div className="space-y-2">
            {visibleAlbumCandidates.length === 0 ? <p className="text-sm text-subtle">Run analysis for keep picks.</p> : null}
            {visibleAlbumCandidates.map((photo) => (
              <div key={photo.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.045] px-3 py-2 text-sm">
                <span className="truncate text-muted">{photo.filename}</span>
                <span className="font-mono text-xs text-accent">{photo.confidenceScore !== undefined ? `${(photo.confidenceScore * 100).toFixed(0)}%` : "pick"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] bg-white/[0.03] p-5 shadow-soft">
          <p className="mb-3 text-sm text-text">Grouping</p>
          <div className="grid grid-cols-2 gap-2">
            <CompactStat label="Duplicate" value={duplicateGroupCount} />
            <CompactStat label="Burst" value={burstGroupCount} />
          </div>
          {activeGroups.length > 0 ? (
            <div className="mt-3 space-y-2">
              {activeGroups.map((group) => (
                <div key={group.groupId} className="truncate rounded-2xl bg-white/[0.04] px-3 py-2 text-xs text-muted">{group.bestFilename ?? group.groupId}</div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[30px] bg-white/[0.025] p-5 text-sm text-muted shadow-soft">
          <p className="mb-3 text-text">Activity</p>
          {latestActivity.length === 0 ? <p className="text-subtle">No recent events.</p> : null}
          <div className="space-y-2">
            {latestActivity.map((item) => <p key={item.id} className="line-clamp-2 rounded-2xl bg-white/[0.04] px-3 py-2">{item.message}</p>)}
          </div>
        </section>
      </aside>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, CheckCircle2, RotateCcw, ScanLine, ShieldCheck, SlidersHorizontal, Sparkles, Trophy, UsersRound, XCircle } from "lucide-react";
import { ProjectPhotoGrid } from "../components/photo-grid/ProjectPhotoGrid";
import type { PhotoOverrideAction } from "../components/ui/ThumbnailCard";
import { ScanProgressCard } from "../components/progress/ScanProgressCard";
import { LumozaButton } from "../components/ui/LumozaButton";
import { StatusPill } from "../components/ui/StatusPill";
import type { CurationGroupSummary, ProjectAnalysisSummary, ProjectPeopleSummary, ProjectPhoto, ProjectSelectionSummary, ProjectSummary } from "../types/project";
import type { ActivityItem, QualityAnalysisTask, ScanTask, SmartSelectionTask } from "../types/system";

type SelectionBucket = "all" | "final" | "review" | "rejected";

interface ProjectWorkspaceProps {
  project: ProjectSummary;
  photos: ProjectPhoto[];
  albumCandidates: ProjectPhoto[];
  reviewQueue: ProjectPhoto[];
  groupSummaries: CurationGroupSummary[];
  analysisSummary?: ProjectAnalysisSummary;
  peopleSummary?: ProjectPeopleSummary;
  selectionSummary?: ProjectSelectionSummary;
  finalSelectionPhotos: ProjectPhoto[];
  selectionBucket: SelectionBucket;
  finalCountTarget: number;
  reviewCountTarget: number;
  isLoadingPhotos: boolean;
  isLoadingMorePhotos: boolean;
  hasMorePhotos: boolean;
  photoError?: string;
  task?: ScanTask;
  analysisTask?: QualityAnalysisTask;
  selectionTask?: SmartSelectionTask;
  activity: ActivityItem[];
  onLoadMorePhotos: () => void;
  onSelectionBucketChange: (bucket: SelectionBucket) => void;
  onFinalCountTargetChange: (value: number) => void;
  onReviewCountTargetChange: (value: number) => void;
  onSetPhotoOverride: (photoId: string, overrideLabel: PhotoOverrideAction) => void;
  onStartScan: () => void;
  onStartAnalysis: () => void;
  onStartSmartSelection: () => void;
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
  selectionSummary,
  finalSelectionPhotos,
  selectionBucket,
  finalCountTarget,
  reviewCountTarget,
  isLoadingPhotos,
  isLoadingMorePhotos,
  hasMorePhotos,
  photoError,
  task,
  analysisTask,
  selectionTask,
  activity,
  onLoadMorePhotos,
  onSelectionBucketChange,
  onFinalCountTargetChange,
  onReviewCountTargetChange,
  onSetPhotoOverride,
  onStartScan,
  onStartAnalysis,
  onStartSmartSelection,
  onPause,
  onResume,
  onCancel,
}: ProjectWorkspaceProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | undefined>();
  const selectedPhoto = useMemo(() => photos.find((photo) => photo.id === selectedPhotoId) ?? photos[0], [photos, selectedPhotoId]);

  useEffect(() => {
    if (photos.length === 0) {
      setSelectedPhotoId(undefined);
      return;
    }
    if (!selectedPhotoId || !photos.some((photo) => photo.id === selectedPhotoId)) {
      setSelectedPhotoId(photos[0].id);
    }
  }, [photos, selectedPhotoId]);

  const moveSelection = (direction: 1 | -1) => {
    if (photos.length === 0) {
      return;
    }
    const currentIndex = Math.max(0, photos.findIndex((photo) => photo.id === selectedPhoto?.id));
    const nextIndex = Math.min(photos.length - 1, Math.max(0, currentIndex + direction));
    setSelectedPhotoId(photos[nextIndex].id);
  };

  const applySelectedOverride = (overrideLabel: PhotoOverrideAction) => {
    if (!selectedPhoto) {
      return;
    }
    onSetPhotoOverride(selectedPhoto.id, overrideLabel);
    if (selectionBucket === "review") {
      moveSelection(1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button")) {
        return;
      }
      if (!selectedPhoto) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "j") {
        event.preventDefault();
        moveSelection(1);
      } else if (event.key === "ArrowLeft" || event.key === "k") {
        event.preventDefault();
        moveSelection(-1);
      } else if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        applySelectedOverride("protect");
      } else if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        applySelectedOverride("force_include");
      } else if (event.key.toLowerCase() === "x") {
        event.preventDefault();
        applySelectedOverride("force_exclude");
      } else if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        applySelectedOverride("clear");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos, selectedPhoto, selectionBucket, onSetPhotoOverride]);

  const averageScore = analysisSummary?.averageOverallScore ?? averageQualityScore(photos);
  const duplicateGroupCount = analysisTask?.duplicateGroupCount ?? analysisSummary?.duplicateGroupCount ?? 0;
  const burstGroupCount = analysisTask?.burstGroupCount ?? analysisSummary?.burstGroupCount ?? 0;
  const keepCount = analysisTask?.keepCount ?? analysisSummary?.keepCount ?? 0;
  const reviewCount = analysisTask?.reviewCount ?? analysisSummary?.reviewCount ?? 0;
  const albumCandidateCount = analysisTask?.albumCandidateCount ?? analysisSummary?.albumCandidateCount ?? 0;
  const detectedFaceCount = peopleSummary?.detectedFaceCount ?? 0;
  const clusteredPeopleCount = peopleSummary?.clusteredPeopleCount ?? 0;
  const visibleAlbumCandidates = albumCandidates.slice(0, 4);
  const visibleFinalSelection = finalSelectionPhotos.slice(0, 4);
  const selectedCount = selectionTask?.selectedCount ?? selectionSummary?.selectedCount ?? 0;
  const finalTarget = selectionTask?.finalCountTarget ?? finalCountTarget;
  const selectionReviewCount = selectionTask?.reviewCount ?? selectionSummary?.reviewCount ?? 0;
  const protectedCount = selectionTask?.protectedCount ?? selectionSummary?.protectedCount ?? 0;
  const latestActivity = activity.slice(0, 3);
  const activeGroups = groupSummaries.slice(0, 4);
  const buckets: Array<{ id: SelectionBucket; label: string; count: number }> = [
    { id: "all", label: "All", count: project.photoCount || photos.length },
    { id: "final", label: "Final", count: selectedCount },
    { id: "review", label: "Review", count: selectionReviewCount },
    { id: "rejected", label: "Rejected", count: selectionSummary?.rejectedCount ?? selectionTask?.rejectedCount ?? 0 },
  ];


  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-w-0 min-h-0 flex-col gap-4">
        <div className="relative shrink-0 overflow-hidden rounded-[30px] bg-ink/34 p-4 shadow-soft">
          <div className="absolute right-0 top-0 h-28 w-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="accent">Workspace</StatusPill>
                <StatusPill tone="muted">{photos.length}{hasMorePhotos ? "+" : ""} photos</StatusPill>
              </div>
              <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.05em] text-text">{project.name}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <LumozaButton type="button" onClick={onStartSmartSelection} variant="secondary"><Trophy className="h-4 w-4" /> Select</LumozaButton>
              <LumozaButton type="button" onClick={onStartAnalysis} variant="secondary"><BrainCircuit className="h-4 w-4" /> Analyze</LumozaButton>
              <LumozaButton type="button" onClick={onStartScan} variant="primary"><ScanLine className="h-4 w-4" /> Scan</LumozaButton>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[26px] bg-white/[0.035] px-3 py-3 shadow-soft">
          <div className="flex items-center gap-2 text-sm text-muted">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            <span>Review set</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {buckets.map((bucket) => (
              <button
                key={bucket.id}
                type="button"
                onClick={() => onSelectionBucketChange(bucket.id)}
                className={`lumoza-focus rounded-full px-3 py-1.5 text-xs transition duration-200 ${selectionBucket === bucket.id ? "bg-accent/18 text-text shadow-glow" : "bg-white/[0.045] text-subtle hover:bg-white/[0.08] hover:text-text"}`}
              >
                {bucket.label} <span className="font-mono text-[11px] opacity-70">{bucket.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[24px] bg-ink/28 px-3 py-2 shadow-soft">
          <div className="min-w-0 text-xs text-subtle">
            <span className="text-muted">Focused:</span> <span className="text-text">{selectedPhoto?.filename ?? "No memory selected"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className="lumoza-focus rounded-xl bg-white/[0.055] px-2.5 py-1.5 text-xs text-muted hover:text-text" onClick={() => moveSelection(-1)}>←/K</button>
            <button type="button" className="lumoza-focus rounded-xl bg-white/[0.055] px-2.5 py-1.5 text-xs text-muted hover:text-text" onClick={() => moveSelection(1)}>→/J</button>
            <button type="button" className="lumoza-focus inline-flex items-center gap-1 rounded-xl bg-purple/12 px-2.5 py-1.5 text-xs text-purple hover:bg-purple/18" disabled={!selectedPhoto} onClick={() => applySelectedOverride("protect")}><ShieldCheck className="h-3.5 w-3.5" /> P</button>
            <button type="button" className="lumoza-focus inline-flex items-center gap-1 rounded-xl bg-success/10 px-2.5 py-1.5 text-xs text-success hover:bg-success/15" disabled={!selectedPhoto} onClick={() => applySelectedOverride("force_include")}><CheckCircle2 className="h-3.5 w-3.5" /> I</button>
            <button type="button" className="lumoza-focus inline-flex items-center gap-1 rounded-xl bg-error/10 px-2.5 py-1.5 text-xs text-error hover:bg-error/15" disabled={!selectedPhoto} onClick={() => applySelectedOverride("force_exclude")}><XCircle className="h-3.5 w-3.5" /> X</button>
            <button type="button" className="lumoza-focus inline-flex items-center gap-1 rounded-xl bg-white/[0.055] px-2.5 py-1.5 text-xs text-muted hover:text-text" disabled={!selectedPhoto} onClick={() => applySelectedOverride("clear")}><RotateCcw className="h-3.5 w-3.5" /> C</button>
          </div>
        </div>

        <ProjectPhotoGrid
          photos={photos}
          isLoading={isLoadingPhotos}
          isLoadingMore={isLoadingMorePhotos}
          hasMore={hasMorePhotos}
          error={photoError}
          onLoadMore={onLoadMorePhotos}
          selectedPhotoId={selectedPhoto?.id}
          onSelectPhoto={setSelectedPhotoId}
          onSetPhotoOverride={onSetPhotoOverride}
        />
      </section>

      <aside className="lumoza-scrollbar hidden min-h-0 space-y-4 overflow-y-auto pr-1 xl:block">
        <ScanProgressCard task={task} onPause={onPause} onResume={onResume} onCancel={onCancel} />


        <section className="rounded-[30px] bg-white/[0.035] p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-text"><Trophy className="h-4 w-4 text-warning" /> Final selection</div>
            <span className="text-xs text-subtle">{selectionTask?.status ?? selectionSummary?.lastStatus ?? "ready"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CompactStat label="Final" value={`${selectedCount}/${finalTarget}`} />
            <CompactStat label="Review" value={selectionReviewCount} />
            <CompactStat label="Protected" value={protectedCount} />
            <CompactStat label="Runs" value={selectionSummary?.selectionRunCount ?? 0} />
          </div>
          {selectionTask ? <p className="mt-4 line-clamp-2 text-xs leading-5 text-muted">{selectionTask.message}</p> : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="space-y-1 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs text-subtle">
              <span>Final target</span>
              <input
                type="number"
                min={1}
                max={10000}
                value={finalCountTarget}
                onChange={(event) => onFinalCountTargetChange(Number(event.target.value))}
                className="lumoza-focus w-full bg-transparent font-mono text-sm text-text outline-none"
              />
            </label>
            <label className="space-y-1 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs text-subtle">
              <span>Review target</span>
              <input
                type="number"
                min={0}
                max={20000}
                value={reviewCountTarget}
                onChange={(event) => onReviewCountTargetChange(Number(event.target.value))}
                className="lumoza-focus w-full bg-transparent font-mono text-sm text-text outline-none"
              />
            </label>
          </div>
          <LumozaButton type="button" variant="primary" className="mt-4 w-full" disabled={selectionTask?.status === "running"} onClick={onStartSmartSelection}>Refilter album</LumozaButton>
          <div className="mt-4 space-y-2">
            {visibleFinalSelection.length === 0 ? <p className="text-sm text-subtle">Run smart selection for final memories.</p> : null}
            {visibleFinalSelection.map((photo) => (
              <div key={photo.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.045] px-3 py-2 text-sm">
                <span className="truncate text-muted">{photo.filename}</span>
                <span className="font-mono text-xs text-warning">{photo.rankingScore !== undefined ? `${(photo.rankingScore * 100).toFixed(0)}%` : "final"}</span>
              </div>
            ))}
          </div>
        </section>

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

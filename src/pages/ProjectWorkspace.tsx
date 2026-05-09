import { ProjectPhotoGrid } from "../components/photo-grid/ProjectPhotoGrid";
import { ScanProgressCard } from "../components/progress/ScanProgressCard";
import { getThumbnailPipelineSummary } from "../services/thumbnailService";
import type { CurationGroupSummary, ProjectAnalysisSummary, ProjectPhoto, ProjectSummary } from "../types/project";
import type { ActivityItem, QualityAnalysisTask, ScanTask } from "../types/system";

interface ProjectWorkspaceProps {
  project: ProjectSummary;
  photos: ProjectPhoto[];
  albumCandidates: ProjectPhoto[];
  reviewQueue: ProjectPhoto[];
  groupSummaries: CurationGroupSummary[];
  analysisSummary?: ProjectAnalysisSummary;
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
  const total = scored.reduce((sum, photo) => sum + (photo.quality?.overallScore ?? 0), 0);
  return total / scored.length;
}

export function ProjectWorkspace({
  project,
  photos,
  albumCandidates,
  reviewQueue,
  groupSummaries,
  analysisSummary,
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
  const thumbnailSummary = getThumbnailPipelineSummary(task);
  const averageScore = analysisSummary?.averageOverallScore ?? averageQualityScore(photos);
  const duplicateGroupCount = analysisTask?.duplicateGroupCount ?? analysisSummary?.duplicateGroupCount ?? 0;
  const burstGroupCount = analysisTask?.burstGroupCount ?? analysisSummary?.burstGroupCount ?? 0;
  const keepCount = analysisTask?.keepCount ?? analysisSummary?.keepCount ?? 0;
  const reviewCount = analysisTask?.reviewCount ?? analysisSummary?.reviewCount ?? 0;
  const rejectCount = analysisTask?.rejectCount ?? analysisSummary?.rejectCount ?? 0;
  const highConfidenceCount = analysisTask?.highConfidenceCount ?? analysisSummary?.highConfidenceCount ?? 0;
  const albumCandidateCount = analysisTask?.albumCandidateCount ?? analysisSummary?.albumCandidateCount ?? 0;
  const visibleAlbumCandidates = albumCandidates.slice(0, 5);
  const visibleReviewQueue = reviewQueue.slice(0, 5);
  const visibleDuplicateGroups = groupSummaries.filter((group) => group.groupingType === "duplicate").slice(0, 3);
  const visibleBurstGroups = groupSummaries.filter((group) => group.groupingType === "burst").slice(0, 3);
  const analyzedCount = analysisTask?.analyzedCount ?? analysisSummary?.analyzedPhotoCount ?? photos.filter((photo) => photo.quality?.overallScore !== undefined).length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <section className="grid gap-5">
        <div className="rounded-[24px] border border-white/8 bg-card/70 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-muted">Project Workspace</p>
              <h2 className="mt-2 text-3xl font-semibold text-text">{project.name}</h2>
              <p className="mt-3 text-sm text-muted">{project.rootFolder}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onStartAnalysis} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-text">Run analysis</button>
              <button type="button" onClick={onStartScan} className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white">Start scan</button>
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

      <section className="grid gap-5">
        <ScanProgressCard task={task} onPause={onPause} onResume={onResume} onCancel={onCancel} />
        <div className="rounded-[24px] border border-white/8 bg-card/70 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Analysis and ranking</p>
          <p className="mt-3 text-sm leading-7 text-muted">
            {analysisTask
              ? analysisTask.message
              : averageScore !== undefined
                ? `Latest average technical score ${(averageScore * 100).toFixed(0)}%.`
                : "Run Phase 2 analysis to compute technical quality metrics for this project."}
          </p>
          <div className="mt-4 grid gap-2 text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>Analyzed photos</span>
              <span className="text-text">{analyzedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Average score</span>
              <span className="text-text">{((analysisTask?.averageScore ?? averageScore ?? 0) * 100).toFixed(0)}%</span>
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
            <div className="flex items-center justify-between">
              <span>Analysis failures</span>
              <span className="text-text">{analysisTask?.failedCount ?? 0}</span>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/70 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Group audit</p>
          <div className="mt-4 grid gap-4 text-sm text-muted">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-subtle">Duplicate clusters</p>
              <div className="mt-3 space-y-2">
                {visibleDuplicateGroups.length === 0 ? (
                  <p className="text-sm leading-7 text-muted">Duplicate clusters will appear after analysis.</p>
                ) : (
                  visibleDuplicateGroups.map((group) => (
                    <div key={group.groupId} className="rounded-2xl border border-white/8 bg-ink/30 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-text">{group.bestFilename ?? group.groupId}</span>
                        <span className="text-warning">{group.memberCount} frames</span>
                      </div>
                      <p className="mt-2 text-xs text-subtle">{group.averageSimilarity !== undefined ? `${(group.averageSimilarity * 100).toFixed(0)}% average similarity` : "Similarity pending"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-subtle">Burst clusters</p>
              <div className="mt-3 space-y-2">
                {visibleBurstGroups.length === 0 ? (
                  <p className="text-sm leading-7 text-muted">Burst clusters will appear after analysis.</p>
                ) : (
                  visibleBurstGroups.map((group) => (
                    <div key={group.groupId} className="rounded-2xl border border-white/8 bg-ink/30 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-text">{group.bestFilename ?? group.groupId}</span>
                        <span className="text-accent">{group.memberCount} frames</span>
                      </div>
                      <p className="mt-2 text-xs text-subtle">{group.averageSimilarity !== undefined ? `${(group.averageSimilarity * 100).toFixed(0)}% average similarity` : "Similarity pending"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/70 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Album shortlist</p>
          <div className="mt-4 space-y-3">
            {visibleAlbumCandidates.length === 0 ? (
              <p className="text-sm leading-7 text-muted">Run analysis to surface high-confidence keep picks for album review.</p>
            ) : (
              visibleAlbumCandidates.map((photo) => (
                <div key={photo.id} className="rounded-2xl border border-white/8 bg-ink/30 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-text">{photo.filename}</span>
                    <span className="text-accent">{photo.confidenceScore !== undefined ? `${(photo.confidenceScore * 100).toFixed(0)}%` : "candidate"}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-subtle">{photo.selectionReason ?? "Selection reason pending"}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/70 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Review queue</p>
          <div className="mt-4 space-y-3">
            {visibleReviewQueue.length === 0 ? (
              <p className="text-sm leading-7 text-muted">Ambiguous ranking decisions will appear here after analysis.</p>
            ) : (
              visibleReviewQueue.map((photo) => (
                <div key={photo.id} className="rounded-2xl border border-white/8 bg-ink/30 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-text">{photo.filename}</span>
                    <span className="text-warning">{photo.selectionLabel ?? "review"}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-subtle">{photo.selectionReason ?? "Selection reason pending"}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/70 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">{thumbnailSummary.title}</p>
          <p className="mt-3 text-sm leading-7 text-muted">{thumbnailSummary.detail}</p>
          <div className="mt-4 grid gap-2 text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>Generated previews</span>
              <span className="text-text">{thumbnailSummary.generatedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Failed previews</span>
              <span className="text-text">{thumbnailSummary.failedCount}</span>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/70 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Activity log</p>
          <div className="mt-4 space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-subtle">No activity entries yet.</p>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/8 bg-ink/30 px-4 py-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-text">{item.message}</span>
                    <span className="text-subtle">{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

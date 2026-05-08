import { ProjectPhotoGrid } from "../components/photo-grid/ProjectPhotoGrid";
import { ScanProgressCard } from "../components/progress/ScanProgressCard";
import { getThumbnailPipelineSummary } from "../services/thumbnailService";
import type { ProjectPhoto, ProjectSummary } from "../types/project";
import type { ActivityItem, ScanTask } from "../types/system";

interface ProjectWorkspaceProps {
  project: ProjectSummary;
  photos: ProjectPhoto[];
  isLoadingPhotos: boolean;
  isLoadingMorePhotos: boolean;
  hasMorePhotos: boolean;
  photoError?: string;
  task?: ScanTask;
  activity: ActivityItem[];
  onLoadMorePhotos: () => void;
  onStartScan: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function ProjectWorkspace({
  project,
  photos,
  isLoadingPhotos,
  isLoadingMorePhotos,
  hasMorePhotos,
  photoError,
  task,
  activity,
  onLoadMorePhotos,
  onStartScan,
  onPause,
  onResume,
  onCancel,
}: ProjectWorkspaceProps) {
  const thumbnailSummary = getThumbnailPipelineSummary(task);

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
            <button type="button" onClick={onStartScan} className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white">Start scan</button>
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

import type { ScanTask } from "../types/system";

export interface ThumbnailPipelineSummary {
  title: string;
  detail: string;
  generatedCount: number;
  failedCount: number;
}

export function getThumbnailPipelineSummary(task?: ScanTask): ThumbnailPipelineSummary {
  if (!task) {
    return {
      title: "Thumbnail pipeline waiting",
      detail: "Generate cached previews after the scan starts.",
      generatedCount: 0,
      failedCount: 0,
    };
  }

  if (task.thumbnailGeneratedCount === 0 && task.thumbnailFailedCount === 0 && task.status === "running") {
    return {
      title: "Thumbnail queue preparing",
      detail: "Indexing is still in progress. Thumbnail generation starts after metadata capture.",
      generatedCount: 0,
      failedCount: 0,
    };
  }

  return {
    title: "Thumbnail pipeline",
    detail:
      task.thumbnailFailedCount > 0
        ? `Generated ${task.thumbnailGeneratedCount} cached previews and skipped ${task.thumbnailFailedCount} unsupported or unreadable files.`
        : `Generated ${task.thumbnailGeneratedCount} cached previews in app-managed storage.`,
    generatedCount: task.thumbnailGeneratedCount,
    failedCount: task.thumbnailFailedCount,
  };
}

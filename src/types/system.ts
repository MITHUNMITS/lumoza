export type ScanTaskStatus = "idle" | "running" | "paused" | "cancelled" | "completed" | "error";

export interface SystemStatus {
  pythonSidecar: "online" | "offline" | "placeholder";
  sqlite: "ready" | "missing";
  registry: "ready" | "missing";
  activeTaskCount: number;
}

export interface ScanTask {
  id: string;
  projectId: string;
  status: ScanTaskStatus;
  progressCurrent: number;
  progressTotal: number;
  message: string;
  indexedCount: number;
  failedCount: number;
  thumbnailGeneratedCount: number;
  thumbnailFailedCount: number;
}

export interface QualityAnalysisTask {
  id: string;
  projectId: string;
  status: ScanTaskStatus;
  progressCurrent: number;
  progressTotal: number;
  message: string;
  analyzedCount: number;
  failedCount: number;
  averageScore: number;
  duplicateGroupCount: number;
  burstGroupCount: number;
  keepCount: number;
  reviewCount: number;
  rejectCount: number;
}

export interface ActivityItem {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "error";
  message: string;
  createdAt: string;
}

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
}

export interface ActivityItem {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "error";
  message: string;
  createdAt: string;
}

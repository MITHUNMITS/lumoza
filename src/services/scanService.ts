import { invokeOrMock } from "./tauriCommands";
import type { ScanTask } from "../types/system";

function mockTask(projectId: string, status: ScanTask["status"], message: string): ScanTask {
  return {
    id: crypto.randomUUID(),
    projectId,
    status,
    progressCurrent: status === "running" ? 12 : 0,
    progressTotal: 100,
    message,
  };
}

export function startScan(projectId: string) {
  return invokeOrMock<ScanTask>("start_scan", { projectId }, mockTask(projectId, "running", "Scanning source folders and indexing metadata."));
}

export function pauseScan(taskId: string, projectId: string) {
  return invokeOrMock<ScanTask>("pause_scan", { taskId, projectId }, mockTask(projectId, "paused", "Paused at the next safe checkpoint."));
}

export function resumeScan(taskId: string, projectId: string) {
  return invokeOrMock<ScanTask>("resume_scan", { taskId, projectId }, mockTask(projectId, "running", "Resumed from persisted checkpoint."));
}

export function cancelScan(taskId: string, projectId: string) {
  return invokeOrMock<ScanTask>("cancel_scan", { taskId, projectId }, mockTask(projectId, "cancelled", "Cancelled after persisting completed work."));
}

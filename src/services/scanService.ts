import { invokeOrMock } from "./tauriCommands";
import { applyMockScanResult } from "./projectService";
import type { ScanTask } from "../types/system";

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function mockTask(projectId: string, status: ScanTask["status"], message: string, indexedCount = 0, failedCount = 0): ScanTask {
  return {
    id: crypto.randomUUID(),
    projectId,
    status,
    progressCurrent: indexedCount,
    progressTotal: indexedCount,
    message,
    indexedCount,
    failedCount,
  };
}

export async function startScan(projectId: string) {
  if (!hasTauriRuntime()) {
    const indexedCount = applyMockScanResult(projectId);
    return mockTask(projectId, "completed", indexedCount > 0 ? `Indexed ${indexedCount} supported photos.` : "No supported photos were found.", indexedCount, 0);
  }

  return invokeOrMock<ScanTask>("start_scan", { projectId });
}

export function pauseScan(taskId: string, projectId: string) {
  return invokeOrMock<ScanTask>("pause_scan", { taskId, projectId }, mockTask(projectId, "paused", "Pause is reserved for async scan execution."));
}

export function resumeScan(taskId: string, projectId: string) {
  return invokeOrMock<ScanTask>("resume_scan", { taskId, projectId }, mockTask(projectId, "running", "Resume is reserved for async scan execution."));
}

export function cancelScan(taskId: string, projectId: string) {
  return invokeOrMock<ScanTask>("cancel_scan", { taskId, projectId }, mockTask(projectId, "cancelled", "Cancel is reserved for async scan execution."));
}

import { invokeOrMock } from "./tauriCommands";
import type { QualityAnalysisTask } from "../types/system";

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function mockAnalysisTask(projectId: string, status: QualityAnalysisTask["status"], message: string, analyzedCount = 0, failedCount = 0, averageScore = 0.0): QualityAnalysisTask {
  return {
    id: crypto.randomUUID(),
    projectId,
    status,
    progressCurrent: analyzedCount + failedCount,
    progressTotal: analyzedCount + failedCount,
    message,
    analyzedCount,
    failedCount,
    averageScore,
  };
}

export async function startQualityAnalysis(projectId: string) {
  if (!hasTauriRuntime()) {
    return mockAnalysisTask(projectId, "completed", "Mock technical analysis completed.", 48, 0, 0.78);
  }

  return invokeOrMock<QualityAnalysisTask>("start_quality_analysis", { projectId });
}

export function getQualityAnalysisTask(taskId: string) {
  return invokeOrMock<QualityAnalysisTask | null>("get_quality_analysis_task", { taskId }, null);
}

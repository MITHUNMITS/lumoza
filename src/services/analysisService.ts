import { invokeOrMock } from "./tauriCommands";
import type { ProjectAnalysisSummary } from "../types/project";
import type { QualityAnalysisTask } from "../types/system";

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function mockAnalysisTask(
  projectId: string,
  status: QualityAnalysisTask["status"],
  message: string,
  analyzedCount = 0,
  failedCount = 0,
  averageScore = 0.0,
  duplicateGroupCount = 0,
  burstGroupCount = 0,
  keepCount = 0,
  reviewCount = 0,
  rejectCount = 0,
  highConfidenceCount = 0,
  albumCandidateCount = 0,
): QualityAnalysisTask {
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
    duplicateGroupCount,
    burstGroupCount,
    keepCount,
    reviewCount,
    rejectCount,
    highConfidenceCount,
    albumCandidateCount,
  };
}

export async function startQualityAnalysis(projectId: string) {
  if (!hasTauriRuntime()) {
    return mockAnalysisTask(projectId, "completed", "Mock technical analysis completed with grouping, ranking, and confidence guidance.", 48, 0, 0.78, 6, 4, 14, 22, 12, 18, 9);
  }

  return invokeOrMock<QualityAnalysisTask>("start_quality_analysis", { projectId });
}

export function getQualityAnalysisTask(taskId: string) {
  return invokeOrMock<QualityAnalysisTask | null>("get_quality_analysis_task", { taskId }, null);
}

export async function getProjectAnalysisSummary(projectId: string): Promise<ProjectAnalysisSummary> {
  if (!hasTauriRuntime()) {
    return {
      analyzedPhotoCount: 48,
      averageOverallScore: 0.78,
      duplicateGroupCount: 6,
      burstGroupCount: 4,
      keepCount: 14,
      reviewCount: 22,
      rejectCount: 12,
      highConfidenceCount: 18,
      albumCandidateCount: 9,
    };
  }

  return invokeOrMock<ProjectAnalysisSummary>("get_project_analysis_summary", { projectId });
}

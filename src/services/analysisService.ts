import { invokeOrMock } from "./tauriCommands";
import type { CurationGroupSummary, ProjectAnalysisSummary, ProjectPeopleSummary, ProjectPerson, ProjectSelectionSummary } from "../types/project";
import type { PeopleAnalysisTask, QualityAnalysisTask, SmartSelectionTask } from "../types/system";

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


function mockPeopleTask(projectId: string): PeopleAnalysisTask {
  return {
    id: crypto.randomUUID(),
    projectId,
    status: "completed",
    progressCurrent: 48,
    progressTotal: 48,
    message: "People analysis complete: 6 face candidates organized into 3 people groups.",
    processedPhotoCount: 48,
    failedCount: 0,
    detectedFaceCount: 6,
    clusteredPeopleCount: 3,
    modelStatus: "local_cpu_candidate",
  };
}

export async function startPeopleAnalysis(projectId: string) {
  if (!hasTauriRuntime()) {
    return mockPeopleTask(projectId);
  }

  return invokeOrMock<PeopleAnalysisTask>("start_people_analysis", { projectId });
}

export function getPeopleAnalysisTask(taskId: string) {
  return invokeOrMock<PeopleAnalysisTask | null>("get_people_analysis_task", { taskId }, null);
}


function mockSelectionTask(projectId: string): SmartSelectionTask {
  return {
    id: crypto.randomUUID(),
    projectId,
    status: "completed",
    progressCurrent: 48,
    progressTotal: 48,
    message: "Smart selection complete: 24 final memories, 18 review items, 6 rejected candidates.",
    finalCountTarget: 300,
    reviewCountTarget: 1000,
    selectedCount: 24,
    reviewCount: 18,
    rejectedCount: 6,
    protectedCount: 1,
  };
}

export async function startSmartSelection(projectId: string, input?: { finalCountTarget?: number; reviewCountTarget?: number }) {
  if (!hasTauriRuntime()) {
    void input;
    return mockSelectionTask(projectId);
  }

  return invokeOrMock<SmartSelectionTask>("start_smart_selection", { projectId, input });
}

export function getSmartSelectionTask(taskId: string) {
  return invokeOrMock<SmartSelectionTask | null>("get_smart_selection_task", { taskId }, null);
}

export async function getProjectSelectionSummary(projectId: string): Promise<ProjectSelectionSummary> {
  if (!hasTauriRuntime()) {
    void projectId;
    return {
      selectionRunCount: 1,
      finalCountTarget: 300,
      reviewCountTarget: 1000,
      selectedCount: 24,
      reviewCount: 18,
      rejectedCount: 6,
      protectedCount: 1,
      lastStatus: "completed",
    };
  }

  return invokeOrMock<ProjectSelectionSummary>("get_project_selection_summary", { projectId });
}

export async function setPhotoSelectionOverride(projectId: string, photoId: string, overrideLabel: string, note?: string): Promise<ProjectSelectionSummary> {
  if (!hasTauriRuntime()) {
    void projectId;
    void photoId;
    void overrideLabel;
    void note;
    return getProjectSelectionSummary(projectId);
  }

  return invokeOrMock<ProjectSelectionSummary>("set_photo_selection_override", { projectId, input: { photoId, overrideLabel, note } });
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



export interface UpdateProjectPersonInput {
  displayName?: string;
  priorityLabel?: string;
  isHidden?: boolean;
}

function createMockPeople(): ProjectPerson[] {
  return ["Maya", "Arun", "Family"].map((name, index) => ({
    id: `mock-person-${index + 1}`,
    displayName: name,
    representativeFaceId: `mock-face-${index + 1}`,
    faceCount: index === 2 ? 2 : 1,
    photoCount: index === 2 ? 2 : 1,
    priorityLabel: index === 0 ? "p1" : "unassigned",
    isHidden: false,
    faces: [{
      id: `mock-face-${index + 1}`,
      photoId: `mock-photo-${index + 1}`,
      filename: `memory-${index + 1}.jpg`,
      boundingBoxX: 0.28,
      boundingBoxY: 0.18,
      boundingBoxWidth: 0.22,
      boundingBoxHeight: 0.28,
      detectionConfidence: 0.82,
      qualityScore: 0.78,
      isRepresentative: true,
    }],
  }));
}

export async function listProjectPeople(projectId: string): Promise<ProjectPerson[]> {
  if (!hasTauriRuntime()) {
    void projectId;
    return createMockPeople();
  }

  return invokeOrMock<ProjectPerson[]>("list_project_people", { projectId }, []);
}

export async function updateProjectPerson(projectId: string, personId: string, input: UpdateProjectPersonInput): Promise<ProjectPerson[]> {
  if (!hasTauriRuntime()) {
    void projectId;
    return createMockPeople().map((person) => person.id === personId ? { ...person, ...input } : person).filter((person) => !person.isHidden);
  }

  return invokeOrMock<ProjectPerson[]>("update_project_person", { projectId, personId, input }, []);
}

export async function mergeProjectPeople(projectId: string, primaryPersonId: string, secondaryPersonId: string): Promise<ProjectPerson[]> {
  if (!hasTauriRuntime()) {
    void projectId;
    return createMockPeople().filter((person) => person.id !== secondaryPersonId).map((person) => person.id === primaryPersonId ? { ...person, faceCount: person.faceCount + 1 } : person);
  }

  return invokeOrMock<ProjectPerson[]>("merge_project_people", { projectId, input: { primaryPersonId, secondaryPersonId } }, []);
}

export async function splitProjectPersonFace(projectId: string, faceDetectionId: string, displayName?: string): Promise<ProjectPerson[]> {
  if (!hasTauriRuntime()) {
    void projectId;
    void faceDetectionId;
    void displayName;
    return createMockPeople();
  }

  return invokeOrMock<ProjectPerson[]>("split_project_person_face", { projectId, input: { faceDetectionId, displayName } }, []);
}

export async function getProjectPeopleSummary(projectId: string): Promise<ProjectPeopleSummary> {
  if (!hasTauriRuntime()) {
    void projectId;
    return {
      faceAnalysisRunCount: 1,
      detectedFaceCount: 6,
      clusteredPeopleCount: 3,
      namedPeopleCount: 3,
      priorityPeopleCount: 1,
      unassignedFaceCount: 0,
      photosWithFacesCount: 6,
    };
  }

  return invokeOrMock<ProjectPeopleSummary>("get_project_people_summary", { projectId });
}


function createMockGroupSummaries(): CurationGroupSummary[] {
  return [
    { groupId: "duplicate:mock:1", groupingType: "duplicate", memberCount: 4, bestFilename: "photo-0008.jpg", averageSimilarity: 0.94 },
    { groupId: "duplicate:mock:2", groupingType: "duplicate", memberCount: 3, bestFilename: "photo-0021.jpg", averageSimilarity: 0.91 },
    { groupId: "burst:mock:1", groupingType: "burst", memberCount: 6, bestFilename: "photo-0034.jpg", averageSimilarity: 0.82 },
    { groupId: "burst:mock:2", groupingType: "burst", memberCount: 5, bestFilename: "photo-0042.jpg", averageSimilarity: 0.79 },
  ];
}

export async function listProjectGroupSummaries(projectId: string, limit = 24): Promise<CurationGroupSummary[]> {
  if (!hasTauriRuntime()) {
    void projectId;
    return createMockGroupSummaries().slice(0, limit);
  }

  return invokeOrMock<CurationGroupSummary[]>("list_project_group_summaries", { projectId, limit }, []);
}

export type ProjectStatus = "ready" | "scanning" | "paused" | "error";
export type ThumbnailStatus = "pending" | "generated" | "failed";

export interface ProjectSummary {
  projectId: string;
  name: string;
  rootFolder: string;
  projectDbPath: string;
  thumbnailCachePath: string;
  status: ProjectStatus;
  photoCount: number;
  lastOpenedAt?: string;
}

export interface ProjectAnalysisSummary {
  analyzedPhotoCount: number;
  averageOverallScore?: number;
  duplicateGroupCount: number;
  burstGroupCount: number;
  keepCount: number;
  reviewCount: number;
  rejectCount: number;
  highConfidenceCount: number;
  albumCandidateCount: number;
}

export interface ProjectPeopleSummary {
  faceAnalysisRunCount: number;
  detectedFaceCount: number;
  clusteredPeopleCount: number;
  namedPeopleCount: number;
  priorityPeopleCount: number;
  unassignedFaceCount: number;
  photosWithFacesCount: number;
}

export interface ProjectPhotoQualitySummary {
  sharpnessScore?: number;
  exposureScore?: number;
  contrastScore?: number;
  resolutionScore?: number;
  overallScore?: number;
}

export type SelectionLabel = "keep" | "review" | "reject";
export type ConfidenceLabel = "high" | "medium" | "low";

export interface ProjectPhoto {
  id: string;
  absolutePath: string;
  filename: string;
  extension: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  modifiedAt?: string;
  thumbnailStatus: ThumbnailStatus;
  thumbnailCachePath?: string;
  quality?: ProjectPhotoQualitySummary;
  duplicateGroupId?: string;
  burstGroupId?: string;
  rankingScore?: number;
  selectionLabel?: SelectionLabel;
  selectionReason?: string;
  confidenceScore?: number;
  confidenceLabel?: ConfidenceLabel;
  albumCandidate: boolean;
}

export interface CurationGroupSummary {
  groupId: string;
  groupingType: "duplicate" | "burst";
  memberCount: number;
  bestPhotoId?: string;
  bestFilename?: string;
  averageSimilarity?: number;
}

export interface CreateProjectInput {
  name: string;
  rootFolder: string;
}

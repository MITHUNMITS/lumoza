import { useEffect, useState, type ComponentType } from "react";
import { Aperture, CalendarDays, FolderOpen, GitCompare, Images, Map, Search, Settings, Sparkles, Upload, UsersRound, Download } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { LumozaButton } from "../components/ui/LumozaButton";
import { LumozaLogo } from "../components/ui/LumozaLogo";
import type { PhotoOverrideAction } from "../components/ui/ThumbnailCard";
import { StartupSplash } from "../components/splash/StartupSplash";
import { ProjectDashboard } from "../pages/ProjectDashboard";
import { OperationsPage } from "../pages/OperationsPage";
import { ProjectWorkspace } from "../pages/ProjectWorkspace";
import { SettingsPage } from "../pages/SettingsPage";
import { StudioPage } from "../pages/StudioPage";
import { getPeopleAnalysisTask, getProjectAnalysisSummary, getProjectPeopleSummary, getProjectSelectionSummary, getQualityAnalysisTask, getSmartSelectionTask, listProjectGroupSummaries, listProjectPeople, mergeProjectPeople, splitProjectPersonFace, setPhotoSelectionOverride, startPeopleAnalysis, startQualityAnalysis, startSmartSelection, updateProjectPerson } from "../services/analysisService";
import { listAlbumCandidatePhotos, listFinalSelectionPhotos, listProjectPhotos, listReviewQueuePhotos } from "../services/photoService";
import { createProject, listProjects } from "../services/projectService";
import { cancelScan, getScanTask, pauseScan, resumeScan, startScan } from "../services/scanService";
import { bootstrapApplication, getSystemStatus } from "../services/systemStatusService";
import { useAppStore } from "../stores/appStore";
import { useProjectStore } from "../stores/projectStore";
import { useScanStore } from "../stores/scanStore";
import type { CreateProjectInput, CurationGroupSummary, ProjectAnalysisSummary, ProjectPeopleSummary, ProjectPerson, ProjectPhoto, ProjectSelectionSummary } from "../types/project";
import type { PeopleAnalysisTask, QualityAnalysisTask, ScanTask, SmartSelectionTask, SystemStatus } from "../types/system";

const PHOTO_PAGE_SIZE = 180;
type SelectionBucket = "all" | "final" | "review" | "rejected";

function isTerminal(task?: ScanTask | QualityAnalysisTask | PeopleAnalysisTask | SmartSelectionTask) {
  return task ? task.status === "completed" || task.status === "cancelled" || task.status === "error" : false;
}

export function App() {
  const [statusText, setStatusText] = useState("Preparing desktop foundation...");
  const [projectPhotos, setProjectPhotos] = useState<ProjectPhoto[]>([]);
  const [albumCandidates, setAlbumCandidates] = useState<ProjectPhoto[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ProjectPhoto[]>([]);
  const [groupSummaries, setGroupSummaries] = useState<CurationGroupSummary[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<ProjectAnalysisSummary | undefined>();
  const [peopleSummary, setPeopleSummary] = useState<ProjectPeopleSummary | undefined>();
  const [people, setPeople] = useState<ProjectPerson[]>([]);
  const [selectionSummary, setSelectionSummary] = useState<ProjectSelectionSummary | undefined>();
  const [finalSelectionPhotos, setFinalSelectionPhotos] = useState<ProjectPhoto[]>([]);
  const [selectionBucketPhotos, setSelectionBucketPhotos] = useState<ProjectPhoto[]>([]);
  const [selectionBucket, setSelectionBucket] = useState<SelectionBucket>("all");
  const [finalCountTarget, setFinalCountTarget] = useState(300);
  const [reviewCountTarget, setReviewCountTarget] = useState(1000);
  const [isLoadingSelectionBucket, setIsLoadingSelectionBucket] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isLoadingMorePhotos, setIsLoadingMorePhotos] = useState(false);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | undefined>();
  const [systemError, setSystemError] = useState<string | undefined>();
  const [isRefreshingSystemStatus, setIsRefreshingSystemStatus] = useState(false);
  const isBootstrapping = useAppStore((state) => state.isBootstrapping);
  const currentView = useAppStore((state) => state.currentView);
  const setupSteps = useAppStore((state) => state.setupSteps);
  const bootError = useAppStore((state) => state.bootError);
  const initialize = useAppStore((state) => state.initialize);
  const startBootstrapState = useAppStore((state) => state.startBootstrap);
  const failBootstrap = useAppStore((state) => state.failBootstrap);
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const projects = useProjectStore((state) => state.projects);
  const currentProject = useProjectStore((state) => state.currentProject);
  const setProjects = useProjectStore((state) => state.setProjects);
  const addProject = useProjectStore((state) => state.addProject);
  const openProject = useProjectStore((state) => state.openProject);

  const activeTask = useScanStore((state) => state.activeTask);
  const activeAnalysisTask = useScanStore((state) => state.activeAnalysisTask);
  const activePeopleTask = useScanStore((state) => state.activePeopleTask);
  const activeSelectionTask = useScanStore((state) => state.activeSelectionTask);
  const activity = useScanStore((state) => state.activity);
  const setActiveTask = useScanStore((state) => state.setActiveTask);
  const setActiveAnalysisTask = useScanStore((state) => state.setActiveAnalysisTask);
  const setActivePeopleTask = useScanStore((state) => state.setActivePeopleTask);
  const setActiveSelectionTask = useScanStore((state) => state.setActiveSelectionTask);
  const addActivity = useScanStore((state) => state.addActivity);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      startBootstrapState();
      try {
        setStatusText("Bootstrapping application services...");
        const [boot, knownProjects] = await Promise.all([bootstrapApplication(), listProjects()]);
        if (!mounted) {
          return;
        }
        initialize(boot);
        setProjects(knownProjects);
        setStatusText("Loading project registry...");
        const status = await getSystemStatus();
        if (!mounted) {
          return;
        }
        setSystemStatus(status);
        setSystemError(undefined);
      } catch (error) {
        if (!mounted) {
          return;
        }
        failBootstrap(error instanceof Error ? error.message : "Bootstrap failed.");
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [failBootstrap, initialize, setProjects, startBootstrapState]);

  useEffect(() => {
    if (!currentProject) {
      setProjectPhotos([]);
      setAlbumCandidates([]);
      setReviewQueue([]);
      setGroupSummaries([]);
      setAnalysisSummary(undefined);
      setPeopleSummary(undefined);
      setPeople([]);
      setSelectionSummary(undefined);
      setFinalSelectionPhotos([]);
      setSelectionBucketPhotos([]);
      setSelectionBucket("all");
      setFinalCountTarget(300);
      setReviewCountTarget(1000);
      setIsLoadingSelectionBucket(false);
      setIsLoadingMorePhotos(false);
      setHasMorePhotos(false);
      setPhotoError(undefined);
      return;
    }

    let cancelled = false;
    setIsLoadingPhotos(true);
    setIsLoadingMorePhotos(false);
    setSelectionBucket("all");
    setSelectionBucketPhotos([]);
    setPhotoError(undefined);

    void Promise.all([
      listProjectPhotos(currentProject.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
      listAlbumCandidatePhotos(currentProject.projectId),
      listReviewQueuePhotos(currentProject.projectId),
      listProjectGroupSummaries(currentProject.projectId),
      getProjectAnalysisSummary(currentProject.projectId),
      getProjectPeopleSummary(currentProject.projectId),
      listProjectPeople(currentProject.projectId),
      getProjectSelectionSummary(currentProject.projectId),
      listFinalSelectionPhotos(currentProject.projectId, "final", 12),
    ])
      .then(([photos, shortlist, reviewItems, groups, summary, peopleSummary, projectPeople, selection, finalSelection]) => {
        if (cancelled) {
          return;
        }
        setProjectPhotos(photos);
        setAlbumCandidates(shortlist);
        setReviewQueue(reviewItems);
        setGroupSummaries(groups);
        setAnalysisSummary(summary);
        setPeopleSummary(peopleSummary);
        setPeople(projectPeople);
        setSelectionSummary(selection);
        setFinalSelectionPhotos(finalSelection);
        setFinalCountTarget(selection.finalCountTarget || 300);
        setReviewCountTarget(selection.reviewCountTarget || 1000);
        setHasMorePhotos(photos.length === PHOTO_PAGE_SIZE);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setPhotoError(error instanceof Error ? error.message : "Failed to load project photos.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPhotos(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProject]);

  useEffect(() => {
    if (!activeTask || isTerminal(activeTask)) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const nextTask = await getScanTask(activeTask.id);
        if (!nextTask || cancelled) {
          return;
        }

        setActiveTask(nextTask);

        if (isTerminal(nextTask)) {
          const refreshedProjects = await listProjects();
          if (cancelled) {
            return;
          }
          setProjects(refreshedProjects);
          openProject(nextTask.projectId);
          const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary, refreshedPeopleSummary, refreshedPeople] = await Promise.all([
            listProjectPhotos(nextTask.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
            listAlbumCandidatePhotos(nextTask.projectId),
            listReviewQueuePhotos(nextTask.projectId),
            listProjectGroupSummaries(nextTask.projectId),
            getProjectAnalysisSummary(nextTask.projectId),
            getProjectPeopleSummary(nextTask.projectId),
            listProjectPeople(nextTask.projectId),
          ]);
          if (cancelled) {
            return;
          }
          setProjectPhotos(refreshedPhotos);
          setAlbumCandidates(refreshedAlbumCandidates);
          setReviewQueue(refreshedReviewQueue);
          setGroupSummaries(refreshedGroupSummaries);
          setAnalysisSummary(refreshedSummary);
          setPeopleSummary(refreshedPeopleSummary);
          setPeople(refreshedPeople);
          setHasMorePhotos(refreshedPhotos.length === PHOTO_PAGE_SIZE);
          addActivity({
            id: crypto.randomUUID(),
            eventType: nextTask.status === "cancelled" ? "scan_cancelled" : nextTask.status === "error" ? "scan_failed" : "scan_completed",
            severity: nextTask.status === "error" ? "error" : nextTask.failedCount > 0 ? "warning" : "info",
            message: nextTask.message,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setActiveTask({
          id: activeTask.id,
          projectId: activeTask.projectId,
          status: "error",
          progressCurrent: activeTask.progressCurrent,
          progressTotal: activeTask.progressTotal,
          message: error instanceof Error ? error.message : "Failed to poll scan task.",
          indexedCount: activeTask.indexedCount,
          failedCount: activeTask.failedCount,
          thumbnailGeneratedCount: activeTask.thumbnailGeneratedCount,
          thumbnailFailedCount: activeTask.thumbnailFailedCount,
        });
      }
    }, 900);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeTask, addActivity, openProject, setActiveTask, setProjects]);

  useEffect(() => {
    if (!activeAnalysisTask || isTerminal(activeAnalysisTask)) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const nextTask = await getQualityAnalysisTask(activeAnalysisTask.id);
        if (!nextTask || cancelled) {
          return;
        }

        setActiveAnalysisTask(nextTask);

        if (isTerminal(nextTask)) {
          const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary, refreshedPeopleSummary, refreshedPeople] = await Promise.all([
            listProjectPhotos(nextTask.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
            listAlbumCandidatePhotos(nextTask.projectId),
            listReviewQueuePhotos(nextTask.projectId),
            listProjectGroupSummaries(nextTask.projectId),
            getProjectAnalysisSummary(nextTask.projectId),
            getProjectPeopleSummary(nextTask.projectId),
            listProjectPeople(nextTask.projectId),
          ]);
          if (cancelled) {
            return;
          }
          setProjectPhotos(refreshedPhotos);
          setAlbumCandidates(refreshedAlbumCandidates);
          setReviewQueue(refreshedReviewQueue);
          setGroupSummaries(refreshedGroupSummaries);
          setAnalysisSummary(refreshedSummary);
          setPeopleSummary(refreshedPeopleSummary);
          setPeople(refreshedPeople);
          setHasMorePhotos(refreshedPhotos.length === PHOTO_PAGE_SIZE);
          addActivity({
            id: crypto.randomUUID(),
            eventType: nextTask.status === "error" ? "quality_analysis_failed" : "quality_analysis_completed",
            severity: nextTask.status === "error" ? "error" : nextTask.failedCount > 0 ? "warning" : "info",
            message: nextTask.message,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setActiveAnalysisTask({
          id: activeAnalysisTask.id,
          projectId: activeAnalysisTask.projectId,
          status: "error",
          progressCurrent: activeAnalysisTask.progressCurrent,
          progressTotal: activeAnalysisTask.progressTotal,
          message: error instanceof Error ? error.message : "Failed to poll quality analysis task.",
          analyzedCount: activeAnalysisTask.analyzedCount,
          failedCount: activeAnalysisTask.failedCount,
          averageScore: activeAnalysisTask.averageScore,
          duplicateGroupCount: activeAnalysisTask.duplicateGroupCount,
          burstGroupCount: activeAnalysisTask.burstGroupCount,
          keepCount: activeAnalysisTask.keepCount,
          reviewCount: activeAnalysisTask.reviewCount,
          rejectCount: activeAnalysisTask.rejectCount,
          highConfidenceCount: activeAnalysisTask.highConfidenceCount,
          albumCandidateCount: activeAnalysisTask.albumCandidateCount,
        });
      }
    }, 900);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeAnalysisTask, addActivity, setActiveAnalysisTask]);

  async function refreshSystemStatus() {
    setIsRefreshingSystemStatus(true);
    try {
      const nextStatus = await getSystemStatus();
      setSystemStatus(nextStatus);
      setSystemError(undefined);
    } catch (error) {
      setSystemError(error instanceof Error ? error.message : "Failed to refresh system status.");
    } finally {
      setIsRefreshingSystemStatus(false);
    }
  }

  useEffect(() => {
    if (!activePeopleTask || isTerminal(activePeopleTask)) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const nextTask = await getPeopleAnalysisTask(activePeopleTask.id);
        if (!nextTask || cancelled) {
          return;
        }
        setActivePeopleTask(nextTask);
        if (isTerminal(nextTask)) {
          const [peopleSummary, projectPeople] = await Promise.all([
            getProjectPeopleSummary(nextTask.projectId),
            listProjectPeople(nextTask.projectId),
          ]);
          if (!cancelled) {
            setPeopleSummary(peopleSummary);
            setPeople(projectPeople);
            addActivity({
              id: crypto.randomUUID(),
              eventType: nextTask.status === "error" ? "people_analysis_failed" : "people_analysis_prepared",
              severity: nextTask.status === "error" ? "error" : "info",
              message: nextTask.message,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setActivePeopleTask({
            id: activePeopleTask.id,
            projectId: activePeopleTask.projectId,
            status: "error",
            progressCurrent: activePeopleTask.progressCurrent,
            progressTotal: activePeopleTask.progressTotal,
            message: error instanceof Error ? error.message : "People preparation failed.",
            processedPhotoCount: activePeopleTask.processedPhotoCount,
            failedCount: activePeopleTask.failedCount,
            detectedFaceCount: activePeopleTask.detectedFaceCount,
            clusteredPeopleCount: activePeopleTask.clusteredPeopleCount,
            modelStatus: activePeopleTask.modelStatus,
          });
        }
      }
    }, 600);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activePeopleTask, addActivity, setActivePeopleTask]);


  useEffect(() => {
    if (!activeSelectionTask || isTerminal(activeSelectionTask)) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const nextTask = await getSmartSelectionTask(activeSelectionTask.id);
        if (!nextTask || cancelled) {
          return;
        }
        setActiveSelectionTask(nextTask);
        if (isTerminal(nextTask)) {
          const [selection, finalSelection] = await Promise.all([
            getProjectSelectionSummary(nextTask.projectId),
            listFinalSelectionPhotos(nextTask.projectId, "final", 12),
          ]);
          if (!cancelled) {
            setSelectionSummary(selection);
            setFinalSelectionPhotos(finalSelection);
            setFinalCountTarget(selection.finalCountTarget || finalCountTarget);
            setReviewCountTarget(selection.reviewCountTarget || reviewCountTarget);
            if (selectionBucket !== "all") {
              const bucketPhotos = await listFinalSelectionPhotos(nextTask.projectId, selectionBucket, 300);
              if (!cancelled) {
                setSelectionBucketPhotos(bucketPhotos);
              }
            }
            addActivity({
              id: crypto.randomUUID(),
              eventType: nextTask.status === "error" ? "smart_selection_failed" : "smart_selection_completed",
              severity: nextTask.status === "error" ? "error" : "info",
              message: nextTask.message,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setActiveSelectionTask({
            id: activeSelectionTask.id,
            projectId: activeSelectionTask.projectId,
            status: "error",
            progressCurrent: activeSelectionTask.progressCurrent,
            progressTotal: activeSelectionTask.progressTotal,
            message: error instanceof Error ? error.message : "Smart selection failed.",
            finalCountTarget: activeSelectionTask.finalCountTarget,
            reviewCountTarget: activeSelectionTask.reviewCountTarget,
            selectedCount: activeSelectionTask.selectedCount,
            reviewCount: activeSelectionTask.reviewCount,
            rejectedCount: activeSelectionTask.rejectedCount,
            protectedCount: activeSelectionTask.protectedCount,
          });
        }
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeSelectionTask, addActivity, setActiveSelectionTask]);

  async function handleCreateProject(input: CreateProjectInput) {
    const project = await createProject(input);
    addProject(project);
    addActivity({
      id: crypto.randomUUID(),
      eventType: "project_created",
      severity: "info",
      message: `Created project ${project.name}.`,
      createdAt: new Date().toISOString(),
    });
    setCurrentView("workspace");
  }

  function handleOpenProject(projectId: string) {
    openProject(projectId);
    setCurrentView("workspace");
  }

  async function handleStartScan() {
    if (!currentProject) {
      return;
    }

    try {
      const task = await startScan(currentProject.projectId);
      setActiveTask(task);
      addActivity({
        id: crypto.randomUUID(),
        eventType: "scan_started",
        severity: "info",
        message: `Started recursive indexing for ${currentProject.name}.`,
        createdAt: new Date().toISOString(),
      });

      if (isTerminal(task)) {
        const refreshedProjects = await listProjects();
        setProjects(refreshedProjects);
        openProject(currentProject.projectId);
        const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary, refreshedPeopleSummary, refreshedPeople] = await Promise.all([
          listProjectPhotos(currentProject.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
          listAlbumCandidatePhotos(currentProject.projectId),
          listReviewQueuePhotos(currentProject.projectId),
          listProjectGroupSummaries(currentProject.projectId),
          getProjectAnalysisSummary(currentProject.projectId),
          getProjectPeopleSummary(currentProject.projectId),
          listProjectPeople(currentProject.projectId),
        ]);
        setProjectPhotos(refreshedPhotos);
        setAlbumCandidates(refreshedAlbumCandidates);
        setReviewQueue(refreshedReviewQueue);
        setGroupSummaries(refreshedGroupSummaries);
        setAnalysisSummary(refreshedSummary);
        setPeopleSummary(refreshedPeopleSummary);
        setPeople(refreshedPeople);
        setHasMorePhotos(refreshedPhotos.length === PHOTO_PAGE_SIZE);
        addActivity({
          id: crypto.randomUUID(),
          eventType: task.status === "cancelled" ? "scan_cancelled" : task.status === "error" ? "scan_failed" : "scan_completed",
          severity: task.status === "error" ? "error" : task.failedCount > 0 ? "warning" : "info",
          message: task.message,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      setActiveTask({
        id: crypto.randomUUID(),
        projectId: currentProject.projectId,
        status: "error",
        progressCurrent: 0,
        progressTotal: 0,
        message: error instanceof Error ? error.message : "Scan failed.",
        indexedCount: 0,
        failedCount: 0,
        thumbnailGeneratedCount: 0,
        thumbnailFailedCount: 0,
      });
      addActivity({
        id: crypto.randomUUID(),
        eventType: "scan_failed",
        severity: "error",
        message: error instanceof Error ? error.message : "Scan failed.",
        createdAt: new Date().toISOString(),
      });
    }
  }

  async function handleStartAnalysis() {
    if (!currentProject) {
      return;
    }

    try {
      const task = await startQualityAnalysis(currentProject.projectId);
      setActiveAnalysisTask(task);
      addActivity({
        id: crypto.randomUUID(),
        eventType: "quality_analysis_started",
        severity: "info",
        message: `Started technical quality analysis for ${currentProject.name}.`,
        createdAt: new Date().toISOString(),
      });

      if (isTerminal(task)) {
        const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary, refreshedPeopleSummary, refreshedPeople] = await Promise.all([
          listProjectPhotos(currentProject.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
          listAlbumCandidatePhotos(currentProject.projectId),
          listReviewQueuePhotos(currentProject.projectId),
          listProjectGroupSummaries(currentProject.projectId),
          getProjectAnalysisSummary(currentProject.projectId),
          getProjectPeopleSummary(currentProject.projectId),
          listProjectPeople(currentProject.projectId),
        ]);
        setProjectPhotos(refreshedPhotos);
        setAlbumCandidates(refreshedAlbumCandidates);
        setReviewQueue(refreshedReviewQueue);
        setGroupSummaries(refreshedGroupSummaries);
        setAnalysisSummary(refreshedSummary);
        setPeopleSummary(refreshedPeopleSummary);
        setPeople(refreshedPeople);
        setHasMorePhotos(refreshedPhotos.length === PHOTO_PAGE_SIZE);
        addActivity({
          id: crypto.randomUUID(),
          eventType: task.status === "error" ? "quality_analysis_failed" : "quality_analysis_completed",
          severity: task.status === "error" ? "error" : task.failedCount > 0 ? "warning" : "info",
          message: task.message,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      setActiveAnalysisTask({
        id: crypto.randomUUID(),
        projectId: currentProject.projectId,
        status: "error",
        progressCurrent: 0,
        progressTotal: 0,
        message: error instanceof Error ? error.message : "Technical quality analysis failed.",
        analyzedCount: 0,
        failedCount: 0,
        averageScore: 0,
        duplicateGroupCount: 0,
        burstGroupCount: 0,
        keepCount: 0,
        reviewCount: 0,
        rejectCount: 0,
        highConfidenceCount: 0,
        albumCandidateCount: 0,
      });
      addActivity({
        id: crypto.randomUUID(),
        eventType: "quality_analysis_failed",
        severity: "error",
        message: error instanceof Error ? error.message : "Technical quality analysis failed.",
        createdAt: new Date().toISOString(),
      });
    }
  }

  async function handleLoadMorePhotos() {
    if (!currentProject || isLoadingPhotos || isLoadingMorePhotos || !hasMorePhotos) {
      return;
    }

    setIsLoadingMorePhotos(true);
    try {
      const nextPhotos = await listProjectPhotos(currentProject.projectId, {
        offset: projectPhotos.length,
        limit: PHOTO_PAGE_SIZE,
      });

      setProjectPhotos((existing) => {
        const known = new Set(existing.map((photo) => photo.id));
        const merged = [...existing];
        for (const photo of nextPhotos) {
          if (!known.has(photo.id)) {
            merged.push(photo);
          }
        }
        return merged;
      });
      setHasMorePhotos(nextPhotos.length === PHOTO_PAGE_SIZE);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Failed to load more project photos.");
    } finally {
      setIsLoadingMorePhotos(false);
    }
  }

  async function handleStartPeopleAnalysis() {
    if (!currentProject) {
      return;
    }

    try {
      const task = await startPeopleAnalysis(currentProject.projectId);
      setActivePeopleTask(task);
      addActivity({
        id: crypto.randomUUID(),
        eventType: "people_analysis_started",
        severity: "info",
        message: `Preparing people workspace for ${currentProject.name}.`,
        createdAt: new Date().toISOString(),
      });

      if (isTerminal(task)) {
        const [peopleSummary, projectPeople] = await Promise.all([
          getProjectPeopleSummary(currentProject.projectId),
          listProjectPeople(currentProject.projectId),
        ]);
        setPeopleSummary(peopleSummary);
        setPeople(projectPeople);
      }
    } catch (error) {
      const task: PeopleAnalysisTask = {
        id: crypto.randomUUID(),
        projectId: currentProject.projectId,
        status: "error",
        progressCurrent: 0,
        progressTotal: 0,
        message: error instanceof Error ? error.message : "People preparation failed.",
        processedPhotoCount: 0,
        failedCount: 0,
        detectedFaceCount: 0,
        clusteredPeopleCount: 0,
        modelStatus: "error",
      };
      setActivePeopleTask(task);
    }
  }


  async function handleUpdatePerson(personId: string, input: { displayName?: string; priorityLabel?: string; isHidden?: boolean }) {
    if (!currentProject) {
      return;
    }
    const nextPeople = await updateProjectPerson(currentProject.projectId, personId, input);
    const nextSummary = await getProjectPeopleSummary(currentProject.projectId);
    setPeople(nextPeople);
    setPeopleSummary(nextSummary);
  }

  async function handleMergePeople(primaryPersonId: string, secondaryPersonId: string) {
    if (!currentProject || !secondaryPersonId || primaryPersonId === secondaryPersonId) {
      return;
    }
    const nextPeople = await mergeProjectPeople(currentProject.projectId, primaryPersonId, secondaryPersonId);
    const nextSummary = await getProjectPeopleSummary(currentProject.projectId);
    setPeople(nextPeople);
    setPeopleSummary(nextSummary);
  }

  async function handleSplitPersonFace(faceDetectionId: string) {
    if (!currentProject) {
      return;
    }
    const nextPeople = await splitProjectPersonFace(currentProject.projectId, faceDetectionId, "New person");
    const nextSummary = await getProjectPeopleSummary(currentProject.projectId);
    setPeople(nextPeople);
    setPeopleSummary(nextSummary);
  }



  function applyPhotoOverride(photoId: string, overrideLabel: PhotoOverrideAction) {
    const normalized = overrideLabel === "clear" ? undefined : overrideLabel;
    const updatePhoto = (photo: ProjectPhoto): ProjectPhoto => photo.id === photoId ? { ...photo, overrideLabel: normalized } : photo;
    setProjectPhotos((photos) => photos.map(updatePhoto));
    setAlbumCandidates((photos) => photos.map(updatePhoto));
    setReviewQueue((photos) => photos.map(updatePhoto));
    setFinalSelectionPhotos((photos) => photos.map(updatePhoto));
    setSelectionBucketPhotos((photos) => photos.map(updatePhoto));
  }

  async function refreshSelectionViews(projectId: string, bucket: SelectionBucket = selectionBucket) {
    const [selection, finalSelection] = await Promise.all([
      getProjectSelectionSummary(projectId),
      listFinalSelectionPhotos(projectId, "final", 12),
    ]);
    setSelectionSummary(selection);
    setFinalSelectionPhotos(finalSelection);
    setFinalCountTarget(selection.finalCountTarget || finalCountTarget);
    setReviewCountTarget(selection.reviewCountTarget || reviewCountTarget);

    if (bucket !== "all") {
      const bucketPhotos = await listFinalSelectionPhotos(projectId, bucket, 300);
      setSelectionBucketPhotos(bucketPhotos);
    }
  }

  async function handleSelectionBucketChange(bucket: SelectionBucket) {
    setSelectionBucket(bucket);
    if (!currentProject) {
      return;
    }
    if (bucket === "all") {
      setSelectionBucketPhotos([]);
      return;
    }
    setIsLoadingSelectionBucket(true);
    try {
      const photos = await listFinalSelectionPhotos(currentProject.projectId, bucket, 300);
      setSelectionBucketPhotos(photos);
      setPhotoError(undefined);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Failed to load selection bucket.");
    } finally {
      setIsLoadingSelectionBucket(false);
    }
  }

  function handleFinalCountTargetChange(value: number) {
    setFinalCountTarget(Number.isFinite(value) ? Math.max(1, Math.min(10000, Math.round(value))) : 300);
  }

  function handleReviewCountTargetChange(value: number) {
    setReviewCountTarget(Number.isFinite(value) ? Math.max(0, Math.min(20000, Math.round(value))) : 1000);
  }

  async function handleSetPhotoOverride(photoId: string, overrideLabel: PhotoOverrideAction) {
    if (!currentProject) {
      return;
    }

    applyPhotoOverride(photoId, overrideLabel);
    try {
      const selection = await setPhotoSelectionOverride(currentProject.projectId, photoId, overrideLabel);
      setSelectionSummary(selection);
      addActivity({
        id: crypto.randomUUID(),
        eventType: "selection_override_saved",
        severity: "info",
        message: overrideLabel === "clear" ? "Selection override cleared. Refilter to refresh the album." : "Selection override saved. Refilter to refresh the album.",
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Failed to save selection override.");
    }
  }

  async function handleStartSmartSelection() {
    if (!currentProject) {
      return;
    }

    try {
      const task = await startSmartSelection(currentProject.projectId, { finalCountTarget, reviewCountTarget });
      setActiveSelectionTask(task);
      addActivity({
        id: crypto.randomUUID(),
        eventType: "smart_selection_started",
        severity: "info",
        message: `Building final memory selection for ${currentProject.name}.`,
        createdAt: new Date().toISOString(),
      });

      if (isTerminal(task)) {
        await refreshSelectionViews(currentProject.projectId);
      }
    } catch (error) {
      const task: SmartSelectionTask = {
        id: crypto.randomUUID(),
        projectId: currentProject.projectId,
        status: "error",
        progressCurrent: 0,
        progressTotal: 0,
        message: error instanceof Error ? error.message : "Smart selection failed.",
        finalCountTarget,
        reviewCountTarget,
        selectedCount: 0,
        reviewCount: 0,
        rejectedCount: 0,
        protectedCount: 0,
      };
      setActiveSelectionTask(task);
    }
  }

  async function handlePauseScan() {
    if (!currentProject || !activeTask) {
      return;
    }
    const task = await pauseScan(activeTask.id, currentProject.projectId);
    setActiveTask(task);
    addActivity({
      id: crypto.randomUUID(),
      eventType: "scan_paused",
      severity: "info",
      message: task.message,
      createdAt: new Date().toISOString(),
    });
  }

  async function handleResumeScan() {
    if (!currentProject || !activeTask) {
      return;
    }
    const task = await resumeScan(activeTask.id, currentProject.projectId);
    setActiveTask(task);
    addActivity({
      id: crypto.randomUUID(),
      eventType: "scan_resumed",
      severity: "info",
      message: task.message,
      createdAt: new Date().toISOString(),
    });
  }

  async function handleCancelScan() {
    if (!currentProject || !activeTask) {
      return;
    }
    const task = await cancelScan(activeTask.id, currentProject.projectId);
    setActiveTask(task);
    addActivity({
      id: crypto.randomUUID(),
      eventType: "scan_cancellation_requested",
      severity: "warning",
      message: task.message,
      createdAt: new Date().toISOString(),
    });
  }

  if (isBootstrapping) {
    return <StartupSplash steps={setupSteps.length ? setupSteps : [{ id: "boot", label: "Bootstrap", status: "running", detail: statusText }]} error={bootError} />;
  }

  const navItems: Array<{ id: typeof currentView; label: string; icon: ComponentType<{ className?: string }> }> = [
    { id: "dashboard", label: "Home", icon: FolderOpen },
    { id: "workspace", label: "All Photos", icon: Images },
    { id: "people", label: "People", icon: UsersRound },
    { id: "places", label: "Places", icon: Map },
    { id: "timeline", label: "Timeline", icon: CalendarDays },
    { id: "compare", label: "Compare", icon: GitCompare },
    { id: "import", label: "Import", icon: Upload },
    { id: "export", label: "Export", icon: Download },
    { id: "operations", label: "System", icon: Aperture },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const sidebar = (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="mb-4 flex justify-center">
        <LumozaLogo compact />
      </div>
      <nav className="grid gap-1.5">
        {navItems.slice(0, 8).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => setCurrentView(item.id)}
              className={`lumoza-focus flex h-10 w-10 items-center justify-center rounded-[13px] transition duration-200 ease-lz ${isActive ? "bg-purple/18 text-purple shadow-glow" : "text-subtle hover:bg-white/[0.055] hover:text-text"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </nav>
      <nav className="mt-auto grid gap-1.5">
        {navItems.slice(8).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button key={item.id} type="button" title={item.label} onClick={() => setCurrentView(item.id)} className={`lumoza-focus flex h-10 w-10 items-center justify-center rounded-[13px] transition ${isActive ? "bg-purple/18 text-purple" : "text-subtle hover:bg-white/[0.055] hover:text-text"}`}>
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </nav>
    </div>
  );

  const topbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-subtle">{navItems.find((item) => item.id === currentView)?.label ?? "Lumoza"}</p>
        <h2 className="mt-1 truncate text-xl font-semibold tracking-[-0.04em] text-text lg:text-2xl">
          {currentProject ? currentProject.name : "Your stories, quietly organized"}
        </h2>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        <div className="hidden min-w-[220px] max-w-sm flex-1 items-center gap-3 rounded-full bg-ink/32 px-4 py-2 text-sm text-subtle lg:flex">
          <Search className="h-4 w-4" />
          <span>Search photos...</span>
        </div>
        <LumozaButton type="button" variant="ghost" className="hidden px-3 lg:inline-flex" onClick={() => setCurrentView("settings")}>
          <Settings className="h-4 w-4" />
        </LumozaButton>
        <LumozaButton type="button" variant="primary" className="hidden xl:inline-flex" onClick={() => setCurrentView("dashboard")}>
          <Sparkles className="h-4 w-4" />
          New project
        </LumozaButton>
      </div>
    </div>
  );

  const workspacePhotos = selectionBucket === "all" ? projectPhotos : selectionBucketPhotos;
  const workspaceHasMorePhotos = selectionBucket === "all" ? hasMorePhotos : false;
  const workspaceIsLoadingPhotos = selectionBucket === "all" ? isLoadingPhotos : isLoadingSelectionBucket;
  const workspaceIsLoadingMorePhotos = selectionBucket === "all" ? isLoadingMorePhotos : false;

  let content = <ProjectDashboard projects={projects} onOpenProject={handleOpenProject} onCreateProject={handleCreateProject} />;

  if (currentView === "workspace" && currentProject) {
    content = (
      <ProjectWorkspace
        project={currentProject}
        photos={workspacePhotos}
        albumCandidates={albumCandidates}
        reviewQueue={reviewQueue}
        groupSummaries={groupSummaries}
        analysisSummary={analysisSummary}
        peopleSummary={peopleSummary}
        selectionSummary={selectionSummary}
        finalSelectionPhotos={finalSelectionPhotos}
        selectionBucket={selectionBucket}
        finalCountTarget={finalCountTarget}
        reviewCountTarget={reviewCountTarget}
        isLoadingPhotos={workspaceIsLoadingPhotos}
        isLoadingMorePhotos={workspaceIsLoadingMorePhotos}
        hasMorePhotos={workspaceHasMorePhotos}
        photoError={photoError}
        task={activeTask}
        analysisTask={activeAnalysisTask}
        selectionTask={activeSelectionTask}
        activity={activity}
        onLoadMorePhotos={selectionBucket === "all" ? handleLoadMorePhotos : () => undefined}
        onSelectionBucketChange={handleSelectionBucketChange}
        onFinalCountTargetChange={handleFinalCountTargetChange}
        onReviewCountTargetChange={handleReviewCountTargetChange}
        onSetPhotoOverride={handleSetPhotoOverride}
        onStartScan={handleStartScan}
        onStartAnalysis={handleStartAnalysis}
        onStartSmartSelection={handleStartSmartSelection}
        onPause={handlePauseScan}
        onResume={handleResumeScan}
        onCancel={handleCancelScan}
      />
    );
  } else if (currentView === "people") {
    content = <StudioPage mode="people" title="People" subtitle="Recognize familiar faces and protect important memories." project={currentProject} photos={projectPhotos} peopleSummary={peopleSummary} people={people} peopleTask={activePeopleTask} onStartPeopleAnalysis={handleStartPeopleAnalysis} onUpdatePerson={handleUpdatePerson} onMergePeople={handleMergePeople} onSplitPersonFace={handleSplitPersonFace} />;
  } else if (currentView === "places") {
    content = <StudioPage mode="places" title="Places" subtitle="Memories arranged by where they happened." project={currentProject} photos={projectPhotos} />;
  } else if (currentView === "timeline") {
    content = <StudioPage mode="timeline" title="Timeline" subtitle="A calm path through the story." project={currentProject} photos={projectPhotos} />;
  } else if (currentView === "compare") {
    content = <StudioPage mode="compare" title="Compare" subtitle="Choose the frame that feels right." project={currentProject} photos={projectPhotos} />;
  } else if (currentView === "import") {
    content = <StudioPage mode="import" title="Import Photos" subtitle="Bring memories into this local workspace." project={currentProject} photos={projectPhotos} />;
  } else if (currentView === "export") {
    content = <StudioPage mode="export" title="Export" subtitle="Prepare the final collection." project={currentProject} photos={projectPhotos} finalSelectionPhotos={finalSelectionPhotos} selectionSummary={selectionSummary} />;
  } else if (currentView === "operations") {
    content = (
      <OperationsPage
        currentProject={currentProject}
        analysisSummary={analysisSummary}
        peopleSummary={peopleSummary}
        activity={activity}
        task={activeTask}
        analysisTask={activeAnalysisTask}
        systemStatus={systemStatus}
        systemError={systemError}
        isRefreshingSystemStatus={isRefreshingSystemStatus}
        onRefreshSystemStatus={refreshSystemStatus}
      />
    );
  } else if (currentView === "settings") {
    content = <SettingsPage />;
  }

  return <AppShell sidebar={sidebar} topbar={topbar}>{content}</AppShell>;
}

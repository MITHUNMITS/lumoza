import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { StartupSplash } from "../components/splash/StartupSplash";
import { CreateProject } from "../pages/CreateProject";
import { ProjectDashboard } from "../pages/ProjectDashboard";
import { OperationsPage } from "../pages/OperationsPage";
import { ProjectWorkspace } from "../pages/ProjectWorkspace";
import { SettingsPage } from "../pages/SettingsPage";
import { getProjectAnalysisSummary, getQualityAnalysisTask, listProjectGroupSummaries, startQualityAnalysis } from "../services/analysisService";
import { listAlbumCandidatePhotos, listProjectPhotos, listReviewQueuePhotos } from "../services/photoService";
import { createProject, listProjects } from "../services/projectService";
import { cancelScan, getScanTask, pauseScan, resumeScan, startScan } from "../services/scanService";
import { bootstrapApplication, getSystemStatus } from "../services/systemStatusService";
import { useAppStore } from "../stores/appStore";
import { useProjectStore } from "../stores/projectStore";
import { useScanStore } from "../stores/scanStore";
import type { CreateProjectInput, CurationGroupSummary, ProjectAnalysisSummary, ProjectPhoto } from "../types/project";
import type { QualityAnalysisTask, ScanTask, SystemStatus } from "../types/system";

const PHOTO_PAGE_SIZE = 180;

function isTerminal(task?: ScanTask | QualityAnalysisTask) {
  return task ? task.status === "completed" || task.status === "cancelled" || task.status === "error" : false;
}

export function App() {
  const [statusText, setStatusText] = useState("Preparing desktop foundation...");
  const [projectPhotos, setProjectPhotos] = useState<ProjectPhoto[]>([]);
  const [albumCandidates, setAlbumCandidates] = useState<ProjectPhoto[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ProjectPhoto[]>([]);
  const [groupSummaries, setGroupSummaries] = useState<CurationGroupSummary[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<ProjectAnalysisSummary | undefined>();
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
  const activity = useScanStore((state) => state.activity);
  const setActiveTask = useScanStore((state) => state.setActiveTask);
  const setActiveAnalysisTask = useScanStore((state) => state.setActiveAnalysisTask);
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
      setIsLoadingMorePhotos(false);
      setHasMorePhotos(false);
      setPhotoError(undefined);
      return;
    }

    let cancelled = false;
    setIsLoadingPhotos(true);
    setIsLoadingMorePhotos(false);
    setPhotoError(undefined);

    void Promise.all([
      listProjectPhotos(currentProject.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
      listAlbumCandidatePhotos(currentProject.projectId),
      listReviewQueuePhotos(currentProject.projectId),
      listProjectGroupSummaries(currentProject.projectId),
      getProjectAnalysisSummary(currentProject.projectId),
    ])
      .then(([photos, shortlist, reviewItems, groups, summary]) => {
        if (cancelled) {
          return;
        }
        setProjectPhotos(photos);
        setAlbumCandidates(shortlist);
        setReviewQueue(reviewItems);
        setGroupSummaries(groups);
        setAnalysisSummary(summary);
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
          const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary] = await Promise.all([
            listProjectPhotos(nextTask.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
            listAlbumCandidatePhotos(nextTask.projectId),
            listReviewQueuePhotos(nextTask.projectId),
            listProjectGroupSummaries(nextTask.projectId),
            getProjectAnalysisSummary(nextTask.projectId),
          ]);
          if (cancelled) {
            return;
          }
          setProjectPhotos(refreshedPhotos);
          setAlbumCandidates(refreshedAlbumCandidates);
          setReviewQueue(refreshedReviewQueue);
          setGroupSummaries(refreshedGroupSummaries);
          setAnalysisSummary(refreshedSummary);
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
          const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary] = await Promise.all([
            listProjectPhotos(nextTask.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
            listAlbumCandidatePhotos(nextTask.projectId),
            listReviewQueuePhotos(nextTask.projectId),
            listProjectGroupSummaries(nextTask.projectId),
            getProjectAnalysisSummary(nextTask.projectId),
          ]);
          if (cancelled) {
            return;
          }
          setProjectPhotos(refreshedPhotos);
          setAlbumCandidates(refreshedAlbumCandidates);
          setReviewQueue(refreshedReviewQueue);
          setGroupSummaries(refreshedGroupSummaries);
          setAnalysisSummary(refreshedSummary);
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
        const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary] = await Promise.all([
          listProjectPhotos(currentProject.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
          listAlbumCandidatePhotos(currentProject.projectId),
          listReviewQueuePhotos(currentProject.projectId),
          listProjectGroupSummaries(currentProject.projectId),
          getProjectAnalysisSummary(currentProject.projectId),
        ]);
        setProjectPhotos(refreshedPhotos);
        setAlbumCandidates(refreshedAlbumCandidates);
        setReviewQueue(refreshedReviewQueue);
        setGroupSummaries(refreshedGroupSummaries);
        setAnalysisSummary(refreshedSummary);
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
        const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary] = await Promise.all([
          listProjectPhotos(currentProject.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
          listAlbumCandidatePhotos(currentProject.projectId),
          listReviewQueuePhotos(currentProject.projectId),
          listProjectGroupSummaries(currentProject.projectId),
          getProjectAnalysisSummary(currentProject.projectId),
        ]);
        setProjectPhotos(refreshedPhotos);
        setAlbumCandidates(refreshedAlbumCandidates);
        setReviewQueue(refreshedReviewQueue);
        setGroupSummaries(refreshedGroupSummaries);
        setAnalysisSummary(refreshedSummary);
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

  const sidebar = (
    <div className="flex h-full flex-col gap-6">
      <div>
        <p className="text-sm uppercase tracking-[0.36em] text-accent/80">Lumoza</p>
        <h1 className="mt-3 text-3xl font-semibold text-text">Studio</h1>
        <p className="mt-3 text-sm leading-7 text-muted">Offline-first AI curation now moves from scoring into first-pass ranking and selection guidance.</p>
      </div>
      <nav className="grid gap-2 text-sm text-muted">
        <button type="button" onClick={() => setCurrentView("dashboard")} className="rounded-2xl px-4 py-3 text-left hover:bg-white/5">Dashboard</button>
        <button type="button" onClick={() => setCurrentView("workspace")} className="rounded-2xl px-4 py-3 text-left hover:bg-white/5">Workspace</button>
        <button type="button" onClick={() => setCurrentView("operations")} className="rounded-2xl px-4 py-3 text-left hover:bg-white/5">Operations</button>
        <button type="button" onClick={() => setCurrentView("settings")} className="rounded-2xl px-4 py-3 text-left hover:bg-white/5">Settings</button>
      </nav>
      <div className="mt-auto rounded-[24px] border border-white/8 bg-card/80 p-4 text-sm text-muted">
        Full product progress: 52%
        Current phase progress: 100% (Phase 2 complete)

Phase 2 is complete: technical quality scoring, connected duplicate grouping, burst grouping audit, ranking confidence, album shortlist guidance, and review queue guidance are active. Face intelligence, final ranking, polish, and release hardening still remain.
      </div>
    </div>
  );

  const topbar = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-muted">Phase 2 complete</p>
        <h2 className="mt-2 text-3xl font-semibold text-text">Technical quality, grouping, and first-pass ranking</h2>
      </div>
      <CreateProject onCreate={handleCreateProject} />
    </div>
  );

  let content = <ProjectDashboard projects={projects} onOpenProject={handleOpenProject} />;

  if (currentView === "workspace" && currentProject) {
    content = (
      <ProjectWorkspace
        project={currentProject}
        photos={projectPhotos}
        albumCandidates={albumCandidates}
        reviewQueue={reviewQueue}
        groupSummaries={groupSummaries}
        analysisSummary={analysisSummary}
        isLoadingPhotos={isLoadingPhotos}
        isLoadingMorePhotos={isLoadingMorePhotos}
        hasMorePhotos={hasMorePhotos}
        photoError={photoError}
        task={activeTask}
        analysisTask={activeAnalysisTask}
        activity={activity}
        onLoadMorePhotos={handleLoadMorePhotos}
        onStartScan={handleStartScan}
        onStartAnalysis={handleStartAnalysis}
        onPause={handlePauseScan}
        onResume={handleResumeScan}
        onCancel={handleCancelScan}
      />
    );
  } else if (currentView === "operations") {
    content = (
      <OperationsPage
        currentProject={currentProject}
        analysisSummary={analysisSummary}
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

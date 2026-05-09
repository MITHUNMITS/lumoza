import { useEffect, useState, type ComponentType } from "react";
import { Activity, Aperture, Cpu, FolderOpen, Images, Search, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { LumozaButton } from "../components/ui/LumozaButton";
import { ProgressBlock } from "../components/ui/ProgressBlock";
import { StatusPill } from "../components/ui/StatusPill";
import { StartupSplash } from "../components/splash/StartupSplash";
import { ProjectDashboard } from "../pages/ProjectDashboard";
import { OperationsPage } from "../pages/OperationsPage";
import { ProjectWorkspace } from "../pages/ProjectWorkspace";
import { SettingsPage } from "../pages/SettingsPage";
import { getProjectAnalysisSummary, getProjectPeopleSummary, getQualityAnalysisTask, listProjectGroupSummaries, startQualityAnalysis } from "../services/analysisService";
import { listAlbumCandidatePhotos, listProjectPhotos, listReviewQueuePhotos } from "../services/photoService";
import { createProject, listProjects } from "../services/projectService";
import { cancelScan, getScanTask, pauseScan, resumeScan, startScan } from "../services/scanService";
import { bootstrapApplication, getSystemStatus } from "../services/systemStatusService";
import { useAppStore } from "../stores/appStore";
import { useProjectStore } from "../stores/projectStore";
import { useScanStore } from "../stores/scanStore";
import type { CreateProjectInput, CurationGroupSummary, ProjectAnalysisSummary, ProjectPeopleSummary, ProjectPhoto } from "../types/project";
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
  const [peopleSummary, setPeopleSummary] = useState<ProjectPeopleSummary | undefined>();
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
      setPeopleSummary(undefined);
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
      getProjectPeopleSummary(currentProject.projectId),
    ])
      .then(([photos, shortlist, reviewItems, groups, summary, people]) => {
        if (cancelled) {
          return;
        }
        setProjectPhotos(photos);
        setAlbumCandidates(shortlist);
        setReviewQueue(reviewItems);
        setGroupSummaries(groups);
        setAnalysisSummary(summary);
        setPeopleSummary(people);
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
          const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary, refreshedPeopleSummary] = await Promise.all([
            listProjectPhotos(nextTask.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
            listAlbumCandidatePhotos(nextTask.projectId),
            listReviewQueuePhotos(nextTask.projectId),
            listProjectGroupSummaries(nextTask.projectId),
            getProjectAnalysisSummary(nextTask.projectId),
            getProjectPeopleSummary(nextTask.projectId),
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
          const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary, refreshedPeopleSummary] = await Promise.all([
            listProjectPhotos(nextTask.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
            listAlbumCandidatePhotos(nextTask.projectId),
            listReviewQueuePhotos(nextTask.projectId),
            listProjectGroupSummaries(nextTask.projectId),
            getProjectAnalysisSummary(nextTask.projectId),
            getProjectPeopleSummary(nextTask.projectId),
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
        const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary, refreshedPeopleSummary] = await Promise.all([
          listProjectPhotos(currentProject.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
          listAlbumCandidatePhotos(currentProject.projectId),
          listReviewQueuePhotos(currentProject.projectId),
          listProjectGroupSummaries(currentProject.projectId),
          getProjectAnalysisSummary(currentProject.projectId),
          getProjectPeopleSummary(currentProject.projectId),
        ]);
        setProjectPhotos(refreshedPhotos);
        setAlbumCandidates(refreshedAlbumCandidates);
        setReviewQueue(refreshedReviewQueue);
        setGroupSummaries(refreshedGroupSummaries);
        setAnalysisSummary(refreshedSummary);
        setPeopleSummary(refreshedPeopleSummary);
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
        const [refreshedPhotos, refreshedAlbumCandidates, refreshedReviewQueue, refreshedGroupSummaries, refreshedSummary, refreshedPeopleSummary] = await Promise.all([
          listProjectPhotos(currentProject.projectId, { offset: 0, limit: PHOTO_PAGE_SIZE }),
          listAlbumCandidatePhotos(currentProject.projectId),
          listReviewQueuePhotos(currentProject.projectId),
          listProjectGroupSummaries(currentProject.projectId),
          getProjectAnalysisSummary(currentProject.projectId),
          getProjectPeopleSummary(currentProject.projectId),
        ]);
        setProjectPhotos(refreshedPhotos);
        setAlbumCandidates(refreshedAlbumCandidates);
        setReviewQueue(refreshedReviewQueue);
        setGroupSummaries(refreshedGroupSummaries);
        setAnalysisSummary(refreshedSummary);
        setPeopleSummary(refreshedPeopleSummary);
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

  const navItems: Array<{ id: typeof currentView; label: string; icon: ComponentType<{ className?: string }> }> = [
    { id: "dashboard", label: "Projects", icon: FolderOpen },
    { id: "workspace", label: "Workspace", icon: Images },
    { id: "operations", label: "Operations", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const sidebar = (
    <div className="flex h-full flex-col gap-5 p-4 xl:p-5">
      <div className="flex items-center justify-center gap-3 xl:justify-start">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.055] shadow-glow">
          <div className="absolute inset-0 rounded-[18px] bg-accent/10 blur-xl" />
          <Aperture className="relative h-6 w-6 text-accent" />
        </div>
        <div className="hidden xl:block">
          <p className="text-sm font-semibold tracking-[-0.02em] text-text">Lumoza Studio</p>
          <p className="mt-0.5 text-xs text-subtle">Local AI curation</p>
        </div>
      </div>

      <nav className="grid gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`lumoza-focus flex items-center justify-center gap-3 rounded-[20px] border px-3 py-3 text-sm font-semibold transition duration-200 ease-lz xl:justify-start xl:px-4 ${
                isActive
                  ? "border-accent/35 bg-accent/12 text-text shadow-glow"
                  : "border-transparent text-muted hover:border-white/8 hover:bg-white/[0.055] hover:text-text"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-accent" : "text-subtle"}`} />
              <span className="hidden xl:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden rounded-[26px] border border-white/8 bg-white/[0.04] p-4 xl:block">
        <div className="mb-4 flex items-center justify-between gap-3">
          <StatusPill tone="purple">Phase 3</StatusPill>
          <span className="font-mono text-xs text-subtle">55%</span>
        </div>
        <ProgressBlock label="Full product" value={55} detail="Phase 3 people foundation is active. Detection, clustering, selection engine, polish, and production hardening remain." />
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-subtle">
          <div className="rounded-2xl border border-white/8 bg-ink/35 p-3">
            <p className="font-mono text-text">10%</p>
            <p className="mt-1">Phase</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-ink/35 p-3">
            <p className="font-mono text-success">Local</p>
            <p className="mt-1">Privacy</p>
          </div>
        </div>
      </div>
    </div>
  );

  const topbar = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="accent">Phase 3 people intelligence</StatusPill>
          <StatusPill tone="success">Offline-first</StatusPill>
        </div>
        <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em] text-text lg:text-3xl">
          {currentProject ? currentProject.name : "Premium local photo curation"}
        </h2>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="hidden min-w-[240px] max-w-md flex-1 items-center gap-3 rounded-full border border-white/10 bg-ink/40 px-4 py-2.5 text-sm text-subtle lg:flex">
          <Search className="h-4 w-4" />
          <span>Search projects, photos, people...</span>
        </div>
        <LumozaButton variant="ghost" className="hidden px-3 lg:inline-flex">
          <Cpu className="h-4 w-4" />
          AI packs
        </LumozaButton>
        <LumozaButton variant="ghost" className="hidden px-3 lg:inline-flex">
          <ShieldCheck className="h-4 w-4" />
          Local
        </LumozaButton>
        <LumozaButton type="button" variant="primary" className="hidden xl:inline-flex" onClick={() => setCurrentView("dashboard")}>
          <Sparkles className="h-4 w-4" />
          New project
        </LumozaButton>
      </div>
    </div>
  );

  let content = <ProjectDashboard projects={projects} onOpenProject={handleOpenProject} onCreateProject={handleCreateProject} />;

  if (currentView === "workspace" && currentProject) {
    content = (
      <ProjectWorkspace
        project={currentProject}
        photos={projectPhotos}
        albumCandidates={albumCandidates}
        reviewQueue={reviewQueue}
        groupSummaries={groupSummaries}
        analysisSummary={analysisSummary}
        peopleSummary={peopleSummary}
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

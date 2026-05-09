import { useEffect, useState, type ComponentType } from "react";
import { Aperture, CalendarDays, FolderOpen, GitCompare, Images, Map, Search, Settings, Sparkles, Upload, UsersRound, Download } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { LumozaButton } from "../components/ui/LumozaButton";
import { LumozaLogo } from "../components/ui/LumozaLogo";
import { StartupSplash } from "../components/splash/StartupSplash";
import { ProjectDashboard } from "../pages/ProjectDashboard";
import { OperationsPage } from "../pages/OperationsPage";
import { ProjectWorkspace } from "../pages/ProjectWorkspace";
import { SettingsPage } from "../pages/SettingsPage";
import { StudioPage } from "../pages/StudioPage";
import { getPeopleAnalysisTask, getProjectAnalysisSummary, getProjectPeopleSummary, getQualityAnalysisTask, listProjectGroupSummaries, startPeopleAnalysis, startQualityAnalysis } from "../services/analysisService";
import { listAlbumCandidatePhotos, listProjectPhotos, listReviewQueuePhotos } from "../services/photoService";
import { createProject, listProjects } from "../services/projectService";
import { cancelScan, getScanTask, pauseScan, resumeScan, startScan } from "../services/scanService";
import { bootstrapApplication, getSystemStatus } from "../services/systemStatusService";
import { useAppStore } from "../stores/appStore";
import { useProjectStore } from "../stores/projectStore";
import { useScanStore } from "../stores/scanStore";
import type { CreateProjectInput, CurationGroupSummary, ProjectAnalysisSummary, ProjectPeopleSummary, ProjectPhoto } from "../types/project";
import type { PeopleAnalysisTask, QualityAnalysisTask, ScanTask, SystemStatus } from "../types/system";

const PHOTO_PAGE_SIZE = 180;

function isTerminal(task?: ScanTask | QualityAnalysisTask | PeopleAnalysisTask) {
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
  const activePeopleTask = useScanStore((state) => state.activePeopleTask);
  const activity = useScanStore((state) => state.activity);
  const setActiveTask = useScanStore((state) => state.setActiveTask);
  const setActiveAnalysisTask = useScanStore((state) => state.setActiveAnalysisTask);
  const setActivePeopleTask = useScanStore((state) => state.setActivePeopleTask);
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
          const people = await getProjectPeopleSummary(nextTask.projectId);
          if (!cancelled) {
            setPeopleSummary(people);
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
        const people = await getProjectPeopleSummary(currentProject.projectId);
        setPeopleSummary(people);
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
        detectedFaceCount: 0,
        clusteredPeopleCount: 0,
        modelStatus: "error",
      };
      setActivePeopleTask(task);
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
  } else if (currentView === "people") {
    content = <StudioPage mode="people" title="People" subtitle="Recognize familiar faces and protect important memories." project={currentProject} photos={projectPhotos} peopleSummary={peopleSummary} peopleTask={activePeopleTask} onStartPeopleAnalysis={handleStartPeopleAnalysis} />;
  } else if (currentView === "places") {
    content = <StudioPage mode="places" title="Places" subtitle="Memories arranged by where they happened." project={currentProject} photos={projectPhotos} />;
  } else if (currentView === "timeline") {
    content = <StudioPage mode="timeline" title="Timeline" subtitle="A calm path through the story." project={currentProject} photos={projectPhotos} />;
  } else if (currentView === "compare") {
    content = <StudioPage mode="compare" title="Compare" subtitle="Choose the frame that feels right." project={currentProject} photos={projectPhotos} />;
  } else if (currentView === "import") {
    content = <StudioPage mode="import" title="Import Photos" subtitle="Bring memories into this local workspace." project={currentProject} photos={projectPhotos} />;
  } else if (currentView === "export") {
    content = <StudioPage mode="export" title="Export" subtitle="Prepare the final collection." project={currentProject} photos={projectPhotos} />;
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

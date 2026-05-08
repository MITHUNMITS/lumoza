import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { StartupSplash } from "../components/splash/StartupSplash";
import { CreateProject } from "../pages/CreateProject";
import { ProjectDashboard } from "../pages/ProjectDashboard";
import { ProjectWorkspace } from "../pages/ProjectWorkspace";
import { SettingsPage } from "../pages/SettingsPage";
import { createProject, listProjects } from "../services/projectService";
import { cancelScan, pauseScan, resumeScan, startScan } from "../services/scanService";
import { bootstrapApplication, getSystemStatus } from "../services/systemStatusService";
import { useAppStore } from "../stores/appStore";
import { useProjectStore } from "../stores/projectStore";
import { useScanStore } from "../stores/scanStore";
import type { CreateProjectInput } from "../types/project";

export function App() {
  const [statusText, setStatusText] = useState("Preparing desktop foundation...");
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
  const activity = useScanStore((state) => state.activity);
  const setActiveTask = useScanStore((state) => state.setActiveTask);
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
        await getSystemStatus();
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
      const refreshedProjects = await listProjects();
      setProjects(refreshedProjects);
      openProject(currentProject.projectId);
      addActivity({
        id: crypto.randomUUID(),
        eventType: "scan_completed",
        severity: task.failedCount > 0 ? "warning" : "info",
        message: task.message,
        createdAt: new Date().toISOString(),
      });
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
      eventType: "scan_cancelled",
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
        <p className="mt-3 text-sm leading-7 text-muted">Offline-first AI curation starts with a reliable local foundation.</p>
      </div>
      <nav className="grid gap-2 text-sm text-muted">
        <button type="button" onClick={() => setCurrentView("dashboard")} className="rounded-2xl px-4 py-3 text-left hover:bg-white/5">Dashboard</button>
        <button type="button" onClick={() => setCurrentView("workspace")} className="rounded-2xl px-4 py-3 text-left hover:bg-white/5">Workspace</button>
        <button type="button" onClick={() => setCurrentView("settings")} className="rounded-2xl px-4 py-3 text-left hover:bg-white/5">Settings</button>
      </nav>
      <div className="mt-auto rounded-[24px] border border-white/8 bg-card/80 p-4 text-sm text-muted">
        Current total product progress: 87%

Phase 1 only. The first real indexing slice is live; advanced AI stays locked out.
      </div>
    </div>
  );

  const topbar = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-muted">Phase 1 foundation</p>
        <h2 className="mt-2 text-3xl font-semibold text-text">Stable local-first desktop architecture</h2>
      </div>
      <CreateProject onCreate={handleCreateProject} />
    </div>
  );

  let content = <ProjectDashboard projects={projects} onOpenProject={handleOpenProject} />;

  if (currentView === "workspace" && currentProject) {
    content = (
      <ProjectWorkspace
        project={currentProject}
        task={activeTask}
        activity={activity}
        onStartScan={handleStartScan}
        onPause={handlePauseScan}
        onResume={handleResumeScan}
        onCancel={handleCancelScan}
      />
    );
  } else if (currentView === "settings") {
    content = <SettingsPage />;
  }

  return <AppShell sidebar={sidebar} topbar={topbar}>{content}</AppShell>;
}

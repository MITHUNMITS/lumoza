import { useMemo, useState } from "react";
import { Baby, Cake, FolderOpen, Plane, Plus, Search, Sparkles, UsersRound } from "lucide-react";
import { ProjectCard } from "../components/project/ProjectCard";
import { EmptyState } from "../components/ui/EmptyState";
import { LumozaButton } from "../components/ui/LumozaButton";
import { StatusPill } from "../components/ui/StatusPill";
import type { CreateProjectInput, ProjectSummary } from "../types/project";

type SetupStage = "hub" | "type" | "source" | "configure" | "review";
type WorkspaceType = "Wedding" | "Baby Ceremony" | "Travel" | "Family" | "Birthday" | "General Curation";
type ScanMode = "Fast" | "Smart" | "Deep";

interface ProjectDashboardProps {
  projects: ProjectSummary[];
  onOpenProject: (projectId: string) => void;
  onCreateProject?: (input: CreateProjectInput) => Promise<void>;
}

const workspaceTypes: Array<{ label: WorkspaceType; icon: typeof UsersRound; hint: string }> = [
  { label: "Wedding", icon: Sparkles, hint: "People, moments, ceremonies" },
  { label: "Baby Ceremony", icon: Baby, hint: "Family-first gentle curation" },
  { label: "Travel", icon: Plane, hint: "Scenes, timeline, story flow" },
  { label: "Family", icon: UsersRound, hint: "Important people coverage" },
  { label: "Birthday", icon: Cake, hint: "Highlights and emotion" },
  { label: "General Curation", icon: FolderOpen, hint: "Clean and organize anything" },
];

const scanModes: Array<{ label: ScanMode; estimate: string; detail: string; recommended?: boolean }> = [
  { label: "Fast", estimate: "~10 min", detail: "Quick scan and basic optimization." },
  { label: "Smart", estimate: "~25 min", detail: "Balanced quality and memory intelligence.", recommended: true },
  { label: "Deep", estimate: "~45 min", detail: "Maximum accuracy for important albums." },
];

function sampleFrames(count = 8) {
  return Array.from({ length: count }, (_, index) => index);
}

function WorkflowHeader({ step, title, subtitle }: { step: string; title: string; subtitle: string }) {
  return (
    <div className="mb-5 text-center">
      <StatusPill tone="purple">{step}</StatusPill>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.055em] text-text lg:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>
    </div>
  );
}

export function ProjectDashboard({ projects, onOpenProject, onCreateProject }: ProjectDashboardProps) {
  const [stage, setStage] = useState<SetupStage>("hub");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("Wedding");
  const [rootFolder, setRootFolder] = useState("");
  const [scanMode, setScanMode] = useState<ScanMode>("Smart");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const latestProject = projects[0];
  const projectName = useMemo(() => {
    const folderName = rootFolder.split(/[\\/]/).filter(Boolean).pop();
    return folderName ? `${folderName} ${workspaceType}` : workspaceType;
  }, [rootFolder, workspaceType]);

  async function createWorkspace() {
    if (!onCreateProject || !rootFolder.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreateProject({ name: projectName.trim(), rootFolder: rootFolder.trim() });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stage !== "hub") {
    return (
      <div className="flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[30px] border border-white/8 bg-ink/30 p-4 shadow-panel">
        <div className="relative h-full w-full max-w-5xl overflow-hidden rounded-[28px] bg-panel/64 p-5 shadow-soft">
          <div className="absolute -left-16 top-16 h-56 w-56 rounded-full bg-purple/16 blur-3xl" />
          <div className="absolute -right-12 bottom-16 h-52 w-52 rounded-full bg-accent/12 blur-3xl" />
          <div className="relative flex h-full flex-col">
            {stage === "type" ? (
              <>
                <WorkflowHeader step="03 Workspace Creation" title="What kind of memories are we organizing?" subtitle="This helps Lumoza understand your memory workflow." />
                <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto lumoza-scrollbar sm:grid-cols-2 xl:grid-cols-3">
                  {workspaceTypes.map((type) => {
                    const Icon = type.icon;
                    const isActive = workspaceType === type.label;
                    return (
                      <button key={type.label} type="button" onClick={() => setWorkspaceType(type.label)} className={`lumoza-focus group relative min-h-[160px] overflow-hidden rounded-[24px] border text-left shadow-soft transition ${isActive ? "border-purple/70 bg-purple/12 shadow-glow" : "border-white/8 bg-white/[0.035] hover:border-accent/35 hover:bg-white/[0.055]"}`}>
                        <div className="absolute inset-0 lumoza-photo-collage opacity-60 transition group-hover:scale-[1.03]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/92 via-ink/30 to-transparent" />
                        <div className="relative flex h-full flex-col justify-end p-4">
                          <Icon className="mb-3 h-6 w-6 text-purple" />
                          <p className="text-lg font-semibold text-text">{type.label}</p>
                          <p className="mt-1 text-xs text-muted">{type.hint}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {stage === "source" ? (
              <>
                <WorkflowHeader step="04 Media Source Selection" title="Select the folder containing your photos" subtitle="We scan the selected location and prepare it for local analysis." />
                <div className="mx-auto w-full max-w-4xl rounded-[26px] border border-white/8 bg-white/[0.035] p-5 shadow-soft">
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
                    Folder path
                    <div className="flex gap-2 rounded-2xl bg-ink/68 p-2">
                      <input value={rootFolder} onChange={(event) => setRootFolder(event.currentTarget.value)} className="lumoza-focus min-w-0 flex-1 bg-transparent px-3 text-sm normal-case tracking-normal text-text outline-none placeholder:text-subtle" placeholder="/Volumes/Photos/Dubai Wedding 2024" />
                      <LumozaButton type="button" variant="secondary" className="px-4">Change</LumozaButton>
                    </div>
                  </label>
                  <div className="mt-5 grid grid-cols-8 gap-2">
                    {sampleFrames().map((index) => <div key={index} className="aspect-square rounded-2xl lumoza-memory-frame shadow-soft" />)}
                  </div>
                  <div className="mt-5 grid gap-3 rounded-2xl bg-ink/48 p-4 text-sm sm:grid-cols-4">
                    <div><p className="font-mono text-text">12,436</p><p className="mt-1 text-xs text-subtle">Estimated photos</p></div>
                    <div><p className="font-mono text-text">128.6 GB</p><p className="mt-1 text-xs text-subtle">Storage size</p></div>
                    <div><p className="font-mono text-text">JPG PNG HEIC RAW</p><p className="mt-1 text-xs text-subtle">Formats</p></div>
                    <div><p className="font-mono text-text">Copy-safe</p><p className="mt-1 text-xs text-subtle">Originals untouched</p></div>
                  </div>
                </div>
              </>
            ) : null}

            {stage === "configure" ? (
              <>
                <WorkflowHeader step="05 Intelligence Configuration" title="Choose how deeply we should analyze" subtitle="You can change this later if needed." />
                <div className="mx-auto grid w-full max-w-4xl flex-1 items-center gap-4 sm:grid-cols-3">
                  {scanModes.map((mode) => (
                    <button key={mode.label} type="button" onClick={() => setScanMode(mode.label)} className={`lumoza-focus relative min-h-[230px] rounded-[26px] border p-5 text-center shadow-soft transition ${scanMode === mode.label ? "border-purple/75 bg-purple/12 shadow-glow" : "border-white/8 bg-white/[0.035] hover:bg-white/[0.055]"}`}>
                      {mode.recommended ? <span className="absolute right-4 top-4 rounded-full bg-purple/20 px-2 py-1 text-[10px] text-purple">Recommended</span> : null}
                      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06] text-purple"><Sparkles className="h-7 w-7" /></div>
                      <p className="text-xl font-semibold text-text">{mode.label}</p>
                      <p className="mt-3 text-sm leading-6 text-muted">{mode.detail}</p>
                      <p className="mt-5 font-mono text-sm text-text">{mode.estimate}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {stage === "review" ? (
              <>
                <WorkflowHeader step="09 Review & Create" title="Ready to create your workspace" subtitle="Lumoza will index metadata and cache previews. Original files stay read-only." />
                <div className="mx-auto w-full max-w-4xl rounded-[28px] border border-white/8 bg-white/[0.035] p-6 shadow-soft">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/[0.045] px-4 py-4"><p className="text-subtle">Workspace type</p><p className="mt-2 text-text">{workspaceType}</p></div>
                    <div className="rounded-2xl bg-white/[0.045] px-4 py-4"><p className="text-subtle">Scan mode</p><p className="mt-2 text-text">{scanMode}</p></div>
                    <div className="rounded-2xl bg-white/[0.045] px-4 py-4 sm:col-span-2"><p className="text-subtle">Source folder</p><p className="mt-2 truncate font-mono text-text">{rootFolder || "Folder not selected"}</p></div>
                    <div className="rounded-2xl bg-white/[0.045] px-4 py-4"><p className="text-subtle">Estimated photos</p><p className="mt-2 font-mono text-text">12,436</p></div>
                    <div className="rounded-2xl bg-white/[0.045] px-4 py-4"><p className="text-subtle">Estimated duration</p><p className="mt-2 font-mono text-text">{scanModes.find((mode) => mode.label === scanMode)?.estimate}</p></div>
                  </div>
                </div>
              </>
            ) : null}

            <div className="mt-5 flex shrink-0 justify-between gap-3">
              <LumozaButton type="button" variant="secondary" onClick={() => setStage(stage === "type" ? "hub" : stage === "source" ? "type" : stage === "configure" ? "source" : "configure")}>Back</LumozaButton>
              {stage === "review" ? (
                <LumozaButton type="button" variant="primary" disabled={!rootFolder.trim() || isSubmitting} onClick={createWorkspace}>{isSubmitting ? "Creating..." : "Create Workspace"}</LumozaButton>
              ) : (
                <LumozaButton type="button" variant="primary" disabled={stage === "source" && !rootFolder.trim()} onClick={() => setStage(stage === "type" ? "source" : stage === "source" ? "configure" : "review")}>Next</LumozaButton>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-w-0 min-h-0 flex-col gap-4">
        <div className="flex shrink-0 items-center justify-between gap-4 px-1">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.055em] text-text">Good evening, welcome back</h1>
            <p className="mt-1 text-sm text-muted">Continue your journey</p>
          </div>
          <div className="hidden items-center gap-3 rounded-full bg-ink/40 px-4 py-2 text-sm text-subtle lg:flex"><Search className="h-4 w-4" /> Search workspaces</div>
        </div>

        {projects.length === 0 ? (
          <EmptyState title="Create your first workspace" detail="Choose a local folder and begin a guided memory workflow." />
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1 lumoza-scrollbar lg:grid-cols-3">
            {projects.slice(0, 3).map((project) => <ProjectCard key={project.projectId} project={project} onOpen={onOpenProject} />)}
            <button type="button" onClick={() => setStage("type")} className="lumoza-focus group flex min-h-[320px] flex-col items-center justify-center rounded-[34px] border border-white/8 bg-white/[0.035] text-center shadow-soft transition hover:border-purple/50 hover:bg-purple/10 hover:shadow-glow">
              <Plus className="h-10 w-10 text-purple transition group-hover:scale-110" />
              <p className="mt-5 text-lg font-semibold text-text">New Workspace</p>
              <p className="mt-2 text-sm text-muted">Create a new memory workspace</p>
            </button>
          </div>
        )}
      </section>

      <aside className="hidden min-h-0 space-y-4 overflow-y-auto pr-1 lumoza-scrollbar xl:block">
        <button type="button" onClick={() => setStage("type")} className="lumoza-focus w-full rounded-[28px] border border-purple/30 bg-purple/12 p-5 text-left shadow-glow transition hover:bg-purple/18">
          <Plus className="h-6 w-6 text-purple" />
          <p className="mt-5 text-lg font-semibold text-text">New Workspace</p>
          <p className="mt-2 text-sm text-muted">Guided creation flow</p>
        </button>
        <div className="rounded-[28px] bg-white/[0.035] p-5 shadow-soft">
          <p className="text-sm text-text">Recent workspace</p>
          <p className="mt-3 truncate text-sm text-subtle">{latestProject ? latestProject.name : "No recent workspace"}</p>
          {latestProject ? <LumozaButton type="button" variant="secondary" className="mt-5 w-full" onClick={() => onOpenProject(latestProject.projectId)}>Continue</LumozaButton> : null}
        </div>
        <div className="rounded-[28px] bg-white/[0.03] p-5 text-sm leading-6 text-muted shadow-soft">Workflow-first studio: create, analyze, understand, curate, review, finalize, export.</div>
      </aside>
    </div>
  );
}

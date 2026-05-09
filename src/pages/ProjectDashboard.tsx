import { HardDrive, Images, LockKeyhole, Sparkles } from "lucide-react";
import { ProjectCard } from "../components/project/ProjectCard";
import { CreateProject } from "./CreateProject";
import { EmptyState } from "../components/ui/EmptyState";
import { MetricCard } from "../components/ui/MetricCard";
import { StatusPill } from "../components/ui/StatusPill";
import type { CreateProjectInput, ProjectSummary } from "../types/project";

interface ProjectDashboardProps {
  projects: ProjectSummary[];
  onOpenProject: (projectId: string) => void;
  onCreateProject?: (input: CreateProjectInput) => Promise<void>;
}

export function ProjectDashboard({ projects, onOpenProject, onCreateProject }: ProjectDashboardProps) {
  const indexedCount = projects.reduce((total, project) => total + project.photoCount, 0);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="grid gap-5">
        <div className="lumoza-panel relative overflow-hidden rounded-[34px] p-7">
          <div className="absolute right-8 top-0 h-56 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="accent">Creative library</StatusPill>
                <StatusPill tone="success">Read-only originals</StatusPill>
              </div>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.055em] text-text lg:text-5xl">Curate huge photo stories without losing the quiet.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                Create a local project, scan safely, and let Lumoza build the intelligence layer around your media instead of turning it into a dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard icon={<Images className="h-5 w-5" />} label="Projects" value={projects.length} detail="Local workspaces" tone="accent" />
          <MetricCard icon={<HardDrive className="h-5 w-5" />} label="Indexed" value={indexedCount} detail="Photos in project databases" tone="purple" />
          <MetricCard icon={<LockKeyhole className="h-5 w-5" />} label="Safety" value="Read-only" detail="Original files are never modified" tone="success" />
        </div>

        <section className="lumoza-card rounded-[30px] p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-subtle">Recent workspaces</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text">Projects</h3>
            </div>
            <StatusPill tone="muted">{projects.length} total</StatusPill>
          </div>
          <div className="grid gap-4">
            {projects.length === 0 ? (
              <EmptyState title="No projects yet" detail="Start with a local folder. Lumoza will build project metadata, thumbnails, and intelligence caches without touching originals." />
            ) : (
              projects.map((project) => <ProjectCard key={project.projectId} project={project} onOpen={onOpenProject} />)
            )}
          </div>
        </section>
      </section>

      <section className="grid content-start gap-5">
        {onCreateProject ? <CreateProject onCreate={onCreateProject} /> : null}
        <div className="lumoza-card rounded-[30px] p-6">
          <div className="flex items-center gap-3 text-accent">
            <Sparkles className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Product direction</p>
          </div>
          <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
            <p>Phase 1 and 2 are complete. Phase 3 foundations are active, with people intelligence ready for real local detection and clustering.</p>
            <p>The UI now reserves space for future people, reviews, final selection, model packs, and export workflows without implementing those phases early.</p>
          </div>
        </div>
        <div className="lumoza-card rounded-[30px] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-subtle">Privacy posture</p>
          <h3 className="mt-2 text-xl font-semibold text-text">Local processing first</h3>
          <p className="mt-4 text-sm leading-7 text-muted">Project databases, thumbnails, analysis results, and future face crops live in app-managed project storage. Originals remain read-only.</p>
        </div>
      </section>
    </div>
  );
}

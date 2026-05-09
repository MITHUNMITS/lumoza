import { Clock3, Images, Plus } from "lucide-react";
import { ProjectCard } from "../components/project/ProjectCard";
import { CreateProject } from "./CreateProject";
import { EmptyState } from "../components/ui/EmptyState";
import { LumozaButton } from "../components/ui/LumozaButton";
import { StatusPill } from "../components/ui/StatusPill";
import type { CreateProjectInput, ProjectSummary } from "../types/project";

interface ProjectDashboardProps {
  projects: ProjectSummary[];
  onOpenProject: (projectId: string) => void;
  onCreateProject?: (input: CreateProjectInput) => Promise<void>;
}

export function ProjectDashboard({ projects, onOpenProject, onCreateProject }: ProjectDashboardProps) {
  const latestProject = projects[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 space-y-4">
        <div className="relative min-h-[360px] overflow-hidden rounded-[38px] bg-ink/38 shadow-panel">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/18 via-purple/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/88 to-transparent" />
          <div className="absolute right-10 top-8 h-52 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex min-h-[360px] flex-col justify-end p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="accent">Memory studio</StatusPill>
              <StatusPill tone="success">Local</StatusPill>
            </div>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.07em] text-text lg:text-6xl">Your stories, quietly organized.</h1>
            <div className="mt-7 flex flex-wrap gap-3">
              {latestProject ? (
                <LumozaButton type="button" variant="primary" onClick={() => onOpenProject(latestProject.projectId)}>Continue</LumozaButton>
              ) : null}
              <LumozaButton type="button" variant="secondary">Import photos</LumozaButton>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-2 text-muted">
              <Images className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Recent projects</span>
            </div>
            <span className="text-sm text-subtle">{projects.length}</span>
          </div>
          {projects.length === 0 ? (
            <EmptyState title="Create your first memory workspace" detail="Choose a folder and Lumoza will build a local project around it." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 3xl:grid-cols-3">
              {projects.map((project) => <ProjectCard key={project.projectId} project={project} onOpen={onOpenProject} />)}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        {onCreateProject ? <CreateProject onCreate={onCreateProject} /> : null}
        <div className="rounded-[30px] bg-white/[0.035] p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between text-sm text-muted">
            <span>Quick actions</span>
            <Plus className="h-4 w-4 text-accent" />
          </div>
          <div className="grid gap-2">
            <button className="lumoza-focus rounded-2xl bg-white/[0.055] px-4 py-3 text-left text-sm text-text transition hover:bg-white/[0.08]">New wedding project</button>
            <button className="lumoza-focus rounded-2xl bg-white/[0.055] px-4 py-3 text-left text-sm text-text transition hover:bg-white/[0.08]">Resume scan</button>
            <button className="lumoza-focus rounded-2xl bg-white/[0.055] px-4 py-3 text-left text-sm text-text transition hover:bg-white/[0.08]">Open review queue</button>
          </div>
        </div>
        <div className="rounded-[30px] bg-white/[0.03] p-5 text-sm text-muted">
          <div className="flex items-center gap-2 text-text"><Clock3 className="h-4 w-4 text-accent" /> Recent</div>
          <p className="mt-3 truncate text-subtle">{latestProject ? latestProject.name : "No recent project"}</p>
        </div>
      </aside>
    </div>
  );
}

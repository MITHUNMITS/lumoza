import { Plus, Sparkles } from "lucide-react";
import { ProjectCard } from "../components/project/ProjectCard";
import type { ProjectSummary } from "../types/project";

interface ProjectDashboardProps {
  projects: ProjectSummary[];
  onOpenProject: (projectId: string) => void;
}

export function ProjectDashboard({ projects, onOpenProject }: ProjectDashboardProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[24px] border border-white/8 bg-card/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-muted">Projects</p>
            <h2 className="mt-2 text-3xl font-semibold text-text">Recent workspaces</h2>
          </div>
          <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-sm text-muted">{projects.length} total</div>
        </div>
        <div className="mt-6 grid gap-4">
          {projects.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-ink/30 p-6 text-muted">
              No projects yet. Create the first workspace and attach a photo root folder.
            </div>
          ) : (
            projects.map((project) => <ProjectCard key={project.projectId} project={project} onOpen={onOpenProject} />)
          )}
        </div>
      </section>

      <section className="grid gap-5">
        <div className="rounded-[24px] border border-white/8 bg-card/60 p-6">
          <div className="flex items-center gap-3 text-accent">
            <Sparkles className="h-5 w-5" />
            <p className="text-sm uppercase tracking-[0.22em]">Phase 1 focus</p>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li>Project creation and reopening</li>
            <li>Local-only scan pipeline with progress controls</li>
            <li>SQLite indexing and thumbnail cache scaffolding</li>
            <li>No quality scoring or smart selection yet</li>
          </ul>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/60 p-6">
          <div className="flex items-center gap-3 text-text">
            <Plus className="h-5 w-5" />
            <p className="text-sm uppercase tracking-[0.22em] text-muted">Safety baseline</p>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted">
            Originals remain read-only. The foundation layer only indexes metadata and generates cached thumbnails.
          </p>
        </div>
      </section>
    </div>
  );
}

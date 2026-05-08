import type { ProjectSummary } from "../../types/project";

interface ProjectCardProps {
  project: ProjectSummary;
  onOpen: (projectId: string) => void;
}

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(project.projectId)}
      className="w-full rounded-[24px] border border-white/8 bg-card/80 p-5 text-left transition hover:border-accent/50 hover:bg-hover/80"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-text">{project.name}</p>
          <p className="mt-1 text-sm text-muted">{project.rootFolder}</p>
        </div>
        <span className="rounded-full bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted">{project.status}</span>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm text-subtle">
        <span>{project.photoCount} indexed photos</span>
        <span>{project.lastOpenedAt ? new Date(project.lastOpenedAt).toLocaleString() : "Never opened"}</span>
      </div>
    </button>
  );
}

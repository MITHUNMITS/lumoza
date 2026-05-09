import { ArrowUpRight, Folder, Images } from "lucide-react";
import type { ProjectSummary } from "../../types/project";
import { StatusPill } from "../ui/StatusPill";

interface ProjectCardProps {
  project: ProjectSummary;
  onOpen: (projectId: string) => void;
}

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(project.projectId)}
      className="lumoza-card lumoza-card-hover lumoza-focus group w-full overflow-hidden rounded-[28px] p-5 text-left"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-accent/10 text-accent">
              <Folder className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-[-0.02em] text-text">{project.name}</p>
              <p className="mt-1 truncate text-sm text-muted">{project.rootFolder}</p>
            </div>
          </div>
        </div>
        <ArrowUpRight className="h-5 w-5 text-subtle transition group-hover:text-accent" />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Images className="h-4 w-4 text-subtle" />
          <span>{project.photoCount} indexed photos</span>
        </div>
        <StatusPill tone={project.status === "error" ? "danger" : project.status === "scanning" ? "warning" : "success"}>{project.status}</StatusPill>
      </div>
      <div className="mt-4 rounded-2xl border border-white/8 bg-ink/30 px-4 py-3 text-xs text-subtle">
        Last opened {project.lastOpenedAt ? new Date(project.lastOpenedAt).toLocaleString() : "never"}
      </div>
    </button>
  );
}

import { ArrowUpRight, Images } from "lucide-react";
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
      className="lumoza-focus group relative min-h-[320px] overflow-hidden rounded-[34px] bg-card/60 p-0 text-left shadow-soft transition duration-300 ease-lz hover:-translate-y-1 hover:shadow-glow"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-purple/10 to-ink" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_16%,rgba(255,255,255,0.20),transparent_18%),linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute left-8 top-10 h-28 w-40 rounded-[28px] bg-white/10 blur-2xl transition group-hover:bg-accent/20" />
      <div className="absolute right-6 top-6">
        <StatusPill tone={project.status === "error" ? "danger" : project.status === "scanning" ? "warning" : "success"}>{project.status}</StatusPill>
      </div>
      <div className="relative flex h-full min-h-[320px] flex-col justify-end p-6">
        <div className="mb-5 flex items-center gap-2 text-sm text-muted">
          <Images className="h-4 w-4 text-accent" />
          <span>{project.photoCount} photos</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-[-0.04em] text-text">{project.name}</p>
            <p className="mt-2 truncate text-sm text-muted">{project.rootFolder}</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-text transition group-hover:bg-accent group-hover:text-white">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </button>
  );
}

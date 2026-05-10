import { CheckCircle2, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { ProjectPhoto, SelectionOverrideLabel } from "../../types/project";
import { StatusPill } from "./StatusPill";

export type PhotoOverrideAction = SelectionOverrideLabel | "clear";

interface ThumbnailCardProps {
  photo: ProjectPhoto;
  previewSrc?: string;
  style: CSSProperties;
  height: number;
  previewHeight: number;
  isSelected?: boolean;
  onSelect?: (photoId: string) => void;
  onSetOverride?: (photoId: string, overrideLabel: PhotoOverrideAction) => void;
}

const overrideTone: Record<SelectionOverrideLabel, "success" | "danger" | "purple"> = {
  protect: "purple",
  force_include: "success",
  force_exclude: "danger",
};

const overrideCopy: Record<SelectionOverrideLabel, string> = {
  protect: "protected",
  force_include: "included",
  force_exclude: "excluded",
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function OverrideButton({ label, title, active, onClick, children }: { label: string; title: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`lumoza-focus inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium transition duration-200 ease-lz ${active ? "bg-accent/18 text-text shadow-glow" : "bg-white/[0.055] text-subtle hover:bg-white/[0.09] hover:text-text"}`}
    >
      {children}
      <span className="hidden 2xl:inline">{label}</span>
    </button>
  );
}

export function ThumbnailCard({ photo, previewSrc, style, height, previewHeight, isSelected, onSelect, onSetOverride }: ThumbnailCardProps) {
  const overallScore = photo.quality?.overallScore;
  const rankingScore = photo.rankingScore;

  return (
    <article
      style={{ ...style, height: `${height}px` }}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(photo.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(photo.id);
        }
      }}
      className={`group absolute flex flex-col overflow-hidden rounded-[22px] border bg-panel/80 shadow-soft transition duration-300 ease-lz hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-glow ${isSelected ? "border-accent/70 ring-2 ring-accent/25 shadow-glow" : "border-white/8"}`}
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-transparent" style={{ height: `${previewHeight}px` }}>
        <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap gap-2 p-3">
          {overallScore !== undefined ? <StatusPill tone="accent">{(overallScore * 100).toFixed(0)} quality</StatusPill> : null}
          {photo.selectionLabel ? <StatusPill tone={photo.selectionLabel === "keep" ? "success" : photo.selectionLabel === "review" ? "warning" : "danger"}>{photo.selectionLabel}</StatusPill> : null}
          {photo.albumCandidate ? <StatusPill tone="purple">album</StatusPill> : null}
          {photo.overrideLabel ? <StatusPill tone={overrideTone[photo.overrideLabel]}>{overrideCopy[photo.overrideLabel]}</StatusPill> : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-ink/85 to-transparent opacity-80" />
        {previewSrc ? (
          <img src={previewSrc} alt={photo.filename} loading="lazy" className="h-full w-full object-cover transition duration-500 ease-lz group-hover:scale-[1.035]" />
        ) : (
          <div className="flex h-full items-end border border-dashed border-white/8 p-4 text-xs text-subtle">
            {photo.thumbnailStatus === "failed" ? "Preview generation failed" : "Thumbnail pending"}
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-text">{photo.filename}</p>
          <span className="font-mono text-[11px] uppercase text-subtle">{photo.extension}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-subtle">
          <span>{photo.width && photo.height ? `${photo.width}x${photo.height}` : "Dimensions pending"}</span>
          <span>{formatSize(photo.fileSizeBytes)}</span>
        </div>
        <p className="line-clamp-1 text-xs leading-5 text-muted">{photo.selectionReason ?? "Selection reason pending"}</p>
        <div className="flex items-center justify-between gap-3 text-xs text-subtle">
          <span>{photo.duplicateGroupId ? "Duplicate set" : photo.burstGroupId ? "Burst set" : "Standalone"}</span>
          <span>{photo.confidenceScore !== undefined ? `${(photo.confidenceScore * 100).toFixed(0)} conf` : rankingScore !== undefined ? `${(rankingScore * 100).toFixed(0)} rank` : "Unranked"}</span>
        </div>
        {onSetOverride ? (
          <div className="grid grid-cols-4 gap-1.5 pt-1 opacity-90 transition duration-200 group-hover:opacity-100">
            <OverrideButton label="Protect" title="Protect this memory" active={photo.overrideLabel === "protect"} onClick={() => onSetOverride(photo.id, "protect")}><ShieldCheck className="h-3.5 w-3.5" /></OverrideButton>
            <OverrideButton label="Keep" title="Force include" active={photo.overrideLabel === "force_include"} onClick={() => onSetOverride(photo.id, "force_include")}><CheckCircle2 className="h-3.5 w-3.5" /></OverrideButton>
            <OverrideButton label="Cut" title="Force exclude" active={photo.overrideLabel === "force_exclude"} onClick={() => onSetOverride(photo.id, "force_exclude")}><XCircle className="h-3.5 w-3.5" /></OverrideButton>
            <OverrideButton label="Clear" title="Clear override" onClick={() => onSetOverride(photo.id, "clear")}><RotateCcw className="h-3.5 w-3.5" /></OverrideButton>
          </div>
        ) : null}
      </div>
    </article>
  );
}

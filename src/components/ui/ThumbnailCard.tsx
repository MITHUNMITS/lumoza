import type { CSSProperties } from "react";
import type { ProjectPhoto } from "../../types/project";
import { StatusPill } from "./StatusPill";

interface ThumbnailCardProps {
  photo: ProjectPhoto;
  previewSrc?: string;
  style: CSSProperties;
  height: number;
  previewHeight: number;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

export function ThumbnailCard({ photo, previewSrc, style, height, previewHeight }: ThumbnailCardProps) {
  const overallScore = photo.quality?.overallScore;
  const rankingScore = photo.rankingScore;

  return (
    <article style={{ ...style, height: `${height}px` }} className="group absolute flex flex-col overflow-hidden rounded-[22px] border border-white/8 bg-panel/80 shadow-soft transition duration-300 ease-lz hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-glow">
      <div className="relative overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-transparent" style={{ height: `${previewHeight}px` }}>
        <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap gap-2 p-3">
          {overallScore !== undefined ? <StatusPill tone="accent">{(overallScore * 100).toFixed(0)} quality</StatusPill> : null}
          {photo.selectionLabel ? <StatusPill tone={photo.selectionLabel === "keep" ? "success" : photo.selectionLabel === "review" ? "warning" : "danger"}>{photo.selectionLabel}</StatusPill> : null}
          {photo.albumCandidate ? <StatusPill tone="purple">album</StatusPill> : null}
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
        <p className="line-clamp-2 text-xs leading-5 text-muted">{photo.selectionReason ?? "Selection reason pending"}</p>
        <div className="flex items-center justify-between gap-3 text-xs text-subtle">
          <span>{photo.duplicateGroupId ? "Duplicate set" : photo.burstGroupId ? "Burst set" : "Standalone"}</span>
          <span>{photo.confidenceScore !== undefined ? `${(photo.confidenceScore * 100).toFixed(0)} conf` : rankingScore !== undefined ? `${(rankingScore * 100).toFixed(0)} rank` : "Unranked"}</span>
        </div>
      </div>
    </article>
  );
}

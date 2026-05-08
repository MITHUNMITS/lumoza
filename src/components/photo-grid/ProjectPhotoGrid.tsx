import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ProjectPhoto } from "../../types/project";

interface ProjectPhotoGridProps {
  photos: ProjectPhoto[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error?: string;
  onLoadMore: () => void;
}

const GRID_GAP = 16;
const CARD_MIN_WIDTH = 210;
const CARD_HEIGHT = 314;
const PREVIEW_HEIGHT = 220;
const OVERSCAN_ROWS = 2;

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function createMockPreview(photo: ProjectPhoto) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#23414f" />
          <stop offset="50%" stop-color="#456b70" />
          <stop offset="100%" stop-color="#0f171b" />
        </linearGradient>
      </defs>
      <rect width="640" height="800" fill="url(#g)" />
      <circle cx="500" cy="172" r="112" fill="rgba(255,255,255,0.14)" />
      <path d="M90 620L240 420L350 550L430 470L550 640V710H90Z" fill="rgba(255,255,255,0.18)" />
      <text x="90" y="118" fill="rgba(255,255,255,0.88)" font-family="Arial, sans-serif" font-size="38">${photo.extension.toUpperCase()}</text>
      <text x="90" y="702" fill="rgba(255,255,255,0.74)" font-family="Arial, sans-serif" font-size="24">${photo.filename}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolvePreviewSrc(photo: ProjectPhoto) {
  if (photo.thumbnailStatus !== "generated") {
    return undefined;
  }
  if (photo.thumbnailCachePath && hasTauriRuntime()) {
    return convertFileSrc(photo.thumbnailCachePath);
  }
  return createMockPreview(photo);
}

function emptyState(isLoading: boolean, error?: string, hasPhotos?: boolean) {
  if (isLoading) {
    return <div className="rounded-[20px] border border-dashed border-white/10 bg-ink/30 p-6 text-sm text-muted">Loading indexed project photos...</div>;
  }
  if (error) {
    return <div className="rounded-[20px] border border-danger/30 bg-danger/10 p-6 text-sm text-danger">{error}</div>;
  }
  if (!hasPhotos) {
    return (
      <div className="rounded-[20px] border border-dashed border-white/10 bg-ink/30 p-6 text-sm text-muted">
        No indexed photos yet. Run the scan to populate this workspace.
      </div>
    );
  }
  return null;
}

export function ProjectPhotoGrid({ photos, isLoading, isLoadingMore, hasMore, error, onLoadMore }: ProjectPhotoGridProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLock = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    const updateMetrics = () => {
      setViewportWidth(node.clientWidth);
      setViewportHeight(node.clientHeight);
      setScrollTop(node.scrollTop);
    };

    updateMetrics();

    const handleScroll = () => {
      setScrollTop(node.scrollTop);
    };

    node.addEventListener("scroll", handleScroll);
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(node);

    return () => {
      node.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isLoadingMore) {
      loadMoreLock.current = false;
    }
  }, [isLoadingMore]);

  const columns = Math.max(1, Math.floor((Math.max(viewportWidth, CARD_MIN_WIDTH) + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)));
  const cardWidth = Math.max(CARD_MIN_WIDTH, (Math.max(viewportWidth, CARD_MIN_WIDTH) - GRID_GAP * (columns - 1)) / columns);
  const rowHeight = CARD_HEIGHT + GRID_GAP;
  const totalRows = Math.ceil(photos.length / columns);
  const totalHeight = Math.max(rowHeight * totalRows - GRID_GAP, 0);
  const visibleRows = Math.ceil(viewportHeight / rowHeight);
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
  const endRow = Math.min(totalRows, startRow + visibleRows + OVERSCAN_ROWS * 2);

  useEffect(() => {
    const isNearBottom = scrollTop + viewportHeight >= totalHeight - rowHeight * 2;
    if (!hasMore || isLoading || isLoadingMore || !isNearBottom || loadMoreLock.current) {
      return;
    }
    loadMoreLock.current = true;
    onLoadMore();
  }, [hasMore, isLoading, isLoadingMore, onLoadMore, rowHeight, scrollTop, totalHeight, viewportHeight]);

  const virtualItems: Array<{ photo: ProjectPhoto; style: CSSProperties }> = [];
  for (let row = startRow; row < endRow; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const photo = photos[index];
      if (!photo) {
        continue;
      }
      virtualItems.push({
        photo,
        style: {
          position: "absolute",
          width: `${cardWidth}px`,
          left: `${column * (cardWidth + GRID_GAP)}px`,
          top: `${row * rowHeight}px`,
        },
      });
    }
  }

  const state = emptyState(isLoading, error, photos.length > 0);

  return (
    <div className="rounded-[24px] border border-white/8 bg-card/70 p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Photos</p>
          <h3 className="mt-2 text-xl font-semibold text-text">Indexed project media</h3>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted">
          <span className="rounded-full bg-white/6 px-3 py-1">{photos.length}{hasMore ? "+" : ""} loaded</span>
          <span className="rounded-full bg-white/6 px-3 py-1">Phase 2 scores</span>
        </div>
      </div>

      {state}

      {!state ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-[20px] border border-white/8 bg-ink/30 p-4 text-sm text-muted md:grid-cols-3">
            <div>
              <span className="block text-xs uppercase tracking-[0.22em] text-subtle">Viewport mode</span>
              <span className="mt-2 block text-text">Windowed rendering for larger project sets</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-[0.22em] text-subtle">Thumbnail source</span>
              <span className="mt-2 block text-text">App-managed cache previews when available</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-[0.22em] text-subtle">Analysis state</span>
              <span className="mt-2 block text-text">Technical quality scores surface as soon as analysis results exist</span>
            </div>
          </div>

          <div ref={viewportRef} className="relative h-[760px] overflow-y-auto rounded-[20px] border border-white/8 bg-ink/30 p-3">
            <div style={{ height: totalHeight > 0 ? `${totalHeight}px` : `${CARD_HEIGHT}px`, position: "relative" }}>
              {virtualItems.map(({ photo, style }) => {
                const previewSrc = resolvePreviewSrc(photo);
                const overallScore = photo.quality?.overallScore;

                return (
                  <article key={photo.id} style={{ ...style, height: `${CARD_HEIGHT}px` }} className="flex flex-col overflow-hidden rounded-[20px] border border-white/8 bg-panel/80 shadow-soft">
                    <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-transparent" style={{ height: `${PREVIEW_HEIGHT}px` }}>
                      {overallScore !== undefined ? (
                        <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                          {(overallScore * 100).toFixed(0)} quality
                        </span>
                      ) : null}
                      {previewSrc ? (
                        <img
                          src={previewSrc}
                          alt={photo.filename}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-end rounded-[14px] border border-dashed border-white/8 p-3 text-xs text-subtle">
                          {photo.thumbnailStatus === "failed" ? "Preview generation failed" : "Thumbnail pending"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2 p-3">
                      <p className="truncate text-sm font-medium text-text">{photo.filename}</p>
                      <div className="flex items-center justify-between gap-3 text-xs text-subtle">
                        <span>{photo.width && photo.height ? `${photo.width}×${photo.height}` : "Dimensions pending"}</span>
                        <span>{formatSize(photo.fileSizeBytes)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-subtle">
                        <span className="uppercase">{photo.extension}</span>
                        <span>{photo.modifiedAt ? new Date(photo.modifiedAt).toLocaleDateString() : "Unknown date"}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

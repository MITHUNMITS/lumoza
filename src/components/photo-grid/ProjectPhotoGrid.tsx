import { convertFileSrc } from "@tauri-apps/api/core";
import { Grid3X3, Layers3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ProjectPhoto } from "../../types/project";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonLoader } from "../ui/SkeletonLoader";
import { StatusPill } from "../ui/StatusPill";
import { ThumbnailCard } from "../ui/ThumbnailCard";

interface ProjectPhotoGridProps {
  photos: ProjectPhoto[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error?: string;
  onLoadMore: () => void;
}

const GRID_GAP = 18;
const CARD_MIN_WIDTH = 218;
const CARD_HEIGHT = 326;
const PREVIEW_HEIGHT = 226;
const OVERSCAN_ROWS = 2;

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function createMockPreview(photo: ProjectPhoto) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#223247" />
          <stop offset="50%" stop-color="#3f5268" />
          <stop offset="100%" stop-color="#10141b" />
        </linearGradient>
      </defs>
      <rect width="640" height="800" fill="url(#g)" />
      <circle cx="500" cy="172" r="112" fill="rgba(255,255,255,0.14)" />
      <path d="M90 620L240 420L350 550L430 470L550 640V710H90Z" fill="rgba(255,255,255,0.18)" />
      <text x="90" y="118" fill="rgba(255,255,255,0.88)" font-family="Inter, sans-serif" font-size="38">${photo.extension.toUpperCase()}</text>
      <text x="90" y="702" fill="rgba(255,255,255,0.74)" font-family="Inter, sans-serif" font-size="24">${photo.filename}</text>
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

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-5">
      {Array.from({ length: 10 }, (_, index) => <SkeletonLoader key={index} className="h-[326px]" />)}
    </div>
  );
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

    const handleScroll = () => setScrollTop(node.scrollTop);
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

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[30px] bg-ink/24 p-3 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2 text-muted">
          <Grid3X3 className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Photos</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="muted">{photos.length}{hasMore ? "+" : ""}</StatusPill>
          <StatusPill tone="accent">AI</StatusPill>
        </div>
      </div>

      {isLoading ? <LoadingGrid /> : null}
      {!isLoading && error ? <EmptyState eyebrow="Grid error" title="Photos could not load" detail={error} /> : null}
      {!isLoading && !error && photos.length === 0 ? <EmptyState eyebrow="No media" title="No indexed photos yet" detail="Run a scan to populate this workspace with safe cached previews and metadata." /> : null}

      {!isLoading && !error && photos.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div ref={viewportRef} className="lumoza-scrollbar relative min-h-0 flex-1 overflow-y-auto rounded-[26px] bg-ink/30 p-3">
            <div style={{ height: totalHeight > 0 ? `${totalHeight}px` : `${CARD_HEIGHT}px`, position: "relative" }}>
              {virtualItems.map(({ photo, style }) => (
                <ThumbnailCard key={photo.id} photo={photo} previewSrc={resolvePreviewSrc(photo)} style={style} height={CARD_HEIGHT} previewHeight={PREVIEW_HEIGHT} />
              ))}
            </div>
          </div>

          {isLoadingMore ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm text-muted">
              <Layers3 className="h-4 w-4 animate-pulse text-accent" />
              Loading more indexed media
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

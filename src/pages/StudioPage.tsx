import { Image, Map, SplitSquareHorizontal, Upload, UsersRound, CalendarDays, Download } from "lucide-react";
import type { ProjectPhoto, ProjectPeopleSummary, ProjectSummary } from "../types/project";
import { LumozaButton } from "../components/ui/LumozaButton";
import type { PeopleAnalysisTask } from "../types/system";

interface StudioPageProps {
  title: string;
  subtitle: string;
  mode: "people" | "places" | "timeline" | "compare" | "import" | "export";
  project?: ProjectSummary;
  photos: ProjectPhoto[];
  peopleSummary?: ProjectPeopleSummary;
  peopleTask?: PeopleAnalysisTask;
  onStartPeopleAnalysis?: () => void;
}

const icons = {
  people: UsersRound,
  places: Map,
  timeline: CalendarDays,
  compare: SplitSquareHorizontal,
  import: Upload,
  export: Download,
};

function MemoryStrip({ photos }: { photos: ProjectPhoto[] }) {
  const visible = photos.slice(0, 8);
  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: 8 }, (_, index) => visible[index]).map((photo, index) => (
        <div key={photo?.id ?? index} className="aspect-[4/3] overflow-hidden rounded-[18px] lumoza-memory-frame shadow-soft">
          <div className="relative flex h-full items-end p-3 text-xs text-muted">
            <span className="truncate">{photo?.filename ?? "Memory"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudioPage({ title, subtitle, mode, project, photos, peopleSummary, peopleTask, onStartPeopleAnalysis }: StudioPageProps) {
  const Icon = icons[mode] ?? Image;
  const isImport = mode === "import";
  const isExport = mode === "export";

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-0 min-w-0 flex-col gap-4">
        <div className="relative min-h-[260px] overflow-hidden rounded-[34px] bg-ink/36 p-7 shadow-panel">
          <div className="absolute inset-0 lumoza-photo-collage opacity-75" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/88 to-transparent" />
          <div className="relative flex h-full min-h-[220px] flex-col justify-end">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.08] text-accent shadow-glow"><Icon className="h-7 w-7" /></div>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.07em] text-text">{title}</h1>
            <p className="mt-3 max-w-xl text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 rounded-[30px] bg-ink/24 p-4 shadow-soft">
          {isImport ? (
            <div className="flex h-full items-center justify-center rounded-[26px] border border-dashed border-purple/45 bg-purple/5">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-purple" />
                <h2 className="mt-5 text-2xl font-semibold text-text">Drag memories here</h2>
                <p className="mt-2 text-sm text-muted">JPG, PNG, HEIC, RAW later</p>
                <LumozaButton className="mt-6" variant="primary">Browse folder</LumozaButton>
              </div>
            </div>
          ) : isExport ? (
            <div className="grid h-full gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[26px] bg-white/[0.04] p-5">
                <h2 className="text-xl font-semibold text-text">Export memories</h2>
                <div className="mt-5 grid gap-3">
                  {["Photos", "Video", "Album"].map((item) => <div key={item} className="rounded-2xl bg-white/[0.05] px-4 py-4 text-sm text-muted">{item}</div>)}
                </div>
              </div>
              <MemoryStrip photos={photos} />
            </div>
          ) : (
            <MemoryStrip photos={photos} />
          )}
        </div>
      </section>
      <aside className="hidden min-h-0 space-y-4 overflow-y-auto pr-1 xl:block lumoza-scrollbar">
        <div className="rounded-[28px] bg-white/[0.035] p-5 shadow-soft">
          <p className="text-sm text-text">{project?.name ?? "No project open"}</p>
          <p className="mt-2 text-sm text-subtle">{photos.length} memories</p>
        </div>
        {mode === "people" ? (
          <div className="rounded-[28px] bg-white/[0.03] p-5 shadow-soft">
            <p className="text-sm text-text">People readiness</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleSummary?.faceAnalysisRunCount ?? 0}</p><p className="mt-1 text-xs text-subtle">Runs</p></div>
              <div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleSummary?.detectedFaceCount ?? 0}</p><p className="mt-1 text-xs text-subtle">Faces</p></div>
              <div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleSummary?.clusteredPeopleCount ?? 0}</p><p className="mt-1 text-xs text-subtle">People</p></div>
              <div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleTask?.status ?? "ready"}</p><p className="mt-1 text-xs text-subtle">Status</p></div>
            </div>
            {peopleTask ? <p className="mt-4 text-xs leading-5 text-muted">{peopleTask.message}</p> : null}
            <LumozaButton type="button" variant="primary" className="mt-5 w-full" disabled={!project || peopleTask?.status === "running"} onClick={onStartPeopleAnalysis}>Prepare people</LumozaButton>
          </div>
        ) : (
          <div className="rounded-[28px] bg-white/[0.03] p-5 shadow-soft">
            <p className="text-sm text-text">Coming next</p>
            <p className="mt-3 text-sm leading-6 text-muted">This view is ready for the matching product phase without shipping future AI behavior early.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

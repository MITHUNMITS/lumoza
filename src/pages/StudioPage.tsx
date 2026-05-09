import { convertFileSrc } from "@tauri-apps/api/core";
import { useState } from "react";
import { CalendarDays, Download, Image, Map, SplitSquareHorizontal, Upload, UsersRound } from "lucide-react";
import type { ProjectPerson, ProjectPhoto, ProjectPeopleSummary, ProjectSummary } from "../types/project";
import { LumozaButton } from "../components/ui/LumozaButton";
import type { PeopleAnalysisTask } from "../types/system";

interface StudioPageProps {
  title: string;
  subtitle: string;
  mode: "people" | "places" | "timeline" | "compare" | "import" | "export";
  project?: ProjectSummary;
  photos: ProjectPhoto[];
  peopleSummary?: ProjectPeopleSummary;
  people?: ProjectPerson[];
  peopleTask?: PeopleAnalysisTask;
  onStartPeopleAnalysis?: () => void;
  onUpdatePerson?: (personId: string, input: { displayName?: string; priorityLabel?: string; isHidden?: boolean }) => void;
  onMergePeople?: (primaryPersonId: string, secondaryPersonId: string) => void;
  onSplitPersonFace?: (faceDetectionId: string) => void;
}

const icons = {
  people: UsersRound,
  places: Map,
  timeline: CalendarDays,
  compare: SplitSquareHorizontal,
  import: Upload,
  export: Download,
};

const priorityOptions = [
  { value: "unassigned", label: "Unassigned" },
  { value: "p1", label: "P1 Bride/Groom" },
  { value: "p2", label: "P2 Parents" },
  { value: "p3", label: "P3 Siblings" },
  { value: "p4", label: "P4 Close Circle" },
  { value: "p5", label: "P5 Guests" },
];

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function faceSrc(path?: string) {
  if (!path) {
    return undefined;
  }
  return hasTauriRuntime() ? convertFileSrc(path) : undefined;
}

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

function PeopleWorkspace({
  project,
  people,
  peopleTask,
  onStartPeopleAnalysis,
  onUpdatePerson,
  onMergePeople,
  onSplitPersonFace,
}: Pick<StudioPageProps, "project" | "people" | "peopleTask" | "onStartPeopleAnalysis" | "onUpdatePerson" | "onMergePeople" | "onSplitPersonFace">) {
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const hasPeople = (people?.length ?? 0) > 0;

  if (!hasPeople) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-[26px] bg-white/[0.025] p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple/12 text-purple shadow-glow">
            <UsersRound className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em] text-text">No people organized yet.</h2>
          <p className="mt-3 text-sm leading-6 text-muted">Run local people analysis after scanning. Lumoza creates cache-only crops and keeps originals untouched.</p>
          <LumozaButton type="button" variant="primary" className="mt-6" disabled={!project || peopleTask?.status === "running"} onClick={onStartPeopleAnalysis}>
            {peopleTask?.status === "running" ? "Finding people" : "Find people"}
          </LumozaButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 overflow-y-auto pr-1 lumoza-scrollbar md:grid-cols-2 3xl:grid-cols-3">
      {people?.map((person) => {
        const representative = person.faces.find((face) => face.isRepresentative) ?? person.faces[0];
        const src = faceSrc(person.representativeCropCachePath ?? representative?.cropCachePath);
        const mergeTarget = mergeTargets[person.id] ?? "";
        return (
          <article key={person.id} className="group overflow-hidden rounded-[28px] bg-white/[0.035] shadow-soft transition duration-300 hover:bg-white/[0.055] hover:shadow-glow">
            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-accent/18 via-purple/12 to-white/[0.04]">
              {src ? (
                <img src={src} alt={person.displayName ?? "Person"} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
              ) : (
                <div className="flex h-full items-center justify-center text-subtle"><UsersRound className="h-12 w-12" /></div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/90 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-[-0.03em] text-text">{person.displayName ?? "Unnamed person"}</p>
                  <p className="mt-1 text-xs text-muted">{person.faceCount} faces / {person.photoCount} memories</p>
                </div>
                <span className="rounded-full bg-ink/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">{person.priorityLabel}</span>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <input
                defaultValue={person.displayName ?? ""}
                placeholder="Name person"
                className="lumoza-focus w-full rounded-2xl border border-white/8 bg-ink/55 px-3 py-2 text-sm text-text outline-none placeholder:text-subtle"
                onBlur={(event) => onUpdatePerson?.(person.id, { displayName: event.currentTarget.value })}
              />
              <select
                value={person.priorityLabel}
                className="lumoza-focus w-full rounded-2xl border border-white/8 bg-ink/55 px-3 py-2 text-sm text-text outline-none"
                onChange={(event) => onUpdatePerson?.(person.id, { priorityLabel: event.currentTarget.value })}
              >
                {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <div className="grid grid-cols-4 gap-2">
                {person.faces.slice(0, 4).map((face) => {
                  const sampleSrc = faceSrc(face.cropCachePath);
                  return (
                    <button key={face.id} type="button" title="Split this face into a new person" className="aspect-square overflow-hidden rounded-2xl bg-white/[0.055]" onClick={() => onSplitPersonFace?.(face.id)}>
                      {sampleSrc ? <img src={sampleSrc} alt={face.filename ?? "Face"} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-subtle">split</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <select
                  value={mergeTarget}
                  className="lumoza-focus min-w-0 flex-1 rounded-2xl border border-white/8 bg-ink/55 px-3 py-2 text-xs text-text outline-none"
                  onChange={(event) => setMergeTargets((current) => ({ ...current, [person.id]: event.currentTarget.value }))}
                >
                  <option value="">Merge into...</option>
                  {people.filter((candidate) => candidate.id !== person.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.displayName ?? candidate.id}</option>)}
                </select>
                <LumozaButton type="button" variant="secondary" className="px-3 text-xs" disabled={!mergeTarget} onClick={() => onMergePeople?.(mergeTarget, person.id)}>Merge</LumozaButton>
              </div>
              <LumozaButton type="button" variant="ghost" className="w-full text-xs" onClick={() => onUpdatePerson?.(person.id, { isHidden: true })}>Hide from people</LumozaButton>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function StudioPage({ title, subtitle, mode, project, photos, peopleSummary, people = [], peopleTask, onStartPeopleAnalysis, onUpdatePerson, onMergePeople, onSplitPersonFace }: StudioPageProps) {
  const Icon = icons[mode] ?? Image;
  const isImport = mode === "import";
  const isExport = mode === "export";

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-0 min-w-0 flex-col gap-4">
        <div className="relative min-h-[220px] overflow-hidden rounded-[34px] bg-ink/36 p-7 shadow-panel">
          <div className="absolute inset-0 lumoza-photo-collage opacity-75" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/88 to-transparent" />
          <div className="relative flex h-full min-h-[180px] flex-col justify-end">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.08] text-accent shadow-glow"><Icon className="h-7 w-7" /></div>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.07em] text-text">{title}</h1>
            <p className="mt-3 max-w-xl text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 rounded-[30px] bg-ink/24 p-4 shadow-soft">
          {mode === "people" ? (
            <PeopleWorkspace project={project} people={people} peopleTask={peopleTask} onStartPeopleAnalysis={onStartPeopleAnalysis} onUpdatePerson={onUpdatePerson} onMergePeople={onMergePeople} onSplitPersonFace={onSplitPersonFace} />
          ) : isImport ? (
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
                  {['Photos', 'Video', 'Album'].map((item) => <div key={item} className="rounded-2xl bg-white/[0.05] px-4 py-4 text-sm text-muted">{item}</div>)}
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
            <p className="text-sm text-text">People intelligence</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleSummary?.faceAnalysisRunCount ?? 0}</p><p className="mt-1 text-xs text-subtle">Runs</p></div>
              <div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleTask?.detectedFaceCount ?? peopleSummary?.detectedFaceCount ?? 0}</p><p className="mt-1 text-xs text-subtle">Faces</p></div>
              <div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleTask?.clusteredPeopleCount ?? peopleSummary?.clusteredPeopleCount ?? 0}</p><p className="mt-1 text-xs text-subtle">People</p></div>
              <div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleTask?.status ?? "ready"}</p><p className="mt-1 text-xs text-subtle">Status</p></div>
            </div>
            {peopleTask ? <p className="mt-4 text-xs leading-5 text-muted">{peopleTask.message}</p> : <p className="mt-4 text-xs leading-5 text-muted">Local CPU people analysis creates derived crops in cache and lets you name, merge, split, hide, and prioritize people.</p>}
            <LumozaButton type="button" variant="primary" className="mt-5 w-full" disabled={!project || peopleTask?.status === "running"} onClick={onStartPeopleAnalysis}>{peopleTask?.status === "running" ? "Finding people" : "Run people analysis"}</LumozaButton>
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

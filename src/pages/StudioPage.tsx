import { convertFileSrc } from "@tauri-apps/api/core";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Download, Image, Map, Minus, Plus, ShieldCheck, SplitSquareHorizontal, Star, Upload, UsersRound, XCircle } from "lucide-react";
import type { ProjectPerson, ProjectPhoto, ProjectPeopleSummary, ProjectSelectionSummary, ProjectSummary } from "../types/project";
import { LumozaButton } from "../components/ui/LumozaButton";
import { StatusPill } from "../components/ui/StatusPill";
import type { PeopleAnalysisTask } from "../types/system";

interface StudioPageProps {
  title: string;
  subtitle: string;
  mode: "people" | "places" | "timeline" | "compare" | "import" | "export";
  project?: ProjectSummary;
  photos: ProjectPhoto[];
  finalSelectionPhotos?: ProjectPhoto[];
  selectionSummary?: ProjectSelectionSummary;
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

const priorityTone: Record<string, string> = {
  p1: "bg-purple/30 text-text",
  p2: "bg-warning/24 text-warning",
  p3: "bg-warning/20 text-warning",
  p4: "bg-accent/22 text-accent",
  p5: "bg-white/[0.08] text-muted",
  unassigned: "bg-white/[0.055] text-subtle",
};

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function faceSrc(path?: string) {
  if (!path) return undefined;
  return hasTauriRuntime() ? convertFileSrc(path) : undefined;
}

function MemoryStrip({ photos, count = 8 }: { photos: ProjectPhoto[]; count?: number }) {
  const visible = photos.slice(0, count);
  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: count }, (_, index) => visible[index]).map((photo, index) => (
        <div key={photo?.id ?? index} className="aspect-[4/3] overflow-hidden rounded-[18px] lumoza-memory-frame shadow-soft">
          <div className="relative flex h-full items-end p-3 text-xs text-muted">
            <span className="truncate">{photo?.filename ?? "Memory"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PersonAvatar({ person, large = false }: { person: ProjectPerson; large?: boolean }) {
  const representative = person.faces.find((face) => face.isRepresentative) ?? person.faces[0];
  const src = faceSrc(person.representativeCropCachePath ?? representative?.cropCachePath);
  return (
    <div className={`${large ? "h-24 w-24" : "h-20 w-20"} overflow-hidden rounded-full border border-warning/30 bg-gradient-to-br from-warning/20 via-purple/14 to-accent/16 shadow-soft`}>
      {src ? <img src={src} alt={person.displayName ?? "Person"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-muted"><UsersRound className="h-8 w-8" /></div>}
    </div>
  );
}

function PeopleWorkspace({ project, people, peopleTask, onStartPeopleAnalysis, onUpdatePerson, onMergePeople, onSplitPersonFace }: Pick<StudioPageProps, "project" | "people" | "peopleTask" | "onStartPeopleAnalysis" | "onUpdatePerson" | "onMergePeople" | "onSplitPersonFace">) {
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const visiblePeople = people ?? [];
  const hasPeople = visiblePeople.length > 0;

  if (!hasPeople) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-[26px] bg-white/[0.025] p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple/12 text-purple shadow-glow"><UsersRound className="h-8 w-8" /></div>
          <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em] text-text">No people organized yet.</h2>
          <p className="mt-3 text-sm leading-6 text-muted">Run local people analysis after scanning. Lumoza creates cache-only crops and keeps originals untouched.</p>
          <LumozaButton type="button" variant="primary" className="mt-6" disabled={!project || peopleTask?.status === "running"} onClick={onStartPeopleAnalysis}>{peopleTask?.status === "running" ? "Finding people" : "Find people"}</LumozaButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 text-center">
        <StatusPill tone="purple">07 People Intelligence</StatusPill>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-text">We found {visiblePeople.length} people</h2>
        <p className="mt-1 text-sm text-muted">Review clusters and set importance priority.</p>
      </div>
      <div className="lumoza-scrollbar grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
        {visiblePeople.map((person) => {
          const mergeTarget = mergeTargets[person.id] ?? "";
          return (
            <article key={person.id} className="group rounded-[28px] border border-white/8 bg-white/[0.035] p-4 text-center shadow-soft transition hover:border-purple/40 hover:bg-white/[0.055] hover:shadow-glow">
              <div className="flex justify-center"><PersonAvatar person={person} large /></div>
              <p className="mt-3 truncate text-sm font-semibold text-text">{person.displayName ?? "Unnamed person"}</p>
              <p className="mt-1 text-xs text-subtle">{person.faceCount} faces / {person.photoCount} memories</p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityTone[person.priorityLabel] ?? priorityTone.unassigned}`}>{person.priorityLabel.toUpperCase()}</span>
              <div className="mt-4 grid gap-2 text-left">
                <input defaultValue={person.displayName ?? ""} placeholder="Name person" className="lumoza-focus rounded-2xl border border-white/8 bg-ink/55 px-3 py-2 text-sm text-text outline-none placeholder:text-subtle" onBlur={(event) => onUpdatePerson?.(person.id, { displayName: event.currentTarget.value })} />
                <select value={person.priorityLabel} className="lumoza-focus rounded-2xl border border-white/8 bg-ink/55 px-3 py-2 text-sm text-text outline-none" onChange={(event) => onUpdatePerson?.(person.id, { priorityLabel: event.currentTarget.value })}>{priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <div className="grid grid-cols-4 gap-2">
                  {person.faces.slice(0, 4).map((face) => {
                    const sampleSrc = faceSrc(face.cropCachePath);
                    return <button key={face.id} type="button" title="Split this face into a new person" className="aspect-square overflow-hidden rounded-full bg-white/[0.055]" onClick={() => onSplitPersonFace?.(face.id)}>{sampleSrc ? <img src={sampleSrc} alt={face.filename ?? "Face"} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-subtle">split</span>}</button>;
                  })}
                </div>
                <div className="flex gap-2">
                  <select value={mergeTarget} className="lumoza-focus min-w-0 flex-1 rounded-2xl border border-white/8 bg-ink/55 px-3 py-2 text-xs text-text outline-none" onChange={(event) => setMergeTargets((current) => ({ ...current, [person.id]: event.currentTarget.value }))}><option value="">Merge into...</option>{visiblePeople.filter((candidate) => candidate.id !== person.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.displayName ?? candidate.id}</option>)}</select>
                  <LumozaButton type="button" variant="secondary" className="px-3 text-xs" disabled={!mergeTarget} onClick={() => onMergePeople?.(mergeTarget, person.id)}>Merge</LumozaButton>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function UnderstandingWorkspace({ photos }: { photos: ProjectPhoto[] }) {
  const moments = ["Timeline", "Moments", "Scenes", "Emotions", "Highlights"];
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="text-center">
        <StatusPill tone="purple">08 Memory Understanding</StatusPill>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-text">Understanding your memories</h2>
        <p className="mt-1 text-sm text-muted">We are analyzing moments, emotions, and story flow.</p>
      </div>
      <div className="rounded-[28px] border border-white/8 bg-white/[0.035] p-5 shadow-soft">
        <div className="grid grid-cols-5 gap-3 text-center text-xs text-muted">{moments.map((moment, index) => <div key={moment} className={index === 0 ? "text-purple" : ""}>{moment}</div>)}</div>
        <div className="relative mt-5 h-1 rounded-full bg-white/10"><div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-purple via-accent to-purple" />{moments.map((moment, index) => <div key={moment} className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-purple shadow-glow" style={{ left: `${index * 25}%` }} />)}</div>
        <div className="mt-4 grid grid-cols-5 gap-3 text-center text-[11px] text-subtle">{["Getting Ready", "Ceremony", "Reception", "Party", "Farewell"].map((label, index) => <div key={label}><p>May {12 + Math.floor(index / 2)}</p><p>{label}</p></div>)}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden"><MemoryStrip photos={photos} count={12} /></div>
    </div>
  );
}

function CompareWorkspace({ photos }: { photos: ProjectPhoto[] }) {
  const left = photos[0];
  const right = photos[1] ?? photos[0];
  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_1fr_260px]">
      {[left, right].map((photo, index) => <div key={`${photo?.id ?? index}-${index}`} className="flex min-h-0 flex-col overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.035] shadow-soft"><div className="relative flex-1 lumoza-photo-collage"><div className="absolute inset-0 bg-gradient-to-t from-ink/78 to-transparent" /><div className="absolute bottom-4 left-4"><p className="text-sm text-text">{photo?.filename ?? `Candidate ${index + 1}`}</p><p className="mt-1 text-xs text-muted">{photo?.fileSizeBytes ? `${(photo.fileSizeBytes / 1024 / 1024).toFixed(1)} MB` : "Preview"}</p></div></div><div className="flex items-center justify-between gap-3 p-3"><LumozaButton type="button" variant="secondary" className="px-4">Select</LumozaButton><span className="text-xs text-subtle">{index === 0 ? "Left" : "Right"}</span></div></div>)}
      <aside className="rounded-[26px] border border-white/8 bg-white/[0.035] p-4 shadow-soft">
        <p className="text-sm text-text">Photo details</p>
        <div className="mt-4 space-y-3 text-sm text-muted">
          <div className="rounded-2xl bg-white/[0.045] px-3 py-3">Sharpness comparison</div>
          <div className="rounded-2xl bg-white/[0.045] px-3 py-3">Expression comparison</div>
          <div className="rounded-2xl bg-white/[0.045] px-3 py-3">Duplicate similarity</div>
          <div className="rounded-2xl bg-white/[0.045] px-3 py-3">People coverage</div>
        </div>
      </aside>
    </div>
  );
}

function ExportWorkspace({ photos, selectionSummary }: { photos: ProjectPhoto[]; selectionSummary?: ProjectSelectionSummary }) {
  const exportedGb = 4.9;
  const totalGb = 6.8;
  const progress = 72;
  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
      <div className="flex items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.035] shadow-soft"><div className="relative flex h-48 w-48 items-center justify-center"><div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(var(--lz-purple) ${progress * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }} /><div className="absolute inset-8 rounded-full bg-panel" /><div className="relative text-center"><p className="text-5xl font-semibold text-text">{progress}%</p></div></div></div>
      <div className="rounded-[28px] border border-white/8 bg-white/[0.035] p-6 shadow-soft">
        <StatusPill tone="purple">12 Memory Export</StatusPill>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-text">Exporting your memories</h2>
        <p className="mt-2 text-sm text-muted">We are copying your final memory collection. Original photos remain untouched.</p>
        <div className="mt-6 space-y-4 text-sm text-muted">
          <div><div className="mb-2 flex justify-between"><span>Exported</span><span>{exportedGb} GB / {totalGb} GB</span></div><div className="h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-accent to-purple" style={{ width: `${progress}%` }} /></div></div>
          <div className="grid grid-cols-3 gap-3"><div className="rounded-2xl bg-white/[0.045] px-4 py-3"><p className="font-mono text-text">2 min</p><p className="text-xs text-subtle">Remaining</p></div><div className="rounded-2xl bg-white/[0.045] px-4 py-3"><p className="font-mono text-text">120 MB/s</p><p className="text-xs text-subtle">Speed</p></div><div className="rounded-2xl bg-white/[0.045] px-4 py-3"><p className="font-mono text-text">Safe</p><p className="text-xs text-subtle">Copy only</p></div></div>
        </div>
      </div>
      <aside className="rounded-[28px] border border-white/8 bg-white/[0.035] p-5 shadow-soft"><p className="text-sm text-text">Export summary</p><div className="mt-4 space-y-3 text-sm text-muted"><div className="flex justify-between"><span>Total photos</span><span className="text-text">{selectionSummary?.selectedCount ?? photos.length}</span></div><div className="flex justify-between"><span>Total size</span><span className="text-text">{totalGb} GB</span></div><div><p>Folder</p><p className="mt-1 truncate font-mono text-xs text-text">/Lumoza Export/{new Date().getFullYear()}</p></div><div><p>Export type</p><p className="mt-1 text-text">Copy only originals safe</p></div></div><p className="mt-6 text-xs text-subtle">Original photos remain untouched.</p></aside>
    </div>
  );
}

export function StudioPage({ title, subtitle, mode, project, photos, finalSelectionPhotos = [], selectionSummary, peopleSummary, people = [], peopleTask, onStartPeopleAnalysis, onUpdatePerson, onMergePeople, onSplitPersonFace }: StudioPageProps) {
  const Icon = icons[mode] ?? Image;
  const isImport = mode === "import";
  const isExport = mode === "export";
  const isTimeline = mode === "timeline" || mode === "places";
  const isCompare = mode === "compare";
  const exportPhotos = finalSelectionPhotos.length > 0 ? finalSelectionPhotos : photos.filter((photo) => photo.selectionLabel === "keep" || photo.albumCandidate).slice(0, 24);

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-h-0 min-w-0 flex-col gap-4">
        <div className="relative shrink-0 overflow-hidden rounded-[30px] bg-ink/36 p-5 shadow-panel">
          <div className="absolute inset-0 lumoza-photo-collage opacity-55" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/88 to-transparent" />
          <div className="relative flex items-end justify-between gap-4">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08] text-purple shadow-glow"><Icon className="h-6 w-6" /></div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.07em] text-text">{title}</h1>
              <p className="mt-2 max-w-xl text-sm text-muted">{subtitle}</p>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 rounded-[30px] bg-ink/24 p-4 shadow-soft">
          {mode === "people" ? <PeopleWorkspace project={project} people={people} peopleTask={peopleTask} onStartPeopleAnalysis={onStartPeopleAnalysis} onUpdatePerson={onUpdatePerson} onMergePeople={onMergePeople} onSplitPersonFace={onSplitPersonFace} /> : isImport ? <div className="flex h-full items-center justify-center rounded-[26px] border border-dashed border-purple/45 bg-purple/5"><div className="text-center"><Upload className="mx-auto h-12 w-12 text-purple" /><h2 className="mt-5 text-2xl font-semibold text-text">Drag memories here</h2><p className="mt-2 text-sm text-muted">JPG, PNG, HEIC, RAW later</p><LumozaButton className="mt-6" variant="primary">Browse folder</LumozaButton></div></div> : isExport ? <ExportWorkspace photos={exportPhotos} selectionSummary={selectionSummary} /> : isCompare ? <CompareWorkspace photos={photos} /> : isTimeline ? <UnderstandingWorkspace photos={photos} /> : <MemoryStrip photos={photos} />}
        </div>
      </section>
      <aside className="hidden min-h-0 space-y-4 overflow-y-auto pr-1 xl:block lumoza-scrollbar">
        <div className="rounded-[28px] bg-white/[0.035] p-5 shadow-soft"><p className="text-sm text-text">{project?.name ?? "No project open"}</p><p className="mt-2 text-sm text-subtle">{photos.length} memories</p></div>
        {mode === "people" ? <div className="rounded-[28px] bg-white/[0.03] p-5 shadow-soft"><p className="text-sm text-text">People intelligence</p><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleSummary?.faceAnalysisRunCount ?? 0}</p><p className="mt-1 text-xs text-subtle">Runs</p></div><div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleTask?.detectedFaceCount ?? peopleSummary?.detectedFaceCount ?? 0}</p><p className="mt-1 text-xs text-subtle">Faces</p></div><div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleTask?.clusteredPeopleCount ?? peopleSummary?.clusteredPeopleCount ?? 0}</p><p className="mt-1 text-xs text-subtle">People</p></div><div className="rounded-2xl bg-white/[0.045] px-3 py-3"><p className="font-mono text-text">{peopleTask?.status ?? "ready"}</p><p className="mt-1 text-xs text-subtle">Status</p></div></div>{peopleTask ? <p className="mt-4 text-xs leading-5 text-muted">{peopleTask.message}</p> : <p className="mt-4 text-xs leading-5 text-muted">Local CPU people analysis creates derived crops and priority labels.</p>}<LumozaButton type="button" variant="primary" className="mt-5 w-full" disabled={!project || peopleTask?.status === "running"} onClick={onStartPeopleAnalysis}>{peopleTask?.status === "running" ? "Finding people" : "Run people analysis"}</LumozaButton></div> : <div className="rounded-[28px] bg-white/[0.03] p-5 shadow-soft"><p className="text-sm text-text">Context</p><p className="mt-3 text-sm leading-6 text-muted">This stage is tuned for a focused workflow. Only the current task and related memory signals are shown.</p></div>}
      </aside>
    </div>
  );
}

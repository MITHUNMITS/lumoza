import { Cpu, Database, Info, Keyboard, Palette, RotateCcw, Settings, Sparkles, Zap } from "lucide-react";
import { LumozaButton } from "../components/ui/LumozaButton";
import { StatusPill } from "../components/ui/StatusPill";
import { useSettingsStore } from "../stores/settingsStore";

const tabs = [
  { label: "General", icon: Settings },
  { label: "Performance", icon: Zap },
  { label: "Themes", icon: Palette },
  { label: "Shortcuts", icon: Keyboard },
  { label: "About", icon: Info },
];

const accentColors = ["#8B5CF6", "#4D8DFF", "#22C55E", "#3CCF91", "#FFB84D", "#F97316", "#FF5C7A", "#64748B"];

function ToggleRow({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.045] px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm text-text">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-subtle">{detail}</span>
      </span>
      <input className="h-5 w-5 accent-purple" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function SettingsPage() {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const showActivityPanel = useSettingsStore((state) => state.showActivityPanel);
  const setReduceMotion = useSettingsStore((state) => state.setReduceMotion);
  const setShowActivityPanel = useSettingsStore((state) => state.setShowActivityPanel);

  return (
    <div className="flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[30px] border border-white/8 bg-ink/30 p-4 shadow-panel">
      <section className="relative grid h-full w-full max-w-6xl grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-[28px] border border-white/8 bg-panel/70 shadow-soft">
        <aside className="border-r border-white/8 bg-sidebar/40 p-4">
          <StatusPill tone="purple">Settings</StatusPill>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-text">Studio controls</h1>
          <nav className="mt-6 grid gap-2">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const active = index === 2;
              return (
                <button key={tab.label} type="button" className={`lumoza-focus flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${active ? "bg-purple/16 text-text shadow-glow" : "text-muted hover:bg-white/[0.055] hover:text-text"}`}>
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="lumoza-scrollbar min-h-0 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <StatusPill tone="accent">Themes</StatusPill>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.055em] text-text">Tune the studio atmosphere</h2>
              <p className="mt-2 text-sm text-muted">Keep the workspace quiet, focused, and comfortable for long creative sessions.</p>
            </div>

            <div className="mt-8 grid gap-4 rounded-[28px] border border-white/8 bg-white/[0.035] p-5 shadow-soft">
              <div>
                <p className="mb-3 text-sm text-text">Theme mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Dark', 'Darker', 'Midnight'].map((theme, index) => <button key={theme} type="button" className={`lumoza-focus rounded-2xl px-4 py-3 text-sm transition ${index === 0 ? "bg-purple/20 text-text shadow-glow" : "bg-white/[0.045] text-muted hover:text-text"}`}>{theme}</button>)}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-text">Accent color</p>
                <div className="flex flex-wrap gap-3">
                  {accentColors.map((color, index) => <button key={color} type="button" aria-label={`Accent ${index + 1}`} className={`h-7 w-7 rounded-full border transition hover:scale-110 ${index === 0 ? "border-white shadow-glow" : "border-white/15"}`} style={{ backgroundColor: color }} />)}
                </div>
              </div>

              <ToggleRow label="Reduce animation" detail="Minimize cinematic transitions and hover motion." checked={reduceMotion} onChange={setReduceMotion} />
              <ToggleRow label="Show activity by default" detail="Keep compact task activity visible in workspace inspectors." checked={showActivityPanel} onChange={setShowActivityPanel} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-soft">
                <div className="flex items-center gap-3 text-accent"><Cpu className="h-5 w-5" /><p className="text-sm text-text">AI packages</p></div>
                <p className="mt-3 text-sm leading-6 text-muted">Face Recognition, Scene Intelligence, Image Enhancement, and Memory Engine packs will be managed here in Phase 6.</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-soft">
                <div className="flex items-center gap-3 text-success"><Database className="h-5 w-5" /><p className="text-sm text-text">Cache management</p></div>
                <p className="mt-3 text-sm leading-6 text-muted">Project thumbnails, crops, logs, reports, and derived assets remain app-managed and original-safe.</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-soft">
                <div className="flex items-center gap-3 text-warning"><Zap className="h-5 w-5" /><p className="text-sm text-text">Performance mode</p></div>
                <p className="mt-3 text-sm leading-6 text-muted">CPU-first today, GPU-ready later. Heavy work remains backgrounded.</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-soft">
                <div className="flex items-center gap-3 text-purple"><Sparkles className="h-5 w-5" /><p className="text-sm text-text">Workspace defaults</p></div>
                <p className="mt-3 text-sm leading-6 text-muted">Default final count, review count, and guided workflow preferences will live here.</p>
              </div>
            </div>

            <LumozaButton type="button" variant="secondary" className="mt-6"><RotateCcw className="h-4 w-4" /> Reset to default</LumozaButton>
          </div>
        </div>
      </section>
    </div>
  );
}

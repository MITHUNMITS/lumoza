import { Cpu, Database, Info, Zap } from "lucide-react";
import { LumozaCard } from "../components/ui/LumozaCard";
import { StatusPill } from "../components/ui/StatusPill";
import { useSettingsStore } from "../stores/settingsStore";

function ToggleRow({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-5 rounded-[22px] border border-white/8 bg-ink/30 px-4 py-4">
      <span>
        <span className="block text-sm font-semibold text-text">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-muted">{detail}</span>
      </span>
      <input className="h-5 w-5 accent-accent" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function SettingsPage() {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const showActivityPanel = useSettingsStore((state) => state.showActivityPanel);
  const setReduceMotion = useSettingsStore((state) => state.setReduceMotion);
  const setShowActivityPanel = useSettingsStore((state) => state.setShowActivityPanel);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="lumoza-panel rounded-[34px] p-7">
        <StatusPill tone="accent">Preferences</StatusPill>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] text-text">Compact controls for a creative workstation.</h2>
        <p className="mt-4 text-sm leading-7 text-muted">Settings stay intentionally calm. Future AI model packs, cache control, and performance modes will appear here without turning the app into an admin console.</p>
      </section>

      <section className="grid gap-5">
        <LumozaCard eyebrow="General" title="Desktop behavior">
          <div className="grid gap-3">
            <ToggleRow label="Reduce animation" detail="Minimize cinematic transitions and motion effects across the desktop shell." checked={reduceMotion} onChange={setReduceMotion} />
            <ToggleRow label="Show activity by default" detail="Keep the operations activity panel visible when opening project workspaces." checked={showActivityPanel} onChange={setShowActivityPanel} />
          </div>
        </LumozaCard>

        <div className="grid gap-4 md:grid-cols-2">
          <LumozaCard className="p-5" padded={false}>
            <div className="flex items-center gap-3 text-accent"><Zap className="h-5 w-5" /><p className="text-xs font-semibold uppercase tracking-[0.22em]">Performance</p></div>
            <p className="mt-4 text-sm leading-7 text-muted">Scan modes, worker budgets, cache limits, and GPU readiness will be configured here later.</p>
          </LumozaCard>
          <LumozaCard className="p-5" padded={false}>
            <div className="flex items-center gap-3 text-purple"><Cpu className="h-5 w-5" /><p className="text-xs font-semibold uppercase tracking-[0.22em]">AI models</p></div>
            <p className="mt-4 text-sm leading-7 text-muted">Core Runtime, Vision, Face AI, Deep AI, RAW, and Pro Export packs will use this compact surface.</p>
          </LumozaCard>
          <LumozaCard className="p-5" padded={false}>
            <div className="flex items-center gap-3 text-success"><Database className="h-5 w-5" /><p className="text-xs font-semibold uppercase tracking-[0.22em]">Cache</p></div>
            <p className="mt-4 text-sm leading-7 text-muted">Project metadata, thumbnails, crops, logs, and derived assets stay inside app-managed storage.</p>
          </LumozaCard>
          <LumozaCard className="p-5" padded={false}>
            <div className="flex items-center gap-3 text-warning"><Info className="h-5 w-5" /><p className="text-xs font-semibold uppercase tracking-[0.22em]">About</p></div>
            <p className="mt-4 text-sm leading-7 text-muted">Lumoza Studio is offline-first premium creative software for memory curation.</p>
          </LumozaCard>
        </div>
      </section>
    </div>
  );
}

import { useSettingsStore } from "../stores/settingsStore";

export function SettingsPage() {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const showActivityPanel = useSettingsStore((state) => state.showActivityPanel);
  const setReduceMotion = useSettingsStore((state) => state.setReduceMotion);
  const setShowActivityPanel = useSettingsStore((state) => state.setShowActivityPanel);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-[24px] border border-white/8 bg-card/70 p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-muted">Motion</p>
        <label className="mt-4 flex items-center justify-between gap-4 text-sm text-text">
          Reduce animation in the desktop shell
          <input type="checkbox" checked={reduceMotion} onChange={(event) => setReduceMotion(event.target.checked)} />
        </label>
      </div>
      <div className="rounded-[24px] border border-white/8 bg-card/70 p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-muted">Workspace</p>
        <label className="mt-4 flex items-center justify-between gap-4 text-sm text-text">
          Show activity panel by default
          <input type="checkbox" checked={showActivityPanel} onChange={(event) => setShowActivityPanel(event.target.checked)} />
        </label>
      </div>
    </div>
  );
}

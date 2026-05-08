export function PhotoGridPlaceholder() {
  return (
    <div className="rounded-[24px] border border-white/8 bg-card/70 p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Photos</p>
          <h3 className="mt-2 text-xl font-semibold text-text">Virtualized grid placeholder</h3>
        </div>
        <span className="rounded-full bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted">Phase 1 scaffold</span>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="aspect-[4/5] rounded-[20px] border border-white/8 bg-gradient-to-b from-white/10 to-transparent p-4">
            <div className="flex h-full items-end rounded-[14px] border border-dashed border-white/8 p-3 text-xs text-subtle">
              Thumbnail tile {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

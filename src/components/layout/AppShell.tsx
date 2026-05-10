import type { ComponentType, PropsWithChildren, ReactNode } from "react";

export interface WorkflowStepItem<T extends string = string> {
  id: T;
  label: string;
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface AppShellProps<T extends string = string> extends PropsWithChildren {
  topbar: ReactNode;
  activeStage: T;
  workflowSteps: WorkflowStepItem<T>[];
  onStageChange: (stage: T) => void;
}

export function AppShell<T extends string = string>({ topbar, activeStage, workflowSteps, onStageChange, children }: AppShellProps<T>) {
  const activeIndex = Math.max(0, workflowSteps.findIndex((step) => step.id === activeStage));

  return (
    <div className="lumoza-surface lumoza-vignette lumoza-noise h-screen overflow-hidden text-text">
      <div className="relative z-10 flex h-screen flex-col gap-3 p-3 lg:gap-4 lg:p-4 3xl:mx-auto 3xl:max-w-[1900px]">
        <main className="grid min-h-0 flex-1 grid-cols-[54px_minmax(0,1fr)] overflow-hidden rounded-[30px] border border-white/8 bg-panel/54 shadow-panel backdrop-blur-2xl">
          <aside className="flex min-h-0 flex-col items-center gap-2 border-r border-white/8 bg-sidebar/46 px-2 py-3">
            <div className="mb-2 h-8 w-8 rounded-xl lumoza-orb-logo" />
            <nav className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto lumoza-scrollbar">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStage === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    title={step.label}
                    disabled={step.disabled}
                    onClick={() => onStageChange(step.id)}
                    className={`lumoza-focus relative flex h-10 w-10 items-center justify-center rounded-[14px] transition duration-200 ease-lz ${isActive ? "bg-purple/20 text-text shadow-glow" : "text-subtle hover:bg-white/[0.055] hover:text-text"} ${step.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <Icon className="h-4 w-4" />
                    {isActive ? <span className="absolute -right-2 h-5 w-0.5 rounded-full bg-purple" /> : null}
                    <span className="absolute -left-1 top-1 rounded-full bg-ink/80 px-1 font-mono text-[9px] text-subtle">{String(index + 1).padStart(2, "0")}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div data-tauri-drag-region className="shrink-0 border-b border-white/8 px-4 py-3 lg:px-5">
              {topbar}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-4">
              {children}
            </div>
          </section>
        </main>

        <footer className="hidden shrink-0 rounded-[18px] border border-white/8 bg-sidebar/48 px-4 py-2 shadow-soft backdrop-blur-2xl md:block">
          <div className="grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${workflowSteps.length}, minmax(0, 1fr))` }}>
            {workflowSteps.map((step, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;
              return (
                <button key={step.id} type="button" disabled={step.disabled} onClick={() => onStageChange(step.id)} className="lumoza-focus group min-w-0 text-center">
                  <div className={`mx-auto h-1 rounded-full transition ${isActive ? "bg-purple shadow-glow" : isPast ? "bg-accent/70" : "bg-white/10 group-hover:bg-white/18"}`} />
                  <div className="mt-1.5 flex items-center justify-center gap-1.5 truncate text-[11px] text-subtle">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] ${isActive ? "bg-purple text-white" : isPast ? "bg-accent/18 text-accent" : "bg-white/[0.055]"}`}>{index + 1}</span>
                    <span className={isActive ? "text-text" : ""}>{step.shortLabel ?? step.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </footer>
      </div>
    </div>
  );
}

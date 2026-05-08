import type { SetupStep } from "../../types/app";

interface StartupSplashProps {
  steps: SetupStep[];
  error?: string;
}

export function StartupSplash({ steps, error }: StartupSplashProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink bg-halo px-6 py-10 text-text">
      <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-panel/95 p-8 shadow-soft backdrop-blur">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.38em] text-accent/80">Lumoza Studio</p>
            <h1 className="mt-3 text-4xl font-semibold">Preparing the local curation engine</h1>
          </div>
          <div className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">Phase 1</div>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="rounded-2xl border border-white/6 bg-card/80 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">{step.label}</p>
                  <p className="mt-1 text-base text-text">{step.detail}</p>
                </div>
                <span className="rounded-full bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted">{step.status}</span>
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger">{error}</p> : null}
      </div>
    </div>
  );
}

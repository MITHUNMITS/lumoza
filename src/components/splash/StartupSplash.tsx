import { motion } from "framer-motion";
import { Brain, Cpu, Database, Folder, ShieldCheck, X } from "lucide-react";
import type { SetupStep } from "../../types/app";

interface StartupSplashProps {
  steps: SetupStep[];
  error?: string;
}

const setupIcons = [Database, ShieldCheck, Database, Folder, Brain, Cpu];

function stepProgress(steps: SetupStep[]) {
  if (steps.length === 0) return 12;
  const completed = steps.filter((step) => step.status === "done").length;
  const running = steps.some((step) => step.status === "running") ? 0.55 : 0;
  return Math.min(100, Math.round(((completed + running) / steps.length) * 100));
}

function MemoryTile({ className = "", rotate = "" }: { className?: string; rotate?: string }) {
  return <div className={`absolute rounded-[18px] border border-white/8 lumoza-photo-collage opacity-70 shadow-panel ${rotate} ${className}`} />;
}

export function StartupSplash({ steps, error }: StartupSplashProps) {
  const progress = stepProgress(steps);
  const activeStep = steps.find((step) => step.status === "running") ?? steps[steps.length - 1];
  const displaySteps = [
    { label: "App Core", status: "Ready" },
    { label: "Security", status: "Ready" },
    { label: "Database", status: "Ready" },
    { label: "Project System", status: "Ready" },
    { label: "AI Engine", status: error ? "Blocked" : "Preparing" },
    { label: "System Check", status: progress >= 95 ? "Ready" : "Pending" },
  ];

  return (
    <div className="lumoza-surface flex h-screen items-center justify-center overflow-hidden p-6 text-text">
      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55 }}
        className="relative h-full max-h-[920px] w-full max-w-[1440px] overflow-hidden rounded-[34px] border border-white/14 bg-ink/88 shadow-panel"
      >
        <MemoryTile className="left-8 top-10 h-56 w-96" rotate="-rotate-3" />
        <MemoryTile className="left-14 top-[300px] h-52 w-80" rotate="rotate-2" />
        <MemoryTile className="bottom-16 left-24 h-48 w-80" rotate="-rotate-6" />
        <MemoryTile className="right-16 top-16 h-56 w-96" rotate="rotate-3" />
        <MemoryTile className="right-24 top-[330px] h-48 w-80" rotate="-rotate-2" />
        <MemoryTile className="bottom-16 right-16 h-52 w-96" rotate="rotate-5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,17,21,0.32),rgba(15,17,21,0.94)_62%)]" />
        <div className="absolute right-8 top-8 flex gap-7 text-white/70">
          <span className="text-3xl leading-none">-</span>
          <X className="h-7 w-7" />
        </div>

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-10 text-center">
          <div className="relative mb-7 h-36 w-36 rounded-full lumoza-orb-logo" />
          <h1 className="text-6xl font-light tracking-[0.34em] text-text md:text-7xl">LUMOZA</h1>
          <div className="mt-3 flex items-center gap-6 text-2xl font-semibold tracking-[0.46em] text-accent">
            <span className="h-px w-20 bg-accent/70" />
            STUDIO
            <span className="h-px w-20 bg-accent/70" />
          </div>
          <p className="mt-7 text-2xl text-muted">Curate memories intelligently.</p>

          <div className="mt-14 w-full max-w-2xl">
            <p className="text-2xl text-text">{error ? "Needs attention" : activeStep?.detail ?? "Initializing Lumoza Studio..."}</p>
            <div className="mt-6 flex items-center gap-5">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-purple shadow-glow" style={{ width: `${error ? 100 : progress}%` }} />
              </div>
              <span className="w-16 text-left font-mono text-2xl text-text">{error ? "!" : `${progress}%`}</span>
            </div>
            <p className="mt-4 text-lg text-accent">{error ?? activeStep?.label ?? "Preparing workspace"}</p>
          </div>

          <div className="mt-16 flex items-start justify-center gap-5">
            {displaySteps.map((step, index) => {
              const Icon = setupIcons[index] ?? Database;
              const isActive = step.status === "Preparing" || step.status === "Blocked";
              return (
                <div key={step.label} className="flex w-28 flex-col items-center gap-3">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full border ${isActive ? "border-accent/70 bg-accent/14 shadow-glow" : "border-white/12 bg-white/[0.055]"}`}>
                    <Icon className={`h-7 w-7 ${isActive ? "text-accent" : "text-muted"}`} />
                  </div>
                  <p className="text-sm text-text">{step.label}</p>
                  <p className={`text-sm ${step.status === "Ready" ? "text-success" : isActive ? "text-accent" : "text-subtle"}`}>{step.status}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-7 left-10 text-sm text-subtle">© 2026 Lumoza Studio</div>
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-sm text-subtle">100% Local Processing • Your Photos, Your Privacy</div>
        <div className="absolute bottom-7 right-10 text-sm text-subtle">Version 1.0.0</div>
      </motion.section>
    </div>
  );
}

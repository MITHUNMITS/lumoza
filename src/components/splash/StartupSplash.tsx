import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import type { SetupStep } from "../../types/app";
import { ProgressBlock } from "../ui/ProgressBlock";
import { StatusPill } from "../ui/StatusPill";

interface StartupSplashProps {
  steps: SetupStep[];
  error?: string;
}

function stepProgress(steps: SetupStep[]) {
  if (steps.length === 0) {
    return 12;
  }
  const completed = steps.filter((step) => step.status === "done").length;
  const running = steps.some((step) => step.status === "running") ? 0.45 : 0;
  return Math.min(100, Math.round(((completed + running) / steps.length) * 100));
}

function LumozaMark() {
  return (
    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
      <div className="absolute inset-0 rounded-[32px] bg-accent/20 blur-2xl" />
      <div className="absolute inset-2 rounded-[28px] bg-purple/20 blur-xl" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/14 bg-white/[0.06] shadow-glow backdrop-blur-xl">
        <div className="h-10 w-10 rounded-full border border-accent/60 bg-gradient-to-br from-accent/80 via-purple/70 to-white/20 p-1">
          <div className="h-full w-full rounded-full border border-white/30 bg-ink/70" />
        </div>
      </div>
    </div>
  );
}

export function StartupSplash({ steps, error }: StartupSplashProps) {
  const progress = stepProgress(steps);
  const activeStep = steps.find((step) => step.status === "running") ?? steps[steps.length - 1];

  return (
    <div className="lumoza-surface lumoza-vignette lumoza-noise flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-text">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative z-10 w-full max-w-3xl"
      >
        <div className="lumoza-panel relative overflow-hidden rounded-[40px] p-8 text-center md:p-10">
          <div className="absolute left-1/2 top-0 h-56 w-96 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-52 w-72 rounded-full bg-purple/12 blur-3xl" />
          <div className="relative">
            <LumozaMark />
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.42em] text-accent/90">Lumoza Studio</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-text md:text-5xl">Preparing memories</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">
              Building a quiet local workspace for your photos.
            </p>

            <div className="mx-auto mt-8 max-w-xl rounded-[26px] border border-white/8 bg-ink/35 p-5 text-left">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-text">{activeStep?.label ?? "Workspace"}</p>
                  <p className="mt-1 text-sm text-muted">{activeStep?.detail ?? "Preparing workspace..."}</p>
                </div>
                <StatusPill tone={error ? "danger" : "accent"}>{error ? "Blocked" : "Local"}</StatusPill>
              </div>
              <ProgressBlock label="Preparing workspace" value={error ? 100 : progress} detail="Quietly organizing the local studio." />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {steps.slice(0, 3).map((step) => (
                <div key={step.id} className="rounded-[20px] border border-white/8 bg-white/[0.035] px-4 py-3 text-left">
                  <p className="truncate text-xs uppercase tracking-[0.2em] text-subtle">{step.status}</p>
                  <p className="mt-1 truncate text-sm text-muted">{step.label}</p>
                </div>
              ))}
            </div>

            {error ? <p className="mt-6 rounded-[22px] border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

            <div className="mt-8 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.22em] text-subtle">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>100% Local Processing • Your Photos, Your Privacy</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

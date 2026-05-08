import { useState, type FormEvent } from "react";
import type { CreateProjectInput } from "../types/project";

interface CreateProjectProps {
  onCreate: (input: CreateProjectInput) => Promise<void>;
}

export function CreateProject({ onCreate }: CreateProjectProps) {
  const [name, setName] = useState("");
  const [rootFolder, setRootFolder] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !rootFolder.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({ name: name.trim(), rootFolder: rootFolder.trim() });
      setName("");
      setRootFolder("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[24px] border border-white/8 bg-card/70 p-5">
      <p className="text-sm uppercase tracking-[0.22em] text-muted">Create Project</p>
      <h3 className="mt-2 text-xl font-semibold text-text">Start a local curation workspace</h3>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm text-muted">
          Project name
          <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-text outline-none placeholder:text-subtle" placeholder="Dubai Wedding Highlights" />
        </label>
        <label className="grid gap-2 text-sm text-muted">
          Root folder
          <input value={rootFolder} onChange={(event) => setRootFolder(event.target.value)} className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-text outline-none placeholder:text-subtle" placeholder="/Volumes/Photos/Client-A" />
        </label>
      </div>
      <button type="submit" disabled={isSubmitting} className="mt-5 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {isSubmitting ? "Preparing project..." : "Create project"}
      </button>
    </form>
  );
}

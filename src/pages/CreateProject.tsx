import { useState, type FormEvent } from "react";
import { FolderPlus } from "lucide-react";
import { LumozaButton } from "../components/ui/LumozaButton";
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
    <form onSubmit={handleSubmit} className="lumoza-card rounded-[26px] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
          <FolderPlus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-subtle">New project</p>
          <h3 className="mt-1 text-base font-semibold text-text">Local workspace</h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
          Project name
          <input value={name} onChange={(event) => setName(event.target.value)} className="lumoza-focus rounded-2xl border border-white/10 bg-ink/65 px-4 py-3 text-sm normal-case tracking-normal text-text outline-none placeholder:text-subtle" placeholder="Dubai Wedding Highlights" />
        </label>
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
          Root folder
          <input value={rootFolder} onChange={(event) => setRootFolder(event.target.value)} className="lumoza-focus rounded-2xl border border-white/10 bg-ink/65 px-4 py-3 text-sm normal-case tracking-normal text-text outline-none placeholder:text-subtle" placeholder="/Volumes/Photos/Client-A" />
        </label>
      </div>
      <LumozaButton type="submit" disabled={isSubmitting} variant="primary" className="mt-4 w-full">
        {isSubmitting ? "Preparing project..." : "Create project"}
      </LumozaButton>
    </form>
  );
}

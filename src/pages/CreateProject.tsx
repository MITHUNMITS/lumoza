import { useState, type FormEvent } from "react";
import { FolderPlus } from "lucide-react";
import { LumozaButton } from "../components/ui/LumozaButton";
import { LumozaDialog } from "../components/ui/LumozaDialog";
import type { CreateProjectInput } from "../types/project";

interface CreateProjectProps {
  onCreate: (input: CreateProjectInput) => Promise<void>;
}

export function CreateProject({ onCreate }: CreateProjectProps) {
  const [name, setName] = useState("");
  const [rootFolder, setRootFolder] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !rootFolder.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate({ name: name.trim(), rootFolder: rootFolder.trim() });
      setName("");
      setRootFolder("");
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  const form = (
    <form id="create-project-form" onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
        Project name
        <input value={name} onChange={(event) => setName(event.target.value)} className="lumoza-focus rounded-2xl border border-white/10 bg-ink/65 px-4 py-3 text-sm normal-case tracking-normal text-text outline-none placeholder:text-subtle" placeholder="Dubai Wedding" />
      </label>
      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
        Memory folder
        <input value={rootFolder} onChange={(event) => setRootFolder(event.target.value)} className="lumoza-focus rounded-2xl border border-white/10 bg-ink/65 px-4 py-3 text-sm normal-case tracking-normal text-text outline-none placeholder:text-subtle" placeholder="/Volumes/Photos/Wedding" />
      </label>
    </form>
  );

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="lumoza-focus w-full overflow-hidden rounded-[28px] bg-white/[0.04] p-4 text-left shadow-soft transition hover:bg-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple/14 text-purple"><FolderPlus className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-text">New project</p>
            <p className="mt-1 text-xs text-subtle">Import memories</p>
          </div>
        </div>
      </button>
      <LumozaDialog
        open={isOpen}
        title="New memory project"
        subtitle="Choose a local folder. Originals stay untouched."
        onClose={() => setIsOpen(false)}
        action={<LumozaButton form="create-project-form" type="submit" disabled={isSubmitting} variant="primary">{isSubmitting ? "Preparing..." : "Create"}</LumozaButton>}
      >
        {form}
      </LumozaDialog>
    </>
  );
}

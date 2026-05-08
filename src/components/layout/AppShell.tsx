import type { PropsWithChildren, ReactNode } from "react";

interface AppShellProps extends PropsWithChildren {
  sidebar: ReactNode;
  topbar: ReactNode;
}

export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-ink bg-halo text-text">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-6 py-6">
        <aside className="w-[290px] shrink-0 rounded-[28px] border border-white/8 bg-sidebar/95 p-5 shadow-soft">{sidebar}</aside>
        <main className="flex-1 rounded-[32px] border border-white/8 bg-panel/95 p-6 shadow-soft">
          <div className="mb-6">{topbar}</div>
          {children}
        </main>
      </div>
    </div>
  );
}

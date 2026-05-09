import type { PropsWithChildren, ReactNode } from "react";

interface AppShellProps extends PropsWithChildren {
  sidebar: ReactNode;
  topbar: ReactNode;
}

export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  return (
    <div className="lumoza-surface lumoza-vignette lumoza-noise min-h-screen overflow-hidden text-text">
      <div className="relative z-10 flex min-h-screen gap-3 p-3 lg:gap-4 lg:p-4 3xl:mx-auto 3xl:max-w-[1900px]">
        <aside className="hidden w-[82px] shrink-0 overflow-hidden rounded-[28px] bg-sidebar/68 shadow-panel backdrop-blur-2xl md:block">
          {sidebar}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] bg-panel/58 shadow-panel backdrop-blur-2xl">
          <div data-tauri-drag-region className="shrink-0 px-5 py-3 lg:px-6">
            {topbar}
          </div>
          <div className="lumoza-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4 lg:px-6 lg:pb-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

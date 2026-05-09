import type { PropsWithChildren, ReactNode } from "react";

interface AppShellProps extends PropsWithChildren {
  sidebar: ReactNode;
  topbar: ReactNode;
}

export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  return (
    <div className="lumoza-surface lumoza-vignette lumoza-noise min-h-screen overflow-hidden text-text">
      <div className="relative z-10 flex min-h-screen gap-4 p-4 lg:gap-5 lg:p-5 3xl:mx-auto 3xl:max-w-[1880px]">
        <aside className="hidden w-[92px] shrink-0 overflow-hidden rounded-[30px] border border-white/8 bg-sidebar/90 shadow-panel backdrop-blur-2xl md:block xl:w-[286px]">
          {sidebar}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[34px] border border-white/8 bg-panel/82 shadow-panel backdrop-blur-2xl">
          <div data-tauri-drag-region className="shrink-0 border-b border-white/8 bg-white/[0.025] px-5 py-4 lg:px-6">
            {topbar}
          </div>
          <div className="lumoza-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

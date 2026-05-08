import { invokeOrMock } from "./tauriCommands";
import type { AppBootstrapResult } from "../types/app";
import type { SystemStatus } from "../types/system";

export async function bootstrapApplication(): Promise<AppBootstrapResult> {
  return invokeOrMock<AppBootstrapResult>("bootstrap_app", undefined, {
    steps: [
      { id: "dirs", label: "App directories", status: "done", detail: "App support folders are ready." },
      { id: "sqlite", label: "SQLite", status: "done", detail: "SQLite bootstrap contract prepared." },
      { id: "sidecar", label: "Python sidecar", status: "done", detail: "Placeholder healthcheck wiring prepared." },
      { id: "registry", label: "Project registry", status: "done", detail: "Project registry store contract prepared." },
    ],
    pythonReady: true,
    sqliteReady: true,
    registryReady: true,
  });
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return invokeOrMock<SystemStatus>("get_system_status", undefined, {
    pythonSidecar: "placeholder",
    sqlite: "ready",
    registry: "ready",
    activeTaskCount: 0,
  });
}

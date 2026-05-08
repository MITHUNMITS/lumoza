export type AppView = "dashboard" | "workspace" | "settings";

export type SetupStepStatus = "pending" | "running" | "done" | "error";

export interface SetupStep {
  id: string;
  label: string;
  status: SetupStepStatus;
  detail: string;
}

export interface AppBootstrapResult {
  steps: SetupStep[];
  pythonReady: boolean;
  sqliteReady: boolean;
  registryReady: boolean;
}

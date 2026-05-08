import { invoke } from "@tauri-apps/api/core";

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function invokeOrMock<T>(command: string, payload?: Record<string, unknown>, mockValue?: T): Promise<T> {
  if (hasTauriRuntime()) {
    return invoke<T>(command, payload);
  }

  if (mockValue !== undefined) {
    return Promise.resolve(mockValue);
  }

  throw new Error(`Tauri runtime unavailable for command: ${command}`);
}

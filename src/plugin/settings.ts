export type ExportTarget = "jsonl" | "backend-refresh";

export const DEFAULT_EXPORT_PATH_SUFFIX = "momentum/time-entries.jsonl";

export interface MomentumSettings {
  dueDateField: string;
  timezone: string;
  exportPath: string;
  exportTarget: ExportTarget;
  exportBackendUrl: string;
  autoInsertOnCreate: boolean;
  createDelayMs: number;
  dailyNoteFolder: string;
}

export const DEFAULT_SETTINGS: MomentumSettings = {
  dueDateField: "end",
  timezone: "Australia/Sydney",
  exportPath: DEFAULT_EXPORT_PATH_SUFFIX,
  exportTarget: "jsonl",
  exportBackendUrl: "http://localhost:8080",
  autoInsertOnCreate: true,
  createDelayMs: 900,
  dailyNoteFolder: ""
};

/**
 * Builds the default export path using the vault's configured Obsidian config directory.
 */
export function defaultExportPath(configDir: string): string {
  const base = configDir.replace(/\/+$/, "");
  return `${base}/${DEFAULT_EXPORT_PATH_SUFFIX}`;
}

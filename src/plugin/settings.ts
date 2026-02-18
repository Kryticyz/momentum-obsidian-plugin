export type ExportTarget = "jsonl" | "backend-refresh";

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
  exportPath: ".obsidian/momentum/time-entries.jsonl",
  exportTarget: "jsonl",
  exportBackendUrl: "http://localhost:8080",
  autoInsertOnCreate: true,
  createDelayMs: 900,
  dailyNoteFolder: ""
};

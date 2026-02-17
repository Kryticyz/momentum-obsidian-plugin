export interface MomentumSettings {
  dueDateField: string;
  timezone: string;
  exportPath: string;
  autoInsertOnCreate: boolean;
  createDelayMs: number;
  dailyNoteFolder: string;
}

export const DEFAULT_SETTINGS: MomentumSettings = {
  dueDateField: "end",
  timezone: "Australia/Sydney",
  exportPath: ".obsidian/momentum/time-entries.jsonl",
  autoInsertOnCreate: true,
  createDelayMs: 900,
  dailyNoteFolder: ""
};

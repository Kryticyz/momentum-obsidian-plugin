export interface ProjectInsightsSettings {
  dueDateField: string;
  timezone: string;
  exportPath: string;
  autoInsertOnCreate: boolean;
  createDelayMs: number;
  dailyNoteFolder: string;
}

export const DEFAULT_SETTINGS: ProjectInsightsSettings = {
  dueDateField: "end",
  timezone: "Australia/Sydney",
  exportPath: ".obsidian/project-insights/time-entries.jsonl",
  autoInsertOnCreate: true,
  createDelayMs: 900,
  dailyNoteFolder: ""
};

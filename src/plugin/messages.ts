export const messages = {
  optionalDataviewMissing: "Project Insights: Dataview not detected. Core functionality still works.",
  optionalTasksMissing: "Project Insights: Tasks plugin not detected. Core functionality still works.",
  snapshotRegenerated: (noteLabel: "daily" | "weekly", count: number) =>
    `Project Insights: regenerated ${noteLabel} snapshot (${count} active projects).`,
  timerStartInProgress: "Project Insights: start timer is already in progress.",
  timerStopInProgress: "Project Insights: stop timer is already in progress.",
  timerStartFailed: (detail: string) => `Project Insights: failed to start timer (${detail}).`,
  timerStopFailed: (detail: string) => `Project Insights: failed to stop timer (${detail}).`,
  timerPanelOpenFailed: "Project Insights: unable to open timer side panel.",
  timerScanParseFailures: (count: number) =>
    `Project Insights: skipped ${count} file(s) due to frontmatter parse issues.`,
  timerScanSummary: (summary: string) => `Project Insights: timer scan -> ${summary}. Check console for details.`,
  timerStateIdle: "Project Insights: timer state -> idle.",
  timerStateRunning: (summary: string) => `Project Insights: timer state -> ${summary}.`,
  timerAlreadyRunning: (projectName: string) =>
    `Project Insights: timer already running for ${projectName}.`,
  timerNoProjects: "Project Insights: no eligible timer projects found.",
  timerProjectsLoadFailed: (detail: string) =>
    `Project Insights: could not load active projects (${detail}).`,
  timerPickerOpenFailed: (detail: string) =>
    `Project Insights: project picker could not open (${detail}).`,
  timerNoSelection: "Project Insights: no project was selected.",
  timerProjectNameNotFound: "Project Insights: project name not found.",
  timerPersistFailed: (detail: string) => `Project Insights: could not persist timer state (${detail}).`,
  timerStarted: (projectName: string) => `Project Insights: timer started for ${projectName}.`,
  timerNoRunning: "Project Insights: no timer is currently running.",
  timerLogged: (minutes: number, projectName: string, dateIso: string) =>
    `Project Insights: logged ${minutes}m for ${projectName} in ${dateIso}.`,
  exportPathIsFolder: "Project Insights: export path points to a folder.",
  exportedEntries: (count: number, exportPath: string) =>
    `Project Insights: exported ${count} entries to ${exportPath}.`
};

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  return "unknown error";
}

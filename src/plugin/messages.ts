export const messages = {
  optionalDataviewMissing: "Momentum: Dataview not detected. Core functionality still works.",
  optionalTasksMissing: "Momentum: Tasks plugin not detected. Core functionality still works.",
  snapshotRegenerated: (noteLabel: "daily" | "weekly", count: number) =>
    `Momentum: regenerated ${noteLabel} snapshot (${count} active projects).`,
  timerStartInProgress: "Momentum: start timer is already in progress.",
  timerStopInProgress: "Momentum: stop timer is already in progress.",
  timerStartFailed: (detail: string) => `Momentum: failed to start timer (${detail}).`,
  timerStopFailed: (detail: string) => `Momentum: failed to stop timer (${detail}).`,
  timerPanelOpenFailed: "Momentum: unable to open timer side panel.",
  timerScanParseFailures: (count: number) =>
    `Momentum: skipped ${count} file(s) due to frontmatter parse issues.`,
  timerScanSummary: (summary: string) => `Momentum: timer scan -> ${summary}. Check console for details.`,
  timerStateIdle: "Momentum: timer state -> idle.",
  timerStateRunning: (summary: string) => `Momentum: timer state -> ${summary}.`,
  timerAlreadyRunning: (projectName: string) =>
    `Momentum: timer already running for ${projectName}.`,
  timerNoProjects: "Momentum: no eligible timer projects found.",
  timerProjectsLoadFailed: (detail: string) =>
    `Momentum: could not load active projects (${detail}).`,
  timerPickerOpenFailed: (detail: string) =>
    `Momentum: project picker could not open (${detail}).`,
  timerNoSelection: "Momentum: no project was selected.",
  timerProjectNameNotFound: "Momentum: project name not found.",
  timerPersistFailed: (detail: string) => `Momentum: could not persist timer state (${detail}).`,
  timerStarted: (projectName: string) => `Momentum: timer started for ${projectName}.`,
  timerNoRunning: "Momentum: no timer is currently running.",
  timerLogged: (minutes: number, projectName: string, dateIso: string) =>
    `Momentum: logged ${minutes}m for ${projectName} in ${dateIso}.`,
  exportPathIsFolder: "Momentum: export path points to a folder.",
  exportedEntries: (count: number, exportPath: string) =>
    `Momentum: exported ${count} entries to ${exportPath}.`
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

export const COMMAND_IDS = {
  regenerateSnapshot: "regenerate-note-snapshot",
  startTimer: "start-timer",
  startTimerInPast: "start-timer-in-past",
  adjustTimerStart: "adjust-timer-start",
  stopTimer: "stop-timer",
  openTimerPanel: "open-timer-panel",
  debugTimerProjects: "debug-timer-project-scan",
  debugTimerState: "debug-timer-state",
  exportTimeEntries: "export-time-entries"
} as const;

export interface CommandCatalogEntry {
  id: string;
  name: string;
}

export const COMMAND_CATALOG: CommandCatalogEntry[] = [
  { id: COMMAND_IDS.regenerateSnapshot, name: "Regenerate project snapshot in current note" },
  { id: COMMAND_IDS.startTimer, name: "Start project timer" },
  { id: COMMAND_IDS.startTimerInPast, name: "Start project timer in the past" },
  { id: COMMAND_IDS.adjustTimerStart, name: "Adjust active timer start time" },
  { id: COMMAND_IDS.stopTimer, name: "Stop project timer and log entry" },
  { id: COMMAND_IDS.openTimerPanel, name: "Open timer side panel" },
  { id: COMMAND_IDS.debugTimerProjects, name: "Debug timer project scan" },
  { id: COMMAND_IDS.debugTimerState, name: "Debug timer state" },
  { id: COMMAND_IDS.exportTimeEntries, name: "Export time entries to JSONL" }
];

const COMMAND_NAME_BY_ID = new Map(COMMAND_CATALOG.map((command) => [command.id, command.name]));

/**
 * Resolves a command id to its user-facing command palette name.
 */
export function commandName(id: string): string {
  const found = COMMAND_NAME_BY_ID.get(id);
  if (!found) {
    throw new Error(`Unknown command id: ${id}`);
  }

  return found;
}

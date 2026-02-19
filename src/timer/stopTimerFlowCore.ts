import { formatDateInTimezone, formatTimeInTimezone } from "../core/timezone";
import { messages } from "../plugin/messages";
import { TimerService } from "./timerService";

export interface StopTimerFlowCoreInput {
  timerService: TimerService;
  timezone: string;
  noteOverride?: string;
  appendLogEntry: (dateIso: string, entryLine: string) => Promise<void>;
  openTextPrompt: (
    title: string,
    placeholder: string,
    initialValue?: string
  ) => Promise<string | null>;
  notify: (message: string) => void;
}

/**
 * Stops the active timer, writes a log line, and emits a completion notice.
 */
export async function runStopTimerFlowCore(input: StopTimerFlowCoreInput): Promise<boolean> {
  const stopDetails = input.timerService.getStopDetails();
  if (!stopDetails) {
    input.notify(messages.timerNoRunning);
    return false;
  }

  const entryNote = await resolveEntryNote(input.noteOverride, input.openTextPrompt);
  if (entryNote === null) {
    return false;
  }

  const startClock = formatTimeInTimezone(stopDetails.startedAt, input.timezone);
  const endClock = formatTimeInTimezone(stopDetails.stoppedAt, input.timezone);
  const dateIso = formatDateInTimezone(stopDetails.stoppedAt, input.timezone);
  const note = entryNote.trim().replace(/"/g, "'");

  const entryLine =
    `- ${startClock}-${endClock} ` +
    `[[${stopDetails.activeTimer.projectName}]] ` +
    `(${stopDetails.durationMinutes}m) "${note}"`;

  await input.appendLogEntry(dateIso, entryLine);
  await input.timerService.clear();

  input.notify(
    messages.timerLogged(stopDetails.durationMinutes, stopDetails.activeTimer.projectName, dateIso)
  );

  return true;
}

/**
 * Resolves the final work note from override input or interactive prompt.
 */
async function resolveEntryNote(
  noteOverride: string | undefined,
  openTextPrompt: (
    title: string,
    placeholder: string,
    initialValue?: string
  ) => Promise<string | null>
): Promise<string | null> {
  if (typeof noteOverride === "string") {
    return noteOverride;
  }

  return openTextPrompt(
    "What did you work on?",
    "Short activity note",
    ""
  );
}

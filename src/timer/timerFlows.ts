import { App, Notice } from "obsidian";
import { ProjectRecord } from "../core/projects";
import { messages, toErrorMessage } from "../plugin/messages";
import { openConfirmModal, openPickerModal, openTextPromptModal } from "../ui/modals";
import { PickerItem } from "../ui/pickerTypes";
import {
  formatBackdatedStartConfirmation,
  parseBackdatedStartInput
} from "./backdatedStartParser";
import { runStartTimerFlowCore } from "./startTimerFlowCore";
import { runStopTimerFlowCore } from "./stopTimerFlowCore";
import { TimerService } from "./timerService";

type PickerOpener = <T>(
  app: App,
  title: string,
  items: PickerItem<T>[]
) => Promise<T | null>;

type TextPromptOpener = (
  app: App,
  title: string,
  placeholder: string,
  initialValue?: string
) => Promise<string | null>;

type ConfirmOpener = (
  app: App,
  title: string,
  message: string,
  confirmText?: string,
  cancelText?: string
) => Promise<boolean>;

interface FlowUiDeps {
  notify?: (message: string) => void;
  openPickerModal?: PickerOpener;
  openTextPromptModal?: TextPromptOpener;
  openConfirmModal?: ConfirmOpener;
}

interface StartTimerFlowInput {
  app: App;
  timerService: TimerService;
  getActiveProjects: () => Promise<ProjectRecord[]>;
  ui?: FlowUiDeps;
}

interface StopTimerFlowInput {
  app: App;
  timerService: TimerService;
  timezone: string;
  noteOverride?: string;
  appendLogEntry: (dateIso: string, entryLine: string) => Promise<void>;
  ui?: FlowUiDeps;
}

interface AdjustTimerStartFlowInput {
  app: App;
  timerService: TimerService;
  ui?: FlowUiDeps;
}

/**
 * Runs the standard interactive start-timer flow.
 */
export async function runStartTimerFlow(input: StartTimerFlowInput): Promise<boolean> {
  const openPicker = input.ui?.openPickerModal ?? openPickerModal;
  const openPrompt = input.ui?.openTextPromptModal ?? openTextPromptModal;

  return runStartTimerFlowCore({
    timerService: input.timerService,
    getActiveProjects: input.getActiveProjects,
    openPicker: (title, items) => openPicker(input.app, title, items),
    openTextPrompt: (title, placeholder, initialValue = "") =>
      openPrompt(input.app, title, placeholder, initialValue),
    notify: (message) => notify(input.ui, message)
  });
}

/**
 * Runs the start flow with an additional backdated-start prompt and confirmation.
 */
export async function runStartTimerInPastFlow(input: StartTimerFlowInput): Promise<boolean> {
  const openPicker = input.ui?.openPickerModal ?? openPickerModal;
  const openPrompt = input.ui?.openTextPromptModal ?? openTextPromptModal;
  const openConfirm = input.ui?.openConfirmModal ?? openConfirmModal;

  return runStartTimerFlowCore({
    timerService: input.timerService,
    getActiveProjects: input.getActiveProjects,
    openPicker: (title, items) => openPicker(input.app, title, items),
    openTextPrompt: (title, placeholder, initialValue = "") =>
      openPrompt(input.app, title, placeholder, initialValue),
    resolveStartedAtMs: async () => {
      const raw = await openPrompt(
        input.app,
        "When did you start working on this project?",
        "Minutes ago or local start time (45, 90m, 1h30m, 09:40, 9:40am)",
        "30"
      );

      if (raw === null) {
        notify(input.ui, messages.timerBackdatedStartCancelled);
        return null;
      }

      const now = input.timerService.getSnapshot().now;
      const startedAtMs = parseBackdatedStartInput(raw, now);
      if (startedAtMs === null) {
        notify(input.ui, messages.timerBackdatedStartInvalid);
        return null;
      }

      const summary = formatBackdatedStartConfirmation(startedAtMs, now);
      const confirmed = await openConfirm(
        input.app,
        "Confirm backdated timer start",
        summary,
        "Start Timer",
        "Cancel"
      );
      if (!confirmed) {
        notify(input.ui, messages.timerBackdatedStartCancelled);
        return null;
      }

      return startedAtMs;
    },
    notify: (message) => notify(input.ui, message)
  });
}

/**
 * Runs the interactive adjustment flow for the currently active timer start time.
 */
export async function runAdjustTimerStartFlow(input: AdjustTimerStartFlowInput): Promise<boolean> {
  const openPrompt = input.ui?.openTextPromptModal ?? openTextPromptModal;
  const openConfirm = input.ui?.openConfirmModal ?? openConfirmModal;

  const running = input.timerService.getActiveTimer();
  if (!running) {
    notify(input.ui, messages.timerNoRunning);
    return false;
  }

  const raw = await openPrompt(
    input.app,
    `Adjust timer start for ${running.projectName}`,
    "Minutes ago or local start time (45, 90m, 1h30m, 09:40, 9:40am)",
    ""
  );

  if (raw === null) {
    notify(input.ui, messages.timerBackdatedStartCancelled);
    return false;
  }

  const now = input.timerService.getSnapshot().now;
  const startedAtMs = parseBackdatedStartInput(raw, now);
  if (startedAtMs === null) {
    notify(input.ui, messages.timerBackdatedStartInvalid);
    return false;
  }

  const summary = formatBackdatedStartConfirmation(startedAtMs, now);
  const confirmed = await openConfirm(
    input.app,
    "Confirm timer start adjustment",
    summary,
    "Apply",
    "Cancel"
  );
  if (!confirmed) {
    notify(input.ui, messages.timerBackdatedStartCancelled);
    return false;
  }

  let adjusted = false;
  try {
    adjusted = await input.timerService.adjustStart(startedAtMs);
  } catch (error) {
    notify(input.ui, messages.timerAdjustFailed(toErrorMessage(error)));
    return false;
  }

  if (!adjusted) {
    notify(input.ui, messages.timerNoRunning);
    return false;
  }

  const activeTimer = input.timerService.getActiveTimer();
  if (!activeTimer) {
    notify(input.ui, messages.timerNoRunning);
    return false;
  }

  notify(input.ui, messages.timerAdjustedStart(activeTimer.projectName, summary));
  return true;
}

/**
 * Runs the stop flow and delegates note capture to modal prompts when needed.
 */
export async function runStopTimerFlow(input: StopTimerFlowInput): Promise<boolean> {
  const openPrompt = input.ui?.openTextPromptModal ?? openTextPromptModal;
  return runStopTimerFlowCore({
    timerService: input.timerService,
    timezone: input.timezone,
    noteOverride: input.noteOverride,
    appendLogEntry: input.appendLogEntry,
    openTextPrompt: (title, placeholder, initialValue = "") =>
      openPrompt(input.app, title, placeholder, initialValue),
    notify: (message) => notify(input.ui, message)
  });
}

/**
 * Emits UI notifications through injected handlers, falling back to Obsidian notices.
 */
function notify(ui: FlowUiDeps | undefined, message: string): void {
  if (ui?.notify) {
    ui.notify(message);
    return;
  }

  new Notice(message);
}
